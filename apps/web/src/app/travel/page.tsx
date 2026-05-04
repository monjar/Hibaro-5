'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { useCharacter } from '@/lib/use-character';
import { Panel } from '@/components/Panel';
import {
  IsoBuilding,
  IsoRoad,
  IsoStage,
  computeRoadMask,
  key,
} from '@/components/map/IsoMap';
import { formatUiError } from '@/lib/ui-presenters';
import type { MapTile, TravelQuote } from '@heliora/platform-sdk';

interface BuildingEntry {
  id: string;
  name: string;
  description?: string | null;
  functionality: string[] | string;
  status: string;
  gridX?: number | null;
  gridY?: number | null;
  gridWidth?: number;
  gridHeight?: number;
  gridZ?: number;
}

interface DistrictEntry {
  id: string;
  name: string;
  description?: string | null;
  dangerLevel: number;
  lawLevel: number;
  economyLevel: number;
  buildings: BuildingEntry[];
  mapWidth?: number;
  mapHeight?: number;
  mapTiles?: MapTile[];
}

interface PlanetEntry {
  id: string;
  name: string;
  description?: string | null;
  planetType: string;
  dangerLevel: number;
  lawLevel: number;
  economyLevel: number;
  districts: DistrictEntry[];
}

function asArray(fn: string[] | string | undefined): string[] {
  if (Array.isArray(fn)) return fn;
  return [];
}

const TS = 30;

