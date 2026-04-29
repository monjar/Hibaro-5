'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { useAutoRefresh, useCharacter } from '@/lib/use-character';
import { Panel } from '@/components/Panel';
import { StatBar, StatPill } from '@/components/StatBar';
import { KindBadge, StatusBadge } from '@/components/KindBadge';
import type { ActivityLog, OpportunityInstance, WorldEvent } from '@heliora/platform-sdk';

function formatTimeLeft(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return '⚡ Ready to resolve';
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff / 1000) % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTIVITY_ICONS: Record<string, string> = {
  REGISTERED: '🚀',
  GIG_ACCEPTED: '📋',
  GIG_COMPLETED: '✅',
  GIG_FAILED: '❌',
  JOB_ACCEPTED: '💼',
  JOB_COMPLETED: '✅',
  QUEST_STARTED: '🗺️',
  QUEST_COMPLETED: '🏆',
  LOCATION_CHANGED: '📍',
  LOGIN: '🔑',
  LOGOUT: '🔒',
  ITEM_BOUGHT: '🛍️',
  ITEM_SOLD: '💰',
  WORLD_EVENT_TRIGGERED: '⚡',
  RELATIONSHIP_CHANGED: '🤝',
  BUILDING_ENTERED: '🏚️',
};

export default function HomePage() {
  const session = useAuthGuard();
  const { character, refresh } = useCharacter();
  const [instances, setInstances] = useState<OpportunityInstance[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!session.characterId) return;
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.characterId]);

  async function refreshAll() {
    if (!session.characterId || !session.player?.id) return;
    try {
      const [inst, act, events] = await Promise.all([
        api.getOpportunityInstances(session.characterId),
        api.getActivity(session.player.id, 1, 12),
        api.getActiveWorldEvents(),
      ]);
      setInstances(inst);
      setActivity(act.logs);
      setWorldEvents(events);
      await refresh();
    } catch {
      // soft fail
    }
  }

  useAutoRefresh(refreshAll, 12_000);

  async function resolveInstance(instanceId: string) {
    setResolving(instanceId);
    setMessage('');
    try {
      const result = (await api.resolveOpportunity(instanceId)) as {
        outcome?: { success?: boolean; appliedRewards?: Array<{ type: string; value: number }> };
        definition?: { title?: string };
      };
      const outcome = result.outcome;
      const credits = outcome?.appliedRewards?.find((r) => r.type === 'CREDITS');
      if (outcome?.success) {
        setMessage(
          `✅ ${result.definition?.title ?? 'Job'} succeeded${credits ? ` — +$${credits.value}` : ''}`,
        );
      } else {
        setMessage(`❌ ${result.definition?.title ?? 'Job'} failed`);
      }
      await refreshAll();
    } catch (e) {
      setMessage(`❌ ${(e as Error).message}`);
    } finally {
      setResolving(null);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  if (!session.ready || !session.token) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-12 text-heliora-text-dim">Loading…</main>
    );
  }
  if (!character) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-12 text-heliora-text-dim">
        Loading character data…
      </main>
    );
  }

  const inProgress = instances.filter(
    (i) => i.status === 'IN_PROGRESS' || i.status === 'ACCEPTED',
  );
  const recentCompleted = instances
    .filter((i) => i.status === 'COMPLETED' || i.status === 'FAILED')
    .slice(0, 5);

  const buildingFunctionality = Array.isArray(character.currentBuilding?.functionality)
    ? (character.currentBuilding?.functionality as string[])
    : [];

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
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
        <Panel title="Operator" accent="cyan" glow>
          <div className="mb-4">
            <h2 className="text-heliora-cyan text-2xl font-bold font-mono">{character.name}</h2>
            <p className="text-heliora-text-dim text-xs">
              {session.player?.username} ∷ {character.type}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
            <div className="bg-heliora-dark rounded p-2 border border-heliora-border">
              <div className="text-heliora-green font-bold font-mono">
                ${character.credits.toFixed(0)}
              </div>
              <div className="text-heliora-text-dim text-xs">Credits</div>
            </div>
            <div
              className={`bg-heliora-dark rounded p-2 border ${
                character.wantedLevel > 0 ? 'border-heliora-red/50' : 'border-heliora-border'
              }`}
            >
              <div
                className={`font-bold font-mono ${
                  character.wantedLevel > 0 ? 'text-heliora-red' : 'text-heliora-text'
                }`}
              >
                {character.wantedLevel > 0 ? '★'.repeat(character.wantedLevel) : '✓ Clear'}
              </div>
              <div className="text-heliora-text-dim text-xs">Wanted</div>
            </div>
          </div>
          <StatBar
            label="Health"
            value={character.health}
            max={character.maxHealth}
            color="bg-heliora-red"
          />
          <StatBar
            label="Energy"
            value={character.energy}
            max={character.maxEnergy}
            color="bg-heliora-cyan"
          />
        </Panel>

        <Panel title="Stats" accent="cyan">
          <div className="grid grid-cols-4 gap-2">
            <StatPill label="STR" value={character.strength} />
            <StatPill label="AGI" value={character.agility} />
            <StatPill label="INT" value={character.intelligence} />
            <StatPill label="CHA" value={character.charisma} />
            <StatPill label="HACK" value={character.hacking} />
            <StatPill label="CMB" value={character.combat} />
            <StatPill label="STH" value={character.stealth} />
            <StatPill label="ENG" value={character.engineering} />
          </div>
          <div className="mt-3 text-xs text-heliora-text-dim border-t border-heliora-border pt-2">
            Stat XP grows from completing matching opportunities (≈50% chance per success).
          </div>
        </Panel>

        <Panel title="Location" accent="cyan">
          <div className="space-y-3">
            <div className="border-l-2 border-heliora-teal pl-3">
              <div className="text-heliora-text-dim text-xs uppercase tracking-wider">Planet</div>
              <div className="text-heliora-text font-mono">
                {character.currentPlanet?.name || '—'}
              </div>
            </div>
            <div className="border-l-2 border-heliora-border pl-3">
              <div className="text-heliora-text-dim text-xs uppercase tracking-wider">
                District
              </div>
              <div className="text-heliora-text font-mono">
                {character.currentDistrict?.name || '—'}
                {character.currentDistrict && (
                  <span className="ml-2 text-heliora-text-dim text-xs">
                    ⚠{character.currentDistrict.dangerLevel} ⚖{character.currentDistrict.lawLevel}
                  </span>
                )}
              </div>
            </div>
            <div className="border-l-2 border-heliora-border pl-3">
              <div className="text-heliora-text-dim text-xs uppercase tracking-wider">
                Building
              </div>
              <div className="text-heliora-text font-mono">
                {character.currentBuilding?.name || '—'}
              </div>
              {buildingFunctionality.length > 0 && (
                <div className="text-heliora-text-dim text-xs mt-1">
                  {buildingFunctionality.join(' · ')}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/travel"
              className="text-center text-xs text-heliora-cyan border border-heliora-cyan/30 rounded py-1 hover:bg-heliora-cyan/10"
            >
              ▷ TRAVEL
            </Link>
            <RestButton
              onComplete={() => void refreshAll()}
              canRest={buildingFunctionality.some(
                (f) => f === 'SAFEHOUSE' || f === 'CLINIC' || f === 'HUB',
              )}
            />
          </div>
        </Panel>
      </div>

      {worldEvents.length > 0 && (
        <Panel title={`Active World Events (${worldEvents.length})`} accent="red">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {worldEvents.map((event) => (
              <div
                key={event.id}
                className="border border-heliora-red/20 rounded p-3 bg-heliora-red/5"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-heliora-orange text-sm font-bold">⚡ {event.title}</span>
                  <StatusBadge status={event.status} />
                </div>
                <p className="text-heliora-text-dim text-xs">{event.description}</p>
                <p className="text-heliora-text-dim text-xs mt-1">
                  Scope: {event.scope}
                  {event.endsAt && ` · ends ${formatTimeAgo(event.endsAt)}`}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {inProgress.length > 0 && (
        <Panel title={`In Progress (${inProgress.length})`} accent="cyan">
          <div className="space-y-3">
            {inProgress.map((inst) => {
              const isReady = new Date(inst.completesAt).getTime() <= Date.now();
              return (
                <div
                  key={inst.id}
                  className="border border-heliora-cyan/20 rounded p-3 bg-heliora-cyan/5 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <KindBadge kind={inst.definition.kind} />
                      <span className="text-heliora-text font-mono text-sm">
                        {inst.definition.title}
                      </span>
                    </div>
                    <div className="text-heliora-text-dim text-xs">
                      {formatTimeLeft(inst.completesAt)}
                    </div>
                  </div>
                  {isReady ? (
                    <button
                      onClick={() => void resolveInstance(inst.id)}
                      disabled={resolving === inst.id}
                      className="px-3 py-1 bg-heliora-green/20 border border-heliora-green/50 rounded text-heliora-green text-xs font-mono font-bold hover:bg-heliora-green/30 transition-colors disabled:opacity-50 ml-4 shrink-0"
                    >
                      {resolving === inst.id ? '…' : 'RESOLVE'}
                    </button>
                  ) : (
                    <span className="px-3 py-1 text-xs text-heliora-text-dim font-mono">
                      ◌ idle
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-heliora-text-dim">
            Auto-tick resolves due jobs every ~30s. You can also resolve manually as soon as the
            timer is up.
          </p>
        </Panel>
      )}

      {recentCompleted.length > 0 && (
        <Panel title="Recent Outcomes" accent="green">
          <div className="space-y-2">
            {recentCompleted.map((inst) => {
              const outcome = inst.outcome as
                | {
                    appliedRewards?: Array<{ type: string; value: number }>;
                    successChance?: number;
                    roll?: number;
                  }
                | undefined;
              return (
                <div
                  key={inst.id}
                  className={`border rounded p-3 ${
                    inst.status === 'COMPLETED'
                      ? 'border-heliora-green/20 bg-heliora-green/5'
                      : 'border-heliora-red/20 bg-heliora-red/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={inst.status} />
                      <span className="text-heliora-text text-sm font-mono">
                        {inst.definition.title}
                      </span>
                    </div>
                    <div className="text-heliora-text-dim text-xs">
                      {inst.completedAt && formatTimeAgo(inst.completedAt)}
                    </div>
                  </div>
                  {outcome && (
                    <div className="mt-1 text-xs text-heliora-text-dim">
                      Roll {outcome.roll} / chance {outcome.successChance}
                      {outcome.appliedRewards
                        ?.filter((r) => r.type === 'CREDITS')
                        .map((r) => (
                          <span key={r.type} className="ml-2 text-heliora-green">
                            +${r.value}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {activity.length > 0 && (
        <Panel title="Activity Log" accent="yellow">
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {activity.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 text-sm border-b border-heliora-border/30 pb-2 last:border-0"
              >
                <span className="text-base shrink-0">{ACTIVITY_ICONS[log.type] || '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-heliora-text text-xs">{log.message}</p>
                  <p className="text-heliora-text-dim text-xs">{formatTimeAgo(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right">
            <Link href="/activity" className="text-xs text-heliora-cyan hover:underline">
              View full log →
            </Link>
          </div>
        </Panel>
      )}
    </main>
  );
}

function RestButton({ canRest, onComplete }: { canRest: boolean; onComplete: () => void }) {
  const session = useAuthGuard();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function rest() {
    if (!session.characterId) return;
    setBusy(true);
    setError('');
    try {
      await api.rest(session.characterId);
      onComplete();
    } catch (e) {
      setError((e as Error).message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => void rest()}
        disabled={!canRest || busy}
        className="w-full text-center text-xs text-heliora-green border border-heliora-green/30 rounded py-1 hover:bg-heliora-green/10 disabled:opacity-40 disabled:cursor-not-allowed"
        title={canRest ? 'Rest at this location' : 'Move to a safehouse, clinic, or hub to rest'}
      >
        {busy ? '◌' : '☾ REST'}
      </button>
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 text-[10px] text-heliora-red text-center">
          {error.replace(/^API error \d+: /, '').slice(0, 80)}
        </div>
      )}
    </div>
  );
}
