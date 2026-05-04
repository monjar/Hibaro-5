'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  AdminBuilding,
  AdminDistrict,
  AdminDistrictMapInput,
  MapTile,
  MapTileLayer,
  MapTileRotation,
  PropVariant,
  RoadVariant,
  TerrainVariant,
} from '@heliora/platform-sdk';

const TERRAIN_VARIANTS: TerrainVariant[] = ['GRASS', 'DIRT', 'WATER'];
const ROAD_VARIANTS: RoadVariant[] = ['ROAD_STRAIGHT', 'ROAD_CORNER', 'ROAD_T', 'ROAD_CROSS'];
const PROP_VARIANTS: PropVariant[] = ['TREE', 'LAMP', 'FENCE', 'FOUNTAIN'];
const ROTATIONS: MapTileRotation[] = [0, 90, 180, 270];

const TERRAIN_BG: Record<TerrainVariant, string> = {
  GRASS: 'bg-emerald-900/60',
  DIRT: 'bg-amber-900/60',
  WATER: 'bg-sky-900/60',
};

const ROAD_GLYPH: Record<RoadVariant, string> = {
  ROAD_STRAIGHT: '─',
  ROAD_CORNER: '└',
  ROAD_T: '┬',
  ROAD_CROSS: '┼',
};

const PROP_GLYPH: Record<PropVariant, string> = {
  TREE: '🌳',
  LAMP: '💡',
  FENCE: '🚧',
  FOUNTAIN: '⛲',
};

type Brush =
  | { kind: 'SELECT' }
  | { kind: 'ERASE' }
  | { kind: 'TERRAIN'; variant: TerrainVariant }
  | { kind: 'ROAD'; variant: RoadVariant; rotation: MapTileRotation }
  | { kind: 'PROP'; variant: PropVariant };

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
}

