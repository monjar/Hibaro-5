'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { useCharacter } from '@/lib/use-character';
import { Panel } from '@/components/Panel';
import type { TravelQuote } from '@heliora/platform-sdk';

interface BuildingEntry {
  id: string;
  name: string;
  description?: string | null;
  functionality: string[] | string;
  status: string;
}
interface DistrictEntry {
  id: string;
  name: string;
  description?: string | null;
  dangerLevel: number;
  lawLevel: number;
  economyLevel: number;
  buildings: BuildingEntry[];
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

  useEffect(() => {
    void (async () => {
      const list = (await api.getPlanets()) as unknown as PlanetEntry[];
      setPlanets(list);
    })();
  }, []);

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
      setMessage(`❌ ${(e as Error).message.replace(/^API error \d+: /, '')}`);
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
      setMessage(`❌ ${(e as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  if (!session.ready || !session.token) return null;

  const currentPlanetId = character?.currentPlanetId;
  const currentDistrictId = character?.currentDistrictId;
  const currentBuildingId = character?.currentBuildingId;

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-heliora-cyan font-mono text-2xl tracking-widest">TRAVEL TERMINAL</h1>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Planets" accent="cyan">
          <div className="space-y-2">
            {planets.map((p) => {
              const here = p.id === currentPlanetId;
              const active = p.id === selectedPlanet?.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlanet(p)}
                  className={`w-full text-left border rounded p-2 transition-colors ${
                    active
                      ? 'border-heliora-cyan/60 bg-heliora-cyan/10'
                      : 'border-heliora-border hover:border-heliora-cyan/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-heliora-text font-mono text-sm">
                      {p.name}
                      {here && (
                        <span className="ml-2 text-heliora-green text-[10px]">[YOU ARE HERE]</span>
                      )}
                    </span>
                    <span className="text-heliora-text-dim text-xs">{p.planetType}</span>
                  </div>
                  <div className="text-xs text-heliora-text-dim mt-1 flex gap-3">
                    <span>⚠{p.dangerLevel}</span>
                    <span>⚖{p.lawLevel}</span>
                    <span>💱{p.economyLevel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel
          title={selectedPlanet ? `${selectedPlanet.name} — Districts` : 'Districts'}
          accent="cyan"
        >
          {!selectedPlanet ? (
            <p className="text-heliora-text-dim text-sm">Select a planet on the left.</p>
          ) : (
            <div className="space-y-2">
              {selectedPlanet.description && (
                <p className="text-heliora-text-dim text-xs mb-3">{selectedPlanet.description}</p>
              )}
              {(selectedPlanet.districts ?? []).map((d) => {
                const here = d.id === currentDistrictId;
                const active = d.id === districtDetail?.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => {
                      void loadDistrict(d.id);
                      void fetchQuote(selectedPlanet.id, d.id);
                    }}
                    className={`w-full text-left border rounded p-2 transition-colors ${
                      active
                        ? 'border-heliora-cyan/60 bg-heliora-cyan/10'
                        : 'border-heliora-border hover:border-heliora-cyan/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-heliora-text font-mono text-sm">
                        {d.name}
                        {here && (
                          <span className="ml-2 text-heliora-green text-[10px]">[HERE]</span>
                        )}
                      </span>
                      <span className="text-heliora-text-dim text-xs">
                        ⚠{d.dangerLevel} ⚖{d.lawLevel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title={districtDetail ? `${districtDetail.name} — Buildings` : 'Buildings'}
          accent="cyan"
        >
          {!districtDetail ? (
            <p className="text-heliora-text-dim text-sm">Select a district to see buildings.</p>
          ) : (
            <div className="space-y-2">
              {districtDetail.description && (
                <p className="text-heliora-text-dim text-xs mb-3">{districtDetail.description}</p>
              )}
              {(districtDetail.buildings ?? []).map((b) => {
                const fn = asArray(b.functionality);
                const here = b.id === currentBuildingId;
                const closed = b.status !== 'OPEN';
                return (
                  <button
                    key={b.id}
                    onClick={() =>
                      void fetchQuote(selectedPlanet!.id, districtDetail.id, b.id)
                    }
                    disabled={closed}
                    className="w-full text-left border border-heliora-border rounded p-2 hover:border-heliora-cyan/30 disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-heliora-text font-mono text-sm">
                        {b.name}
                        {here && (
                          <span className="ml-2 text-heliora-green text-[10px]">[HERE]</span>
                        )}
                      </span>
                      <span className="text-heliora-text-dim text-xs">{b.status}</span>
                    </div>
                    {fn.length > 0 && (
                      <div className="text-[11px] text-heliora-text-dim mt-1">
                        {fn.join(' · ')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {quote && (
        <Panel title="Travel Quote" accent="orange" glow>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <Stat label="Destination" value={`${quote.destination.districtName}, ${quote.destination.planetName}`} />
            <Stat label="Cost" value={`$${quote.travelCost}`} good={quote.affordable} />
            <Stat label="Risk" value={`${quote.travelRiskScore}/20`} />
            <Stat label="Energy" value={`${quote.travelEnergyDelta}`} />
            <Stat
              label="Wanted"
              value={quote.wantedDelta > 0 ? `+${quote.wantedDelta}` : '0'}
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-heliora-text-dim">
              You have ${quote.currentCredits.toFixed(0)} credits.
              {!quote.affordable && (
                <span className="ml-2 text-heliora-red">Insufficient credits.</span>
              )}
            </p>
            <button
              onClick={() => void commitTravel()}
              disabled={busy || !quote.affordable}
              className="px-4 py-2 bg-heliora-orange/20 border border-heliora-orange/50 rounded text-heliora-orange text-sm font-mono font-bold hover:bg-heliora-orange/30 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {busy ? 'TRAVELING…' : 'CONFIRM TRAVEL'}
            </button>
          </div>
        </Panel>
      )}
    </main>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="border border-heliora-border rounded p-2 bg-heliora-dark">
      <div className="text-heliora-text-dim text-[10px] uppercase tracking-wider">{label}</div>
      <div
        className={`font-mono text-sm font-bold ${
          good === false ? 'text-heliora-red' : good ? 'text-heliora-green' : 'text-heliora-text'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
