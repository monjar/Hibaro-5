import {
  REALTIME_EVENT_CONTRACTS,
  createApiClient,
  type CorporationMarketState,
  type DistrictControlState,
  type NpcActivityEntry,
  type SimulationTickSummary,
  type WorldState,
} from '@heliora/platform-sdk';

const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—';
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default async function AdminPage() {
  const [worldState, history] = await Promise.all([
    api.getWorldState().catch(() => null as WorldState | null),
    api.getSimulationHistory(8).catch(() => [] as SimulationTickSummary[]),
  ]);

  if (!worldState) {
    return (
      <main className="min-h-screen bg-heliora-dark text-heliora-text p-8">
        <div className="max-w-4xl mx-auto rounded border border-heliora-red/40 bg-heliora-panel p-6">
          <h1 className="text-2xl font-bold text-heliora-red">Heliora Admin unavailable</h1>
          <p className="mt-3 text-heliora-text-dim">
            Start the API at {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'} to inspect
            the world-state engine.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-heliora-dark text-heliora-text">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="rounded border border-heliora-border bg-heliora-panel p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-heliora-cyan">
            Heliora Admin Control Plane
          </p>
          <h1 className="mt-2 text-3xl font-bold">Hibaro-5 simulation overview</h1>
          <p className="mt-3 max-w-3xl text-sm text-heliora-text-dim">
            Inspect economy drift, corporation volatility, district control pressure, NPC actions,
            and the shared realtime contracts that future transports must honor.
          </p>
          <nav className="mt-4 flex gap-2">
            <a
              href="/opportunities"
              className="rounded border border-heliora-cyan/60 bg-heliora-cyan/10 px-4 py-2 text-sm font-bold text-heliora-cyan hover:bg-heliora-cyan/20"
            >
              MANAGE OPPORTUNITIES →
            </a>
          </nav>
        </header>

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
                    <div className="text-xs text-heliora-text-dim">
                      {tick.stepSummaries.length} steps
                    </div>
                  </div>
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
    </main>
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