export default function TravelPage() {
  const session = useAuthGuard();
  const { character, refresh } = useCharacter();
  const [planets, setPlanets] = useState<PlanetEntry[]>([]);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetEntry | null>(null);
  const [districtDetail, setDistrictDetail] = useState<DistrictEntry | null>(null);
  const [quote, setQuote] = useState<TravelQuote | null>(null);
  const [target, setTarget] = useState<{
    planetId?: string;
    districtId?: string;
    buildingId?: string;
  }>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [autoSeeded, setAutoSeeded] = useState(false);

  useEffect(() => {
    void (async () => {
      const list = (await api.getPlanets()) as unknown as PlanetEntry[];
      setPlanets(list);
    })();
  }, []);

  useEffect(() => {
    if (autoSeeded) return;
    if (!character?.currentPlanetId) return;
    if (planets.length === 0) return;
    const home = planets.find((p) => p.id === character.currentPlanetId);
    if (!home) return;
    setSelectedPlanet(home);
    if (character.currentDistrictId) {
      void loadDistrict(character.currentDistrictId);
    }
    setAutoSeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planets, character?.currentPlanetId, character?.currentDistrictId, autoSeeded]);

  useEffect(() => {
    if (!selectedPlanet) {
      setDistrictDetail(null);
      return;
    }
    void (async () => {
      const planet = (await api.getPlanet(selectedPlanet.id)) as unknown as PlanetEntry;
      setSelectedPlanet(planet);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanet?.id]);

  async function loadDistrict(districtId: string) {
    const d = (await api.getDistrict(districtId)) as unknown as DistrictEntry;
    setDistrictDetail(d);
  }

  async function fetchQuote(planetId: string, districtId: string, buildingId?: string) {
    if (!session.characterId) return;
    setTarget({ planetId, districtId, buildingId });
    try {
      const q = await api.travelQuote(session.characterId, { planetId, districtId, buildingId });
      setQuote(q);
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
    }
  }

  async function commitTravel() {
    if (!session.characterId || !target.planetId || !target.districtId) return;
    setBusy(true);
    setMessage('');
    try {
      await api.travel(session.characterId, target);
      setMessage(`✅ Travel complete`);
      await refresh();
      setQuote(null);
      setTarget({});
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setBusy(false);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  const currentPlanetId = character?.currentPlanetId;
  const currentDistrictId = character?.currentDistrictId;
  const currentBuildingId = character?.currentBuildingId;

  const placedBuildings = useMemo(
    () =>
      (districtDetail?.buildings ?? []).filter(
        (b) => typeof b.gridX === 'number' && typeof b.gridY === 'number',
      ),
    [districtDetail],
  );
  const roads = useMemo(() => {
    const r: Record<string, true> = {};
    for (const t of districtDetail?.mapTiles ?? []) {
      if (t.layer === 'ROAD') r[key(t.x, t.y)] = true;
    }
    return r;
  }, [districtDetail?.mapTiles]);
  const mapW = districtDetail?.mapWidth ?? 16;
  const mapH = districtDetail?.mapHeight ?? 12;
  const selectedBuilding = quote
    ? placedBuildings.find((b) => b.id === target.buildingId) ?? null
    : null;

  if (!session.ready || !session.token) return null;

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div style={{ marginBottom: 8 }}>
        <h1
          className="hib-display"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: 'var(--hib-text)',
            margin: 0,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 3,
              height: 18,
              background: 'var(--hib-cyan)',
              alignSelf: 'center',
            }}
          />
          TRAVEL TERMINAL
          <span
            style={{
              background: 'var(--hib-cyan)',
              color: 'var(--hib-bg-0)',
              padding: '2px 8px',
              fontFamily: 'var(--hib-mono)',
              fontSize: 10,
              letterSpacing: '0.2em',
              fontWeight: 700,
              clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
            }}
          >
            05.NAV
          </span>
        </h1>
        <p
          style={{
            fontSize: 11,
            color: 'var(--hib-text-dim)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            margin: '4px 0 0',
          }}
        >
          System map · district preview · commit jump
        </p>
      </div>

      {message && (
        <div
          className={`border rounded p-3 text-sm font-mono ${
            message.startsWith('✅')
              ? 'border-heliora-green/40 bg-heliora-green/10 text-heliora-green'
              : 'border-heliora-red/40 bg-heliora-red/10 text-heliora-red'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="flex flex-col gap-4 min-h-0">
          <Panel title="SECTOR MAP" accent="cyan">
            <SectorMap
              planets={planets}
              currentPlanetId={currentPlanetId}
              activePlanetId={selectedPlanet?.id}
              onSelect={(p) => {
                setSelectedPlanet(p);
                setDistrictDetail(null);
                setQuote(null);
                setTarget({});
                const homeDistrict =
                  p.id === currentPlanetId
                    ? p.districts?.find((d) => d.id === currentDistrictId)
                    : undefined;
                const defaultDistrict = homeDistrict ?? p.districts?.[0];
                if (defaultDistrict) void loadDistrict(defaultDistrict.id);
              }}
            />
          </Panel>

          <Panel
            title={`${districtDetail?.name ?? 'DISTRICT'} · NEON-GRID`}
            accent="cyan"
          >
            <div className="iso-stage" style={{ width: '100%', height: 480, border: 0 }}>
              <div className="iso-stage__bg" />
              <div className="iso-stage__horizon" />
              <div
                className="iso-cam"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {districtDetail ? (
                  <IsoStage width={mapW} height={mapH} ts={TS}>
                    {Object.keys(roads).map((k) => {
                      const [x, y] = k.split(',').map(Number);
                      const mask = computeRoadMask(roads, x, y);
                      return <IsoRoad key={`r-${k}`} x={x} y={y} ts={TS} mask={mask} />;
                    })}
                    {placedBuildings.map((b) => (
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
                        here={b.id === currentBuildingId}
                        selected={b.id === target.buildingId}
                        closed={b.status !== 'OPEN'}
                        onClick={() => {
                          if (!selectedPlanet || !districtDetail) return;
                          if (b.status !== 'OPEN') return;
                          void fetchQuote(selectedPlanet.id, districtDetail.id, b.id);
                        }}
                      />
                    ))}
                  </IsoStage>
                ) : (
                  <div
                    style={{
                      color: 'var(--hib-text-faint)',
                      fontSize: 11,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {`>`} Select a district from the right
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-4 min-h-0">
          <Panel title={`${selectedPlanet?.name ?? 'PLANET'} · DISTRICTS`} accent="cyan">
            {!selectedPlanet ? (
              <p
                className="text-heliora-text-dim text-xs uppercase tracking-widest text-center"
                style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Select a planet on the map
              </p>
            ) : (
              <div
                className="flex flex-col gap-1"
                style={{ maxHeight: 240, overflowY: 'auto' }}
              >
                {(selectedPlanet.districts ?? []).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`district-chip ${target.districtId === d.id ? 'is-active' : ''} ${
                      d.id === currentDistrictId ? 'is-here' : ''
                    }`}
                    onClick={() => {
                      void loadDistrict(d.id);
                      void fetchQuote(selectedPlanet.id, d.id);
                    }}
                  >
                    <div className="district-chip__name">{d.name}</div>
                    <div className="district-chip__stats">
                      <span>⚠{d.dangerLevel}</span>
                      <span>⚖{d.lawLevel}</span>
                      <span>💱{d.economyLevel}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="ROUTE QUOTE"
            accent={quote ? 'orange' : 'cyan'}
            className={quote ? '' : 'opacity-60'}
          >
            <div style={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}>
            {!quote ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: 'var(--hib-text-faint)',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                {`>`} CLICK A BUILDING
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--hib-text)',
                    letterSpacing: '0.04em',
                    marginBottom: 2,
                  }}
                >
                  {selectedBuilding?.name ??
                    `${quote.destination.districtName}, ${quote.destination.planetName}`}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.16em',
                    color: 'var(--hib-text-faint)',
                    marginBottom: 10,
                  }}
                >
                  {asArray(selectedBuilding?.functionality).join(' · ') ||
                    quote.destination.planetName}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  <div className="quote-cell">
                    <div className="quote-cell__label">COST</div>
                    <div
                      className={`quote-cell__val ${
                        quote.affordable ? 'quote-cell__val--good' : 'quote-cell__val--bad'
                      }`}
                    >
                      ${quote.travelCost}
                    </div>
                  </div>
                  <div className="quote-cell">
                    <div className="quote-cell__label">RISK</div>
                    <div className="quote-cell__val">{quote.travelRiskScore}/20</div>
                  </div>
                  <div className="quote-cell">
                    <div className="quote-cell__label">ENERGY</div>
                    <div className="quote-cell__val quote-cell__val--warn">
                      {quote.travelEnergyDelta}
                    </div>
                  </div>
                  <div className="quote-cell">
                    <div className="quote-cell__label">WANTED</div>
                    <div
                      className={`quote-cell__val ${
                        quote.wantedDelta > 0 ? 'quote-cell__val--bad' : ''
                      }`}
                    >
                      {quote.wantedDelta > 0 ? `+${quote.wantedDelta}` : '0'}
                    </div>
                  </div>
                </div>
                {quote.controllingFactionName && (
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      color: 'var(--hib-text-dim)',
                      marginBottom: 6,
                    }}
                  >
                    CONTROLLER:{' '}
                    <span style={{ color: 'var(--hib-text)' }}>{quote.controllingFactionName}</span>
                    <span style={{ marginLeft: 8 }}>
                      REP{' '}
                      {quote.reputationScore >= 0
                        ? `+${quote.reputationScore}`
                        : quote.reputationScore}
                    </span>
                  </div>
                )}
                {quote.travelSurcharge > 0 && (
                  <div
                    style={{
                      border: '1px dashed var(--hib-yellow-line)',
                      background: 'var(--hib-yellow-soft)',
                      color: 'var(--hib-yellow)',
                      padding: '6px 8px',
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      marginBottom: 8,
                    }}
                  >
                    ⚠ HOSTILE SURCHARGE +${quote.travelSurcharge}
                  </div>
                )}
                {quote.warnings.map((w) => (
                  <div
                    key={w}
                    style={{
                      border: '1px dashed var(--hib-red-line)',
                      background: 'var(--hib-red-soft)',
                      color: 'var(--hib-red)',
                      padding: '6px 8px',
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      marginBottom: 6,
                    }}
                  >
                    ⚠ {w}
                  </div>
                ))}
                <p
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: 'var(--hib-text-dim)',
                    margin: '6px 0 10px',
                  }}
                >
                  HAVE ${quote.currentCredits.toFixed(0)}
                  {!quote.affordable && (
                    <span style={{ marginLeft: 8, color: 'var(--hib-red)' }}>
                      {quote.blocked ? '· ACCESS DENIED' : '· INSUFFICIENT'}
                    </span>
                  )}
                </p>
                <button
                  className="hib-btn hib-btn--block hib-btn--primary"
                  onClick={() => void commitTravel()}
                  disabled={busy || !quote.affordable || quote.blocked}
                  style={{ width: '100%' }}
                >
                  {busy
                    ? '… TRAVELING'
                    : quote.blocked
                      ? '✕ ROUTE BLOCKED'
                      : !quote.affordable
                        ? '✕ INSUFFICIENT'
                        : '▶ CONFIRM TRAVEL'}
                </button>
              </>
            )}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}

function SectorMap({
  planets,
  currentPlanetId,
  activePlanetId,
  onSelect,
}: {
  planets: PlanetEntry[];
  currentPlanetId?: string | null;
  activePlanetId?: string | null;
  onSelect: (p: PlanetEntry) => void;
}) {
  const positions = useMemo(() => {
    if (planets.length === 0) return new Map<string, { x: number; y: number }>();
    const m = new Map<string, { x: number; y: number }>();
    const cx = 50;
    const cy = 50;
    if (planets.length === 1) {
      m.set(planets[0].id, { x: cx, y: cy });
      return m;
    }
    planets.forEach((p, i) => {
      if (i === 0) {
        m.set(p.id, { x: cx, y: cy });
        return;
      }
      const angle = ((i - 1) / Math.max(1, planets.length - 1)) * Math.PI * 2;
      const r = 32;
      m.set(p.id, { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r * 0.7 });
    });
    return m;
  }, [planets]);

  const active = activePlanetId ? positions.get(activePlanetId) : null;

  return (
    <div className="system-map" style={{ height: 200 }}>
      <div className="system-map__starfield" />
      <div className="system-map__grid" />
      <div
        className="system-orbit"
        style={{ left: '20%', top: '15%', width: '60%', height: '70%' }}
      />
      <div
        className="system-orbit"
        style={{ left: '32%', top: '28%', width: '36%', height: '44%' }}
      />
      {active && (
        <svg
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          width="100%"
          height="100%"
        >
          <line
            x1="50%"
            y1="50%"
            x2={`${active.x}%`}
            y2={`${active.y}%`}
            stroke="var(--hib-yellow)"
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.6"
          />
        </svg>
      )}
      {planets.map((p) => {
        const pos = positions.get(p.id);
        if (!pos) return null;
        const here = p.id === currentPlanetId;
        const isActive = p.id === activePlanetId;
        return (
          <button
            key={p.id}
            type="button"
            className={`planet-node ${isActive ? 'planet-node--active' : ''} ${here ? 'planet-node--here' : ''}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%,-50%)',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            onClick={() => onSelect(p)}
          >
            <span className="planet-node__glyph" />
            <span className="planet-node__label">
              {p.name}
              <br />
              <span
                style={{
                  fontSize: 8,
                  letterSpacing: '0.14em',
                  color: 'var(--hib-text-faint)',
                  textTransform: 'none',
                }}
              >
                ⚠{p.dangerLevel} ⚖{p.lawLevel} 💱{p.economyLevel}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
