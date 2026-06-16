'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  AdminBuilding,
  AdminBuildingInput,
  AdminDistrict,
  AdminDistrictMapInput,
  MapTile,
} from '@heliora/platform-sdk';
import { IsoBuilding, IsoCell, IsoRoad, IsoStage, computeRoadMask, key } from './IsoMap';

type Tool = 'SELECT' | 'ERASE' | 'ROAD';

interface MapEditorProps {
  district: AdminDistrict;
  buildings: AdminBuilding[];
  busy: boolean;
  flash: (m: string) => void;
  onSaveMap: (input: AdminDistrictMapInput) => Promise<void>;
  onMoveBuilding: (
    buildingId: string,
    gridX: number | null,
    gridY: number | null,
  ) => Promise<void>;
  onUpdateBuilding: (
    buildingId: string,
    patch: Partial<AdminBuildingInput>,
  ) => Promise<void>;
}

const TS = 36;

export function MapEditor({
  district,
  buildings,
  busy,
  flash,
  onSaveMap,
  onMoveBuilding,
  onUpdateBuilding,
}: MapEditorProps) {
  const [width, setWidth] = useState(district.mapWidth);
  const [height, setHeight] = useState(district.mapHeight);
  const [tiles, setTiles] = useState<MapTile[]>(district.mapTiles ?? []);
  const [tool, setTool] = useState<Tool>('SELECT');
  const [pickedUpBuildingId, setPickedUpBuildingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setWidth(district.mapWidth);
    setHeight(district.mapHeight);
    setTiles(district.mapTiles ?? []);
    setTool('SELECT');
    setPickedUpBuildingId(null);
    setSelectedId(null);
  }, [district.id, district.mapWidth, district.mapHeight, district.mapTiles]);

  useEffect(() => {
    const up = () => setIsPainting(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (pickedUpBuildingId) {
        setPickedUpBuildingId(null);
        return;
      }
      if (selectedId) setSelectedId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickedUpBuildingId, selectedId]);

  /** every cell in every building's footprint maps back to the owning building */
  const buildingByCell = useMemo(() => {
    const map = new Map<string, AdminBuilding>();
    for (const b of buildings) {
      if (b.gridX == null || b.gridY == null) continue;
      const w = Math.max(1, b.gridWidth ?? 1);
      const h = Math.max(1, b.gridHeight ?? 1);
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          map.set(key(b.gridX + dx, b.gridY + dy), b);
        }
      }
    }
    return map;
  }, [buildings]);

  function footprintFree(buildingId: string | null, x: number, y: number, w: number, h: number) {
    if (x < 0 || y < 0 || x + w > width || y + h > height) return false;
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const occ = buildingByCell.get(key(x + dx, y + dy));
        if (occ && occ.id !== buildingId) return false;
      }
    }
    return true;
  }

  const roads = useMemo(() => {
    const r: Record<string, true> = {};
    for (const t of tiles) if (t.layer === 'ROAD') r[key(t.x, t.y)] = true;
    return r;
  }, [tiles]);

  const unplaced = useMemo(
    () => buildings.filter((b) => b.gridX == null || b.gridY == null),
    [buildings],
  );

  const dirty =
    width !== district.mapWidth ||
    height !== district.mapHeight ||
    JSON.stringify(tiles) !== JSON.stringify(district.mapTiles ?? []);

  function paintRoadAt(x: number, y: number) {
    setTiles((prev) => {
      const without = prev.filter((t) => !(t.x === x && t.y === y && t.layer === 'ROAD'));
      const next: MapTile = { x, y, layer: 'ROAD', type: 'ROAD_STRAIGHT' };
      return [...without, next];
    });
  }

  function eraseRoadAt(x: number, y: number) {
    setTiles((prev) => prev.filter((t) => !(t.x === x && t.y === y && t.layer === 'ROAD')));
  }

  async function handleCellDown(x: number, y: number) {
    if (pickedUpBuildingId) {
      const target = buildings.find((b) => b.id === pickedUpBuildingId);
      const w = Math.max(1, target?.gridWidth ?? 1);
      const h = Math.max(1, target?.gridHeight ?? 1);
      if (!footprintFree(pickedUpBuildingId, x, y, w, h)) {
        flash(`- ${w}×${h} footprint at (${x},${y}) does not fit`);
        return;
      }
      try {
        await onMoveBuilding(pickedUpBuildingId, x, y);
        setPickedUpBuildingId(null);
      } catch (err) {
        flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
      }
      return;
    }
    if (tool === 'SELECT') {
      const occupant = buildingByCell.get(key(x, y));
      if (occupant) setSelectedId(occupant.id);
      else setSelectedId(null);
      return;
    }
    if (buildingByCell.has(key(x, y))) {
      flash(`- Cell (${x},${y}) is occupied`);
      return;
    }
    setIsPainting(true);
    if (tool === 'ROAD') paintRoadAt(x, y);
    else if (tool === 'ERASE') eraseRoadAt(x, y);
  }

  function handleCellEnter(x: number, y: number) {
    setHover({ x, y });
    if (!isPainting || pickedUpBuildingId || tool === 'SELECT') return;
    if (buildingByCell.has(key(x, y))) return;
    if (tool === 'ROAD') paintRoadAt(x, y);
    else if (tool === 'ERASE') eraseRoadAt(x, y);
  }

  async function handleSaveMap() {
    if (width < district.mapWidth || height < district.mapHeight) {
      const orphans = buildings.filter(
        (b) => b.gridX != null && b.gridY != null && (b.gridX >= width || b.gridY >= height),
      );
      if (orphans.length > 0) {
        flash(
          `- Cannot shrink: ${orphans.length} placed building(s) would fall outside. Move them first.`,
        );
        return;
      }
      const inBounds = tiles.filter((t) => t.x < width && t.y < height);
      if (inBounds.length !== tiles.length) {
        if (
          !confirm(`Shrinking will drop ${tiles.length - inBounds.length} tile(s). Continue?`)
        ) {
          return;
        }
        try {
          await onSaveMap({ width, height, tiles: inBounds });
        } catch (err) {
          flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
        }
        return;
      }
    }
    try {
      await onSaveMap({ width, height, tiles });
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    }
  }

  function revert() {
    setWidth(district.mapWidth);
    setHeight(district.mapHeight);
    setTiles(district.mapTiles ?? []);
  }

  const selectedBuilding = selectedId ? buildings.find((b) => b.id === selectedId) ?? null : null;

  const TOOLS: { id: Tool; label: string; glyph: string }[] = [
    { id: 'SELECT', label: 'SELECT', glyph: '↖' },
    { id: 'ERASE', label: 'ERASE', glyph: '✕' },
  ];
  const ROAD_TOOL: { id: Tool; label: string; glyph: string } = {
    id: 'ROAD',
    label: 'ROAD',
    glyph: '─',
  };

  return (
    <section
      style={{
        background: 'var(--hib-bg-0)',
        color: 'var(--hib-text)',
        fontFamily: 'var(--hib-mono)',
        border: '1px solid var(--hib-line)',
      }}
    >
      <div className="meta-strip" style={{ borderLeft: 0, borderRight: 0, borderTop: 0 }}>
        <div className="meta-cell">
          <span className="meta-cell__label">DISTRICT</span>
          <span className="meta-cell__val meta-cell__val--cyan">{district.name}</span>
        </div>
        <div className="meta-cell">
          <span className="meta-cell__label">PLANET</span>
          <span className="meta-cell__val">{district.planet?.name ?? '—'}</span>
        </div>
        <div className="meta-cell">
          <span className="meta-cell__label">DANGER</span>
          <span className="meta-cell__val meta-cell__val--red">⚠ {district.dangerLevel}/10</span>
        </div>
        <div className="meta-cell">
          <span className="meta-cell__label">LAW</span>
          <span className="meta-cell__val meta-cell__val--yellow">⚖ {district.lawLevel}/10</span>
        </div>
        <div className="meta-cell">
          <span className="meta-cell__label">CONTROLLER</span>
          <span className="meta-cell__val">{district.controllingFaction?.name ?? 'NONE'}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--hib-text-faint)' }}>
            SIZE
          </span>
          <input
            className="hib-input"
            type="number"
            min={1}
            max={64}
            value={width}
            onChange={(e) => setWidth(Math.max(1, Math.min(64, Number(e.target.value) || 1)))}
            style={{ width: 54 }}
          />
          <span style={{ color: 'var(--hib-text-faint)' }}>×</span>
          <input
            className="hib-input"
            type="number"
            min={1}
            max={64}
            value={height}
            onChange={(e) => setHeight(Math.max(1, Math.min(64, Number(e.target.value) || 1)))}
            style={{ width: 54 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="hib-btn hib-btn--small"
            onClick={revert}
            disabled={!dirty || busy}
          >
            ↺ REVERT
          </button>
          <button
            className="hib-btn hib-btn--small hib-btn--primary"
            onClick={() => void handleSaveMap()}
            disabled={!dirty || busy}
          >
            {busy ? '… SAVING' : '▶ SAVE'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '200px 1fr 240px',
          gap: 14,
          padding: 14,
          minHeight: 640,
        }}
      >
        {/* LEFT — palette */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          <div className="palette-group">
            <div className="palette-group__head">
              SELECT<span className="palette-group__count">{TOOLS.length}</span>
            </div>
            <div className="palette-group__body">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  className={`palette-tool ${tool === t.id ? 'is-active' : ''}`}
                  onClick={() => setTool(t.id)}
                  type="button"
                >
                  <span className="palette-tool__chip">{t.glyph}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="palette-group">
            <div className="palette-group__head">
              ROAD<span className="palette-group__count">1</span>
            </div>
            <div className="palette-group__body" style={{ gridTemplateColumns: '1fr' }}>
              <button
                className={`palette-tool ${tool === 'ROAD' ? 'is-active' : ''}`}
                onClick={() => setTool('ROAD')}
                type="button"
              >
                <span className="palette-tool__chip">{ROAD_TOOL.glyph}</span>
                <span>{ROAD_TOOL.label}</span>
              </button>
            </div>
          </div>
          <div
            style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              color: 'var(--hib-text-faint)',
              padding: '6px 2px',
              lineHeight: 1.6,
            }}
          >
            <div>HOLD + DRAG TO PAINT</div>
            <div>ROADS AUTO-CONNECT</div>
            <div>CLICK BLDG TO SELECT</div>
          </div>
        </aside>

        {/* CENTER — iso stage */}
        <section
          style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}
        >
          <div className="map-legend">
            <span className="map-legend__item">
              <span
                className="map-legend__swatch"
                style={{
                  background: 'transparent',
                  borderColor: 'var(--neon-cyan)',
                  boxShadow: '0 0 6px var(--neon-cyan)',
                }}
              />
              BUILDING
            </span>
            <span className="map-legend__item">
              <span
                className="map-legend__swatch"
                style={{
                  background: 'var(--neon-cyan)',
                  height: 3,
                  marginTop: 5,
                  boxShadow: '0 0 4px var(--neon-cyan)',
                }}
              />
              ROAD
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--hib-text-dim)' }}>
              HOVER{' '}
              {hover
                ? `[${String(hover.x).padStart(2, '0')},${String(hover.y).padStart(2, '0')}]`
                : '—'}{' '}
              · TOOL <span style={{ color: 'var(--hib-yellow)' }}>{tool}</span>
              {pickedUpBuildingId && (
                <span style={{ color: 'var(--hib-yellow)', marginLeft: 8 }}>· PLACING</span>
              )}
            </span>
          </div>
          <div
            onMouseLeave={() => {
              setIsPainting(false);
              setHover(null);
            }}
            style={{ flex: 1, display: 'flex', minHeight: 480 }}
          >
            <IsoStage width={width} height={height} ts={TS}>
              {Object.keys(roads).map((k) => {
                const [x, y] = k.split(',').map(Number);
                const mask = computeRoadMask(roads, x, y);
                return <IsoRoad key={`r-${k}`} x={x} y={y} ts={TS} mask={mask} />;
              })}
              {Array.from({ length: height }).map((_, y) =>
                Array.from({ length: width }).map((_, x) => {
                  const invalid = pickedUpBuildingId != null && buildingByCell.has(key(x, y));
                  const mode: 'placing' | 'erasing' = tool === 'ERASE' ? 'erasing' : 'placing';
                  return (
                    <IsoCell
                      key={`c-${x}-${y}`}
                      x={x}
                      y={y}
                      ts={TS}
                      mode={mode}
                      invalid={invalid}
                      onMouseDown={() => void handleCellDown(x, y)}
                      onMouseEnter={() => handleCellEnter(x, y)}
                    />
                  );
                }),
              )}
              {buildings
                .filter((b) => b.gridX != null && b.gridY != null)
                .map((b) => (
                  <IsoBuilding
                    key={b.id}
                    b={{
                      id: b.id,
                      name: b.name,
                      gridX: b.gridX as number,
                      gridY: b.gridY as number,
                      status: b.status,
                      height: b.gridZ ?? 1.4,
                      gridWidth: b.gridWidth ?? 1,
                      gridHeight: b.gridHeight ?? 1,
                    }}
                    ts={TS}
                    selected={selectedId === b.id || pickedUpBuildingId === b.id}
                    closed={b.status !== 'OPEN'}
                    onClick={() => {
                      if (pickedUpBuildingId) return;
                      if (tool === 'SELECT') setSelectedId(b.id);
                    }}
                  />
                ))}
            </IsoStage>
          </div>
        </section>

        {/* RIGHT — unplaced + properties + stats */}
        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          <div className="palette-group">
            <div className="palette-group__head">
              UNPLACED<span className="palette-group__count">{unplaced.length}</span>
            </div>
            <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unplaced.length === 0 && (
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    color: 'var(--hib-text-faint)',
                    padding: 8,
                    textAlign: 'center',
                  }}
                >
                  ALL PLACED
                </div>
              )}
              {unplaced.map((b) => (
                <div
                  key={b.id}
                  className={`tray-card ${pickedUpBuildingId === b.id ? 'is-picked' : ''}`}
                  onClick={() =>
                    setPickedUpBuildingId((prev) => (prev === b.id ? null : b.id))
                  }
                >
                  <div className="tray-card__name">{b.name}</div>
                  <div className="tray-card__sub">
                    {b.functionality.length > 0 ? b.functionality.join(' · ') : 'NO FN'}
                  </div>
                  {pickedUpBuildingId === b.id && (
                    <span className="tray-card__pickup-hint">◉ PLACING</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="palette-group">
            <div className="palette-group__head">PROPERTIES</div>
            <div style={{ padding: 10 }}>
              {selectedBuilding ? (
                <BuildingInspector
                  key={selectedBuilding.id}
                  building={selectedBuilding}
                  busy={busy}
                  isMoving={pickedUpBuildingId === selectedBuilding.id}
                  onMoveStart={() => {
                    setPickedUpBuildingId(selectedBuilding.id);
                    flash(`+ ${selectedBuilding.name} ready to move — click a destination cell`);
                  }}
                  onMoveCancel={() => setPickedUpBuildingId(null)}
                  onReturn={async () => {
                    try {
                      await onMoveBuilding(selectedBuilding.id, null, null);
                      flash(`+ Returned ${selectedBuilding.name} to tray`);
                      setSelectedId(null);
                    } catch (err) {
                      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
                    }
                  }}
                  onResize={async (patch) => {
                    try {
                      await onUpdateBuilding(selectedBuilding.id, patch);
                      flash(`+ Resized ${selectedBuilding.name}`);
                    } catch (err) {
                      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
                    }
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    color: 'var(--hib-text-faint)',
                    textAlign: 'center',
                  }}
                >
                  NO SELECTION
                </div>
              )}
            </div>
          </div>

          <div className="palette-group">
            <div className="palette-group__head">STATS</div>
            <div
              style={{
                padding: 10,
                fontSize: 10,
                lineHeight: 1.7,
                color: 'var(--hib-text-dim)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '2px 10px',
                }}
              >
                <span>TILES</span>
                <span style={{ color: 'var(--hib-text)', textAlign: 'right' }}>
                  {width * height}
                </span>
                <span>ROADS</span>
                <span style={{ color: 'var(--neon-cyan)', textAlign: 'right' }}>
                  {Object.keys(roads).length}
                </span>
                <span>BLDGS</span>
                <span style={{ color: 'var(--neon-magenta)', textAlign: 'right' }}>
                  {buildings.filter((b) => b.gridX != null).length}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function BuildingInspector({
  building,
  busy,
  isMoving,
  onMoveStart,
  onMoveCancel,
  onReturn,
  onResize,
}: {
  building: AdminBuilding;
  busy: boolean;
  isMoving: boolean;
  onMoveStart: () => void;
  onMoveCancel: () => void;
  onReturn: () => Promise<void>;
  onResize: (patch: Partial<AdminBuildingInput>) => Promise<void>;
}) {
  const [w, setW] = useState<number>(building.gridWidth ?? 1);
  const [h, setH] = useState<number>(building.gridHeight ?? 1);
  const [z, setZ] = useState<number>(building.gridZ ?? 1.4);

  useEffect(() => {
    setW(building.gridWidth ?? 1);
    setH(building.gridHeight ?? 1);
    setZ(building.gridZ ?? 1.4);
  }, [building.id, building.gridWidth, building.gridHeight, building.gridZ]);

  const dirty =
    w !== (building.gridWidth ?? 1) ||
    h !== (building.gridHeight ?? 1) ||
    z !== (building.gridZ ?? 1.4);

  return (
    <div style={{ fontSize: 11, lineHeight: 1.6 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--hib-cyan)',
          letterSpacing: '0.04em',
        }}
      >
        {building.name}
      </div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.16em',
          color: 'var(--hib-text-faint)',
          marginTop: 2,
        }}
      >
        {building.functionality.join(' · ') || 'NO FN'}
      </div>
      <div
        style={{
          marginTop: 10,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '4px 10px',
          fontSize: 10,
        }}
      >
        <span style={{ color: 'var(--hib-text-faint)' }}>POS</span>
        <span>
          [{building.gridX},{building.gridY}]
        </span>
        <span style={{ color: 'var(--hib-text-faint)' }}>STATUS</span>
        <span
          style={{ color: building.status === 'OPEN' ? 'var(--hib-green)' : 'var(--hib-red)' }}
        >
          {building.status}
        </span>
      </div>
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px dashed var(--hib-line)',
          fontSize: 9,
          letterSpacing: '0.18em',
          color: 'var(--hib-text-faint)',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        Size · X·Y·Z
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 6,
        }}
      >
        <SizeInput label="W" value={w} step={1} min={1} max={16} onChange={setW} />
        <SizeInput label="H" value={h} step={1} min={1} max={16} onChange={setH} />
        <SizeInput label="Z" value={z} step={0.1} min={0.1} max={6} onChange={setZ} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button
          type="button"
          className="hib-btn hib-btn--small"
          style={{ flex: 1 }}
          disabled={!dirty || busy}
          onClick={() =>
            void onResize({
              gridWidth: Math.max(1, Math.min(16, Math.round(w))),
              gridHeight: Math.max(1, Math.min(16, Math.round(h))),
              gridZ: Math.max(0.1, Math.min(6, Number(z))),
            })
          }
        >
          ▶ APPLY
        </button>
        <button
          type="button"
          className="hib-btn hib-btn--small"
          style={{ flex: 1 }}
          disabled={!dirty || busy}
          onClick={() => {
            setW(building.gridWidth ?? 1);
            setH(building.gridHeight ?? 1);
            setZ(building.gridZ ?? 1.4);
          }}
        >
          ↺ RESET
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {isMoving ? (
          <button
            type="button"
            className="hib-btn hib-btn--small"
            style={{ flex: 1 }}
            onClick={onMoveCancel}
          >
            ✕ CANCEL MOVE
          </button>
        ) : (
          <button
            type="button"
            className="hib-btn hib-btn--small hib-btn--primary"
            style={{ flex: 1 }}
            disabled={busy}
            onClick={onMoveStart}
          >
            ⤴ MOVE
          </button>
        )}
        <button
          type="button"
          className="hib-btn hib-btn--small"
          style={{ flex: 1 }}
          disabled={busy || isMoving}
          onClick={() => void onReturn()}
        >
          ↶ RETURN
        </button>
      </div>
    </div>
  );
}

function SizeInput({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: 8,
          letterSpacing: '0.18em',
          color: 'var(--hib-text-faint)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <input
        type="number"
        className="hib-input"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </label>
  );
}
