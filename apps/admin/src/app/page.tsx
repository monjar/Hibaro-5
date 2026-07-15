'use client';

import { useEffect, useState } from 'react';
import {
  REALTIME_EVENT_CONTRACTS,
  type CorporationMarketState,
  type DistrictControlState,
  type NpcActivityEntry,
  type SimulationTickSummary,
  type TickReplayResult,
  type WorldState,
} from '@heliora/platform-sdk';
import { AdminShell } from '../components/AdminShell';
import { adminApi } from '../lib/api';

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—';
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function AdminPage() {
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [history, setHistory] = useState<SimulationTickSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [replaying, setReplaying] = useState<string | null>(null);
  const [replayResults, setReplayResults] = useState<Record<string, TickReplayResult>>({});

  async function replayTick(tickId: string) {
    setReplaying(tickId);
    try {
      const result = await adminApi.replaySimulationTick(tickId);
      setReplayResults((prev) => ({ ...prev, [tickId]: result }));
    } catch (error) {
      setReplayResults((prev) => ({
        ...prev,
        [tickId]: {
          found: true,
          replayable: false,
          tickId,
          reason: (error as Error).message,
        },
      }));
    } finally {
      setReplaying(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [nextWorldState, nextHistory] = await Promise.all([
          adminApi.getWorldState(),
          adminApi.getSimulationHistory(8),
        ]);
        if (!cancelled) {
          setWorldState(nextWorldState);
          setHistory(nextHistory);
        }
      } catch {
        if (!cancelled) {
          setWorldState(null);
          setHistory([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <AdminShell title="Hibaro-5 simulation overview" blurb="Loading world-state telemetry…">
        <div className="rounded border border-heliora-border bg-heliora-panel p-6 text-heliora-text-dim">
          Loading world-state telemetry…
        </div>
      </AdminShell>
    );
  }

  if (!worldState) {
    return (
      <AdminShell title="Hibaro-5 simulation overview" blurb="Simulation control plane status.">
        <div className="rounded border border-heliora-red/40 bg-heliora-panel p-6">
          <h1 className="text-2xl font-bold text-heliora-red">Heliora Admin unavailable</h1>
          <p className="mt-3 text-heliora-text-dim">
            Start the API at {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'} to inspect
            the world-state engine.
          </p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Hibaro-5 simulation overview"
      blurb="Inspect economy drift, corporation volatility, district control pressure, NPC actions, and the shared realtime contracts that future transports must honor."
    >
      <div className="flex flex-col gap-6">

        <section className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Planets" value={worldState.planets.length} />
          <SummaryCard label="Factions" value={worldState.factions.length} />
          <SummaryCard label="Corporations" value={worldState.corporations.length} />
          <SummaryCard label="NPC actions" value={worldState.recentNpcActivity.length} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
          <Panel title="Tick history">
            <div className="space-y-3">
              {history.map((tick) => (
                <div
                  key={tick.id ?? tick.processedAt}
                  className="rounded border border-heliora-border/80 bg-black/10 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-heliora-cyan">
                        {new Date(tick.processedAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-heliora-text-dim">
                        Opps {tick.totals.opportunitiesResolved} • Markets{' '}
                        {tick.totals.marketUpdates} • Corps {tick.totals.corporationUpdates} • NPCs{' '}
                        {tick.totals.npcActions}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-heliora-text-dim">
                      <span>{tick.stepSummaries.length} steps</span>
                      {tick.id && (
                        <button
                          onClick={() => void replayTick(tick.id as string)}
                          disabled={replaying !== null}
                          className="rounded border border-heliora-cyan/50 px-2 py-0.5 font-mono text-heliora-cyan hover:bg-heliora-cyan/10 disabled:opacity-40"
                          title="Recompute this tick's seeded stock pricing and verify it reproduces exactly"
                        >
                          {replaying === tick.id ? 'REPLAYING…' : 'REPLAY'}
                        </button>
                      )}
                    </div>
                  </div>
                  {tick.id && replayResults[tick.id] && (
                    <div
                      className={`mt-2 rounded border px-3 py-2 text-xs ${
                        replayResults[tick.id].deterministic
                          ? 'border-heliora-green/50 bg-heliora-green/10 text-heliora-green'
                          : 'border-heliora-yellow/50 bg-heliora-yellow/10 text-heliora-yellow'
                      }`}
                    >
                      {replayResults[tick.id].replayable === false
                        ? `Not replayable: ${replayResults[tick.id].reason}`
                        : replayResults[tick.id].deterministic
                          ? `✓ Deterministic — ${replayResults[tick.id].entries?.length ?? 0} corporation price moves reproduced exactly (seed ${replayResults[tick.id].randomSeed?.toFixed(6)})`
                          : `⚠ Mismatch — ${
                              replayResults[tick.id].entries?.filter((entry) => !entry.matches)
                                .length ?? 0
                            } of ${replayResults[tick.id].entries?.length ?? 0} price moves diverged`}
                    </div>
                  )}
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {tick.stepSummaries.map((step) => (
                      <div
                        key={step.step}
                        className="rounded border border-heliora-border/60 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="uppercase text-heliora-yellow">
                            {step.step.replaceAll('_', ' ')}
                          </span>
                          <span>
                            {step.processed}/{step.changes}
                          </span>
                        </div>
                        {step.notes?.length ? (
                          <p className="mt-1 text-heliora-text-dim">{step.notes.join(' · ')}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Realtime contracts">
            <div className="space-y-3">
              {REALTIME_EVENT_CONTRACTS.map((contract) => (
                <div
                  key={contract.type}
                  className="rounded border border-heliora-border/70 bg-black/10 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-heliora-green">{contract.type}</span>
                    <span className="text-xs text-heliora-text-dim">v{contract.version}</span>
                  </div>
                  <p className="mt-2 text-heliora-text-dim">{contract.description}</p>
                  <p className="mt-2 text-xs text-heliora-yellow">
                    Payload: {contract.payloadKeys.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr,1fr,1fr]">
          <Panel title="Market state">
            <div className="space-y-3">
              {worldState.marketState.corporations.map((corp) => (
                <CorporationRow key={corp.corporationId} corporation={corp} />
              ))}
            </div>
          </Panel>

          <Panel title="District control">
            <div className="space-y-3">
              {worldState.districtControl.map((district) => (
                <DistrictRow key={district.districtId} district={district} />
              ))}
            </div>
          </Panel>

          <Panel title="NPC activity feed">
            <div className="space-y-3">
              {worldState.recentNpcActivity.length === 0 ? (
                <p className="text-sm text-heliora-text-dim">No NPC actions recorded yet.</p>
              ) : (
                worldState.recentNpcActivity.map((entry) => (
                  <NpcRow key={`${entry.characterId}-${entry.createdAt}`} entry={entry} />
                ))
              )}
            </div>
          </Panel>
        </section>
      </div>
    </AdminShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-heliora-border bg-heliora-panel p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-heliora-text-dim">{label}</p>
      <p className="mt-2 text-3xl font-bold text-heliora-cyan">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-heliora-border bg-heliora-panel p-4">
      <h2 className="mb-4 text-lg font-semibold text-heliora-cyan">{title}</h2>
      {children}
    </section>
  );
}

function CorporationRow({ corporation }: { corporation: CorporationMarketState }) {
  return (
    <div className="rounded border border-heliora-border/70 bg-black/10 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{corporation.corporationName}</span>
        <span className="text-heliora-green">{formatMoney(corporation.stockPrice)}</span>
      </div>
      <p className="mt-1 text-xs text-heliora-text-dim">
        {corporation.industry} • {corporation.status} • volatility{' '}
        {formatPercent(corporation.stockVolatility ?? 0)}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-heliora-text-dim">
        <span>Revenue {formatMoney(corporation.revenue)}</span>
        <span>Cash {formatMoney(corporation.cash)}</span>
        <span>Debt {formatMoney(corporation.debt)}</span>
        <span>Risk {formatPercent(corporation.riskOfBankruptcy)}</span>
      </div>
    </div>
  );
}

function DistrictRow({ district }: { district: DistrictControlState }) {
  return (
    <div className="rounded border border-heliora-border/70 bg-black/10 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{district.districtName}</span>
        <span className="text-heliora-yellow">score {district.controlScore}</span>
      </div>
      <p className="mt-1 text-xs text-heliora-text-dim">
        {district.planetName} • {district.controllingFactionName || 'Unaligned'}
      </p>
      <p className="mt-2 text-xs text-heliora-text-dim">
        travel surcharge {formatMoney(district.travelSurcharge)} • danger {district.dangerLevel} •
        law {district.lawLevel}
      </p>
    </div>
  );
}

function NpcRow({ entry }: { entry: NpcActivityEntry }) {
  return (
    <div className="rounded border border-heliora-border/70 bg-black/10 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-heliora-green">{entry.characterName}</span>
        <span className="text-xs text-heliora-text-dim">
          {new Date(entry.createdAt).toLocaleTimeString()}
        </span>
      </div>
      <p className="mt-1 text-xs uppercase text-heliora-yellow">{entry.action}</p>
      <p className="mt-2 text-heliora-text-dim">{entry.summary}</p>
    </div>
  );
}
