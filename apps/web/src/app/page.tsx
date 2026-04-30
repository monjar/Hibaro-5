import { apiFetch, OpportunityDefinition, WorldEvent, WorldState } from '@/lib/api'
import { Panel } from '@/components/Panel'
import { KindBadge, StatusBadge } from '@/components/KindBadge'
import { OpportunitiesPanel } from '@/components/OpportunitiesPanel'
import { SimulationButton } from '@/components/SimulationButton'

type PlanetEntry = { id: string; name: string; planetType: string; dangerLevel: number; lawLevel: number }
type FactionEntry = { id: string; name: string; influence: number }
type CorpEntry = { id: string; name: string; stockTicker?: string; stockPrice?: number; status: string }
type RewardEntry = { type: string; value: number }
type RequirementEntry = { key?: string; type?: string; value: number }

export default async function HomePage() {
  const worldState = await apiFetch<WorldState>('/simulation/world-state').catch(() => null)
  const activeEvents = await apiFetch<WorldEvent[]>('/world-events/active').catch(() => [])
  const allOpportunities = await apiFetch<OpportunityDefinition[]>('/opportunities').catch(() => [])

  const isConnected = worldState !== null

  return (
    <div className="min-h-screen bg-heliora-dark">
      {/* Header */}
      <header className="border-b border-heliora-border bg-heliora-panel sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-heliora-cyan font-mono font-bold text-xl tracking-widest uppercase">
              ◈ HELIORA
            </h1>
            <p className="text-heliora-text-dim text-xs tracking-wider">HIBARO-5 SYSTEM ∷ IDLE RPG</p>
          </div>
          <div className="flex items-center gap-4">
            <SimulationButton />
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-heliora-green' : 'bg-heliora-red'}`} />
              <span className={isConnected ? 'text-heliora-green' : 'text-heliora-red'}>
                {isConnected ? 'API ONLINE' : 'API OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {!isConnected && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Panel title="API Connection Required" accent="red">
            <div className="text-center py-8">
              <p className="text-heliora-red text-lg mb-2">⚠ Cannot connect to Heliora API</p>
              <p className="text-heliora-text-dim text-sm mb-4">
                Start the API server to play the game.
              </p>
              <code className="bg-heliora-dark border border-heliora-border rounded px-4 py-2 text-heliora-cyan text-sm block max-w-sm mx-auto">
                npm run dev
              </code>
              <p className="text-heliora-text-dim text-xs mt-4">API should be running at http://localhost:3000</p>
            </div>
          </Panel>
        </div>
      )}

      {isConnected && (
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* World State Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Planets */}
            <Panel title="Solar System" accent="cyan">
              <div className="space-y-2">
                {(worldState!.planets as PlanetEntry[]).map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-heliora-text text-sm font-mono">{p.name}</span>
                      <span className="text-heliora-text-dim text-xs ml-2">{p.planetType}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-heliora-text-dim">
                      <span title="Danger">⚠{p.dangerLevel}</span>
                      <span title="Law">⚖{p.lawLevel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Factions */}
            <Panel title="Factions" accent="orange">
              <div className="space-y-2">
                {(worldState!.factions as FactionEntry[]).slice(0, 4).map((f) => (
                  <div key={f.id} className="flex items-center justify-between">
                    <span className="text-heliora-text text-sm font-mono truncate">{f.name}</span>
                    <span className="text-heliora-text-dim text-xs">INF:{f.influence}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Corporations */}
            <Panel title="Corporations" accent="yellow">
              <div className="space-y-2">
                {(worldState!.corporations as CorpEntry[]).slice(0, 4).map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-heliora-text text-sm font-mono">{c.stockTicker || '---'}</span>
                      <span className="text-heliora-text-dim text-xs ml-2 truncate">{c.name.split(' ')[0]}</span>
                    </div>
                    <span className={`text-xs font-mono ${c.status === 'GROWING' ? 'text-heliora-green' : c.status === 'DECLINING' ? 'text-heliora-red' : 'text-heliora-cyan'}`}>
                      {c.stockPrice ? `$${c.stockPrice.toFixed(0)}` : c.status}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Active World Events */}
          {activeEvents.length > 0 && (
            <Panel title={`Active World Events (${activeEvents.length})`} accent="red">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeEvents.map((event) => (
                  <div key={event.id} className="border border-heliora-red/20 rounded p-3 bg-heliora-red/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-heliora-orange text-sm font-bold">⚡ {event.title}</span>
                      <StatusBadge status={event.status} />
                    </div>
                    <p className="text-heliora-text-dim text-xs">{event.description}</p>
                    <p className="text-heliora-text-dim text-xs mt-1">Scope: {event.scope}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Opportunities Board */}
          <Panel title={`Opportunity Board (${allOpportunities.length} available)`} accent="cyan">
            <div className="mb-3 text-heliora-text-dim text-xs">
              Browse all available opportunities below. Enter your Character ID to accept them.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allOpportunities.map((opp) => (
                <div key={opp.id} className="border border-heliora-border rounded p-3 bg-heliora-dark hover:border-heliora-cyan/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <KindBadge kind={opp.kind} />
                    <span className="text-heliora-text-dim text-xs">{opp.type}</span>
                  </div>
                  <h3 className="text-heliora-text font-bold text-sm mb-1">{opp.title}</h3>
                  <p className="text-heliora-text-dim text-xs mb-2 line-clamp-2">{opp.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-heliora-text-dim">
                    <span>⏱ {opp.durationMinutes ?? '?'}m</span>
                    <span>⚡ Diff: {opp.difficulty}</span>
                    {(opp.rewards as RewardEntry[]).filter((r) => r.type === 'CREDITS').map((r) => (
                      <span key={r.type} className="text-heliora-green">+${r.value}</span>
                    ))}
                  </div>
                  {opp.requirements.length > 0 && (
                    <div className="mt-2 text-xs text-heliora-yellow">
                      Req: {(opp.requirements as RequirementEntry[]).map((r) => `${r.key ?? r.type} ≥ ${r.value}`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {/* Character Interaction Section */}
          <OpportunitiesPanel allOpportunities={allOpportunities} />
        </main>
      )}
    </div>
  )
}
