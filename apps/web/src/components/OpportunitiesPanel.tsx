'use client';

import { useState } from 'react';
import {
  apiFetch,
  Character,
  OpportunityDefinition,
  OpportunityInstance,
  ActivityLog,
} from '@/lib/api';
import { Panel } from './Panel';
import { StatBar, StatPill } from './StatBar';
import { KindBadge, StatusBadge } from './KindBadge';

function formatTimeLeft(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return '⚡ Ready!';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m left`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
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
  GIG_ACCEPTED: '📋',
  GIG_COMPLETED: '✅',
  GIG_FAILED: '❌',
  JOB_COMPLETED: '✅',
  QUEST_STARTED: '🗺️',
  QUEST_COMPLETED: '🏆',
  LOCATION_CHANGED: '📍',
  LOGIN: '🔑',
  ITEM_BOUGHT: '🛍️',
  WORLD_EVENT_TRIGGERED: '⚡',
  RELATIONSHIP_CHANGED: '🤝',
};

interface OpportunitiesPanelProps {
  allOpportunities: OpportunityDefinition[];
}

type RewardEntry = { type: string; value: number };
type RequirementEntry = { key?: string; type?: string; value: number };
type OutcomeEntry = {
  roll?: number;
  successChance?: number;
  success?: boolean;
  appliedRewards?: RewardEntry[];
  appliedRisks?: unknown[];
};

export function OpportunitiesPanel({ allOpportunities }: OpportunitiesPanelProps) {
  const [characterId, setCharacterId] = useState('');
  const [character, setCharacter] = useState<Character | null>(null);
  const [available, setAvailable] = useState<OpportunityDefinition[]>([]);
  const [instances, setInstances] = useState<OpportunityInstance[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function loadCharacter(id: string) {
    if (!id.trim()) return;
    setLoading(true);
    setError('');
    try {
      const charData = await apiFetch<Character>(`/characters/${id}`);
      const [instData, availData] = await Promise.all([
        apiFetch<OpportunityInstance[]>(`/opportunities/instances/${id}`),
        apiFetch<OpportunityDefinition[]>(`/opportunities/available/${id}`),
      ]);
      setCharacter(charData);
      setInstances(instData);
      setAvailable(availData);

      if (charData.playerId) {
        const actData = await apiFetch<{ logs: ActivityLog[] }>(
          `/players/${charData.playerId}/activity`,
        );
        setActivity(actData.logs || []);
      }
    } catch (e) {
      setError((e as Error).message);
      setCharacter(null);
    } finally {
      setLoading(false);
    }
  }

  async function acceptOpportunity(opportunityId: string) {
    if (!character) return;
    setAccepting(opportunityId);
    setMessage('');
    try {
      await apiFetch(`/opportunities/${opportunityId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ characterId: character.id }),
      });
      setMessage('✅ Opportunity accepted!');
      await refreshData();
    } catch (e) {
      setMessage(`❌ ${(e as Error).message}`);
    } finally {
      setAccepting(null);
    }
  }

  async function resolveInstance(instanceId: string) {
    setResolving(instanceId);
    setMessage('');
    try {
      const result = await apiFetch<{ outcome: OutcomeEntry; definition: OpportunityDefinition }>(
        `/opportunities/instances/${instanceId}/resolve`,
        {
          method: 'POST',
        },
      );
      const outcome = result.outcome;
      if (outcome?.success) {
        const credits = outcome.appliedRewards?.find((r) => r.type === 'CREDITS');
        setMessage(
          `✅ Success! ${credits ? `+$${credits.value}` : ''} ${result.definition?.title}`,
        );
      } else {
        setMessage(
          `❌ Failed: ${result.definition?.title}. ${outcome?.appliedRisks?.length ? 'Risks applied.' : ''}`,
        );
      }
      await refreshData();
    } catch (e) {
      setMessage(`❌ ${(e as Error).message}`);
    } finally {
      setResolving(null);
    }
  }

  async function refreshData() {
    if (!character) return;
    const [charData, instData, availData] = await Promise.all([
      apiFetch<Character>(`/characters/${character.id}`),
      apiFetch<OpportunityInstance[]>(`/opportunities/instances/${character.id}`),
      apiFetch<OpportunityDefinition[]>(`/opportunities/available/${character.id}`),
    ]);
    setCharacter(charData);
    setInstances(instData);
    setAvailable(availData);
    if (charData.playerId) {
      const actData = await apiFetch<{ logs: ActivityLog[] }>(
        `/players/${charData.playerId}/activity`,
      );
      setActivity(actData.logs || []);
    }
  }

  const inProgress = instances.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'ACCEPTED');
  const completed = instances.filter((i) => i.status === 'COMPLETED' || i.status === 'FAILED');

  return (
    <div className="space-y-6">
      {/* Character ID Input */}
      <Panel title="Character Lookup" accent="cyan">
        <div className="flex gap-3">
          <input
            type="text"
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCharacter(characterId)}
            placeholder="Paste your Character ID here..."
            className="flex-1 bg-heliora-dark border border-heliora-border rounded px-3 py-2 text-heliora-cyan text-sm font-mono focus:outline-none focus:border-heliora-cyan placeholder-heliora-text-dim"
          />
          <button
            onClick={() => loadCharacter(characterId)}
            disabled={loading}
            className="px-4 py-2 bg-heliora-cyan/20 border border-heliora-cyan/50 rounded text-heliora-cyan text-sm font-mono font-bold hover:bg-heliora-cyan/30 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'LOAD'}
          </button>
        </div>
        {error && <p className="mt-2 text-heliora-red text-xs">{error}</p>}
        <p className="mt-2 text-heliora-text-dim text-xs">
          Run <code className="text-heliora-cyan">npm run db:seed</code> then check the console
          output for your Character ID.
        </p>
      </Panel>

      {/* Message notification */}
      {message && (
        <div
          className={`border rounded p-3 text-sm font-mono ${message.startsWith('✅') ? 'border-heliora-green/40 bg-heliora-green/10 text-heliora-green' : 'border-heliora-red/40 bg-heliora-red/10 text-heliora-red'}`}
        >
          {message}
        </div>
      )}

      {character && (
        <>
          {/* Character Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Character Info */}
            <Panel title="Character" accent="cyan" glow>
              <div className="mb-4">
                <h2 className="text-heliora-cyan text-xl font-bold font-mono">{character.name}</h2>
                <p className="text-heliora-text-dim text-xs">{character.type}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div className="bg-heliora-dark rounded p-2 border border-heliora-border">
                  <div className="text-heliora-green font-bold font-mono">
                    ${character.credits.toFixed(0)}
                  </div>
                  <div className="text-heliora-text-dim text-xs">Credits</div>
                </div>
                <div
                  className={`bg-heliora-dark rounded p-2 border ${character.wantedLevel > 0 ? 'border-heliora-red/50' : 'border-heliora-border'}`}
                >
                  <div
                    className={`font-bold font-mono ${character.wantedLevel > 0 ? 'text-heliora-red' : 'text-heliora-text'}`}
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

            {/* Stats */}
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
            </Panel>

            {/* Location */}
            <Panel title="Location" accent="cyan">
              <div className="space-y-3">
                <div className="border-l-2 border-heliora-teal pl-3">
                  <div className="text-heliora-text-dim text-xs uppercase tracking-wider">
                    Planet
                  </div>
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
                  </div>
                </div>
                <div className="border-l-2 border-heliora-border pl-3">
                  <div className="text-heliora-text-dim text-xs uppercase tracking-wider">
                    Building
                  </div>
                  <div className="text-heliora-text font-mono">
                    {character.currentBuilding?.name || '—'}
                  </div>
                </div>
              </div>
              <button
                onClick={refreshData}
                className="mt-4 w-full text-xs text-heliora-text-dim hover:text-heliora-cyan border border-heliora-border hover:border-heliora-cyan/30 rounded py-1 transition-colors"
              >
                ↻ Refresh
              </button>
            </Panel>
          </div>

          {/* Available Opportunities */}
          <Panel title={`Available for ${character.name} (${available.length})`} accent="orange">
            {available.length === 0 ? (
              <p className="text-heliora-text-dim text-sm text-center py-4">
                No opportunities available or all are in progress.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {available.map((opp) => (
                  <div
                    key={opp.id}
                    className="border border-heliora-border rounded p-3 bg-heliora-dark hover:border-heliora-orange/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <KindBadge kind={opp.kind} />
                        <span className="text-heliora-text-dim text-xs">{opp.type}</span>
                      </div>
                      <span className="text-xs text-heliora-text-dim">Diff: {opp.difficulty}</span>
                    </div>
                    <h3 className="text-heliora-text font-bold text-sm mb-1">{opp.title}</h3>
                    <p className="text-heliora-text-dim text-xs mb-3 line-clamp-2">
                      {opp.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="text-heliora-text-dim">
                          ⏱ {opp.durationMinutes ?? '?'}m
                        </span>
                        {(opp.rewards as RewardEntry[])
                          .filter((r) => r.type === 'CREDITS')
                          .map((r) => (
                            <span key={r.type} className="text-heliora-green font-bold">
                              +${r.value}
                            </span>
                          ))}
                      </div>
                      <button
                        onClick={() => acceptOpportunity(opp.id)}
                        disabled={accepting === opp.id}
                        className="px-3 py-1 bg-heliora-orange/20 border border-heliora-orange/50 rounded text-heliora-orange text-xs font-mono font-bold hover:bg-heliora-orange/30 transition-colors disabled:opacity-50 ml-2"
                      >
                        {accepting === opp.id ? '...' : 'ACCEPT'}
                      </button>
                    </div>
                    {opp.requirements.length > 0 && (
                      <div className="mt-2 text-xs text-heliora-yellow border-t border-heliora-border pt-2">
                        Req:{' '}
                        {(opp.requirements as RequirementEntry[])
                          .map((r) => `${r.key ?? r.type} ≥ ${r.value}`)
                          .join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Active / In-Progress */}
          {inProgress.length > 0 && (
            <Panel title={`In Progress (${inProgress.length})`} accent="cyan">
              <div className="space-y-3">
                {inProgress.map((inst) => (
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
                    <button
                      onClick={() => resolveInstance(inst.id)}
                      disabled={resolving === inst.id}
                      className="px-3 py-1 bg-heliora-cyan/20 border border-heliora-cyan/50 rounded text-heliora-cyan text-xs font-mono font-bold hover:bg-heliora-cyan/30 transition-colors disabled:opacity-50 ml-4 shrink-0"
                    >
                      {resolving === inst.id ? '...' : 'RESOLVE'}
                    </button>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Completed History */}
          {completed.length > 0 && (
            <Panel title={`History (${completed.length})`} accent="green">
              <div className="space-y-2">
                {completed.slice(0, 10).map((inst) => {
                  const outcome = inst.outcome as OutcomeEntry | undefined;
                  return (
                    <div
                      key={inst.id}
                      className={`border rounded p-3 ${inst.status === 'COMPLETED' ? 'border-heliora-green/20 bg-heliora-green/5' : 'border-heliora-red/20 bg-heliora-red/5'}`}
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
                          Roll: {outcome.roll} / {outcome.successChance} chance
                          {outcome.appliedRewards?.map((r) =>
                            r.type === 'CREDITS' ? (
                              <span
                                key={`${r.type}-${r.value}`}
                                className="ml-2 text-heliora-green"
                              >
                                +${r.value}
                              </span>
                            ) : null,
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* Activity Log */}
          {activity.length > 0 && (
            <Panel title="Activity Log" accent="yellow">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activity.slice(0, 20).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 text-sm border-b border-heliora-border/30 pb-2 last:border-0"
                  >
                    <span className="text-base shrink-0">{ACTIVITY_ICONS[log.type] || '•'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-heliora-text text-xs">{log.message}</p>
                      <p className="text-heliora-text-dim text-xs">
                        {formatTimeAgo(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