export function MapEditor({
  district,
  buildings,
  busy,
  flash,
  onSaveMap,
  onMoveBuilding,
}: MapEditorProps) {
  const [width, setWidth] = useState(district.mapWidth);
  const [height, setHeight] = useState(district.mapHeight);
  const [tiles, setTiles] = useState<MapTile[]>(district.mapTiles ?? []);
  const [brush, setBrush] = useState<Brush>({ kind: 'SELECT' });
  const [pickedUpBuildingId, setPickedUpBuildingId] = useState<string | null>(null);
  const [isPainting, setIsPainting] = useState(false);

  useEffect(() => {
    setWidth(district.mapWidth);
    setHeight(district.mapHeight);
    setTiles(district.mapTiles ?? []);
    setBrush({ kind: 'SELECT' });
    setPickedUpBuildingId(null);
  }, [district.id, district.mapWidth, district.mapHeight, district.mapTiles]);

  const buildingByCell = useMemo(() => {
    const map = new Map<string, AdminBuilding>();
    for (const b of buildings) {
      if (b.gridX != null && b.gridY != null) {
        map.set(`${b.gridX},${b.gridY}`, b);
      }
    }
    return map;
  }, [buildings]);

  const unplaced = useMemo(
    () => buildings.filter((b) => b.gridX == null || b.gridY == null),
    [buildings],
  );

  const dirty =
    width !== district.mapWidth ||
    height !== district.mapHeight ||
    JSON.stringify(tiles) !== JSON.stringify(district.mapTiles ?? []);

  function paintCell(x: number, y: number) {
    if (brush.kind === 'SELECT') return;
    if (brush.kind === 'ERASE') {
      setTiles((prev) => prev.filter((t) => !(t.x === x && t.y === y)));
      return;
    }
    const layer: MapTileLayer =
      brush.kind === 'TERRAIN' ? 'TERRAIN' : brush.kind === 'ROAD' ? 'ROAD' : 'PROP';
    const next: MapTile = {
      x,
      y,
      layer,
      type:
        brush.kind === 'TERRAIN'
          ? brush.variant
          : brush.kind === 'ROAD'
            ? brush.variant
            : brush.variant,
      ...(brush.kind === 'ROAD' ? { rotation: brush.rotation } : {}),
    };
    setTiles((prev) => {
      const without = prev.filter((t) => !(t.x === x && t.y === y && t.layer === layer));
      return [...without, next];
    });
  }

  async function handleCellClick(x: number, y: number) {
    const building = buildingByCell.get(`${x},${y}`);
    if (pickedUpBuildingId) {
      if (building && building.id !== pickedUpBuildingId) {
        flash(`- Cell (${x},${y}) is occupied by ${building.name}`);
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
    if (brush.kind === 'SELECT') {
      if (building) {
        try {
          await onMoveBuilding(building.id, null, null);
          flash(`+ Returned ${building.name} to tray`);
        } catch (err) {
          flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
        }
      }
      return;
    }
    if (building) {
      flash(`- Cell (${x},${y}) is occupied — paint another cell or use Erase`);
      return;
    }
    paintCell(x, y);
  }

  function handleCellEnter(x: number, y: number) {
    if (!isPainting) return;
    if (brush.kind === 'SELECT' || pickedUpBuildingId) return;
    if (buildingByCell.has(`${x},${y}`)) return;
    paintCell(x, y);
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
      const inBoundsTiles = tiles.filter((t) => t.x < width && t.y < height);
      if (inBoundsTiles.length !== tiles.length) {
        if (!confirm(`Shrinking will drop ${tiles.length - inBoundsTiles.length} tile(s). Continue?`)) {
          return;
        }
        try {
          await onSaveMap({ width, height, tiles: inBoundsTiles });
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

  return (
    <section className="rounded border border-heliora-border bg-heliora-panel p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-heliora-cyan">{district.name}</h2>
          <p className="text-xs text-heliora-text-dim">
            Paint terrain, roads, and props. Drop unplaced buildings onto open cells.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="text-heliora-text-dim">W</label>
          <input
            type="number"
            min={1}
            max={64}
            value={width}
            onChange={(e) => setWidth(Math.max(1, Math.min(64, Number(e.target.value) || 1)))}
            className="w-16 rounded border border-heliora-border bg-heliora-dark px-2 py-1 font-mono text-heliora-cyan"
          />
          <label className="text-heliora-text-dim">H</label>
          <input
            type="number"
            min={1}
            max={64}
            value={height}
            onChange={(e) => setHeight(Math.max(1, Math.min(64, Number(e.target.value) || 1)))}
            className="w-16 rounded border border-heliora-border bg-heliora-dark px-2 py-1 font-mono text-heliora-cyan"
          />
          <button
            onClick={revert}
            disabled={!dirty || busy}
            className="rounded border border-heliora-border px-3 py-1 text-heliora-text-dim hover:text-heliora-cyan disabled:opacity-30"
          >
            REVERT
          </button>
          <button
            onClick={() => void handleSaveMap()}
            disabled={!dirty || busy}
            className="rounded border border-heliora-green/60 bg-heliora-green/10 px-3 py-1 font-bold text-heliora-green hover:bg-heliora-green/20 disabled:opacity-30"
          >
            {busy ? 'SAVING...' : 'SAVE MAP'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-[180px_1fr_220px] gap-4">
        <Palette brush={brush} setBrush={setBrush} />
        <Grid
          width={width}
          height={height}
          tiles={tiles}
          buildingByCell={buildingByCell}
          pickedUpBuildingId={pickedUpBuildingId}
          isPainting={isPainting}
          setIsPainting={setIsPainting}
          onCellClick={handleCellClick}
          onCellEnter={handleCellEnter}
        />
        <UnplacedTray
          unplaced={unplaced}
          pickedUpBuildingId={pickedUpBuildingId}
          setPickedUpBuildingId={setPickedUpBuildingId}
        />
      </div>
    </section>
  );
}

function Palette({ brush, setBrush }: { brush: Brush; setBrush: (b: Brush) => void }) {
  const isActive = (predicate: (b: Brush) => boolean) => predicate(brush);
  const baseBtn =
    'rounded border px-2 py-1 text-[10px] font-mono uppercase border-heliora-border text-heliora-text-dim hover:text-heliora-cyan';
  const activeBtn = 'border-heliora-cyan bg-heliora-cyan/10 text-heliora-cyan';

  return (
    <aside className="space-y-3 text-xs">
      <div>
        <div className="mb-1 uppercase tracking-wider text-heliora-text-dim">Tools</div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setBrush({ kind: 'SELECT' })}
            className={`${baseBtn} ${isActive((b) => b.kind === 'SELECT') ? activeBtn : ''}`}
          >
            Select
          </button>
          <button
            onClick={() => setBrush({ kind: 'ERASE' })}
            className={`${baseBtn} ${isActive((b) => b.kind === 'ERASE') ? activeBtn : ''}`}
          >
            Erase
          </button>
        </div>
      </div>
      <div>
        <div className="mb-1 uppercase tracking-wider text-heliora-text-dim">Terrain</div>
        <div className="flex flex-wrap gap-1">
          {TERRAIN_VARIANTS.map((v) => (
            <button
              key={v}
              onClick={() => setBrush({ kind: 'TERRAIN', variant: v })}
              className={`${baseBtn} ${
                isActive((b) => b.kind === 'TERRAIN' && b.variant === v) ? activeBtn : ''
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 uppercase tracking-wider text-heliora-text-dim">Road</div>
        <div className="flex flex-wrap gap-1">
          {ROAD_VARIANTS.map((v) => (
            <button
              key={v}
              onClick={() =>
                setBrush({
                  kind: 'ROAD',
                  variant: v,
                  rotation: brush.kind === 'ROAD' ? brush.rotation : 0,
                })
              }
              className={`${baseBtn} ${
                isActive((b) => b.kind === 'ROAD' && b.variant === v) ? activeBtn : ''
              }`}
            >
              {v.replace('ROAD_', '')}
            </button>
          ))}
        </div>
        {brush.kind === 'ROAD' && (
          <div className="mt-1 flex gap-1">
            {ROTATIONS.map((r) => (
              <button
                key={r}
                onClick={() => setBrush({ ...brush, rotation: r })}
                className={`${baseBtn} ${brush.rotation === r ? activeBtn : ''}`}
              >
                {r}°
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="mb-1 uppercase tracking-wider text-heliora-text-dim">Prop</div>
        <div className="flex flex-wrap gap-1">
          {PROP_VARIANTS.map((v) => (
            <button
              key={v}
              onClick={() => setBrush({ kind: 'PROP', variant: v })}
              className={`${baseBtn} ${
                isActive((b) => b.kind === 'PROP' && b.variant === v) ? activeBtn : ''
              }`}
            >
              {PROP_GLYPH[v]} {v}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Grid({
  width,
  height,
  tiles,
  buildingByCell,
  pickedUpBuildingId,
  isPainting,
  setIsPainting,
  onCellClick,
  onCellEnter,
}: {
  width: number;
  height: number;
  tiles: MapTile[];
  buildingByCell: Map<string, AdminBuilding>;
  pickedUpBuildingId: string | null;
  isPainting: boolean;
  setIsPainting: (b: boolean) => void;
  onCellClick: (x: number, y: number) => void;
  onCellEnter: (x: number, y: number) => void;
}) {
  const tilesByCell = useMemo(() => {
    const map = new Map<string, MapTile[]>();
    for (const t of tiles) {
      const key = `${t.x},${t.y}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tiles]);

  const rows = [];
  for (let y = 0; y < height; y++) {
    const cells = [];
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      const cellTiles = tilesByCell.get(key) ?? [];
      const terrain = cellTiles.find((t) => t.layer === 'TERRAIN');
      const road = cellTiles.find((t) => t.layer === 'ROAD');
      const prop = cellTiles.find((t) => t.layer === 'PROP');
      const building = buildingByCell.get(key);
      const terrainBg = terrain
        ? TERRAIN_BG[terrain.type as TerrainVariant]
        : 'bg-heliora-dark';
      const roadGlyph = road ? ROAD_GLYPH[road.type as RoadVariant] : null;
      const propGlyph = prop ? PROP_GLYPH[prop.type as PropVariant] : null;
      cells.push(
        <div
          key={key}
          onMouseDown={() => {
            setIsPainting(true);
            void onCellClick(x, y);
          }}
          onMouseEnter={() => onCellEnter(x, y)}
          onMouseUp={() => setIsPainting(false)}
          className={`relative h-6 w-6 select-none border border-heliora-border/40 ${terrainBg} ${
            pickedUpBuildingId ? 'cursor-pointer hover:ring-1 hover:ring-heliora-cyan' : 'cursor-pointer'
          } ${building ? 'ring-1 ring-heliora-yellow' : ''}`}
          title={
            building
              ? `${building.name} (${x},${y})`
              : `(${x},${y})${terrain ? ` · ${terrain.type}` : ''}${road ? ` · ${road.type}` : ''}${prop ? ` · ${prop.type}` : ''}`
          }
          style={
            road && road.rotation
              ? { transform: undefined }
              : undefined
          }
        >
          {roadGlyph && (
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-heliora-text"
              style={{
                transform: road?.rotation ? `rotate(${road.rotation}deg)` : undefined,
              }}
            >
              {roadGlyph}
            </span>
          )}
          {propGlyph && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px]">
              {propGlyph}
            </span>
          )}
          {building && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-heliora-yellow/20 text-[8px] font-bold text-heliora-yellow">
              {building.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>,
      );
    }
    rows.push(
      <div key={y} className="flex">
        {cells}
      </div>,
    );
  }

  return (
    <div
      onMouseLeave={() => setIsPainting(false)}
      className="overflow-auto rounded border border-heliora-border bg-black/40 p-2"
    >
      <div className="inline-block">{rows}</div>
      {isPainting && <div className="mt-1 text-[10px] text-heliora-text-dim">Painting…</div>}
    </div>
  );
}

function UnplacedTray({
  unplaced,
  pickedUpBuildingId,
  setPickedUpBuildingId,
}: {
  unplaced: AdminBuilding[];
  pickedUpBuildingId: string | null;
  setPickedUpBuildingId: (id: string | null) => void;
}) {
  return (
    <aside className="rounded border border-heliora-border bg-black/30 p-2">
      <div className="mb-2 text-xs uppercase tracking-wider text-heliora-text-dim">
        Unplaced ({unplaced.length})
      </div>
      {unplaced.length === 0 ? (
        <p className="text-xs text-heliora-text-dim">All buildings placed.</p>
      ) : (
        <ul className="space-y-1">
          {unplaced.map((b) => (
            <li key={b.id}>
              <button
                onClick={() =>
                  setPickedUpBuildingId(pickedUpBuildingId === b.id ? null : b.id)
                }
                className={`w-full rounded border px-2 py-1 text-left text-xs font-mono ${
                  pickedUpBuildingId === b.id
                    ? 'border-heliora-cyan bg-heliora-cyan/10 text-heliora-cyan'
                    : 'border-heliora-border text-heliora-text hover:text-heliora-cyan'
                }`}
              >
                {b.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {pickedUpBuildingId && (
        <p className="mt-2 text-[10px] text-heliora-yellow">
          Click an open cell to drop. Click again here to cancel.
        </p>
      )}
    </aside>
  );
}
