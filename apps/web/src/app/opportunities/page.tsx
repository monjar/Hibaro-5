'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { useCharacter } from '@/lib/use-character';
import { useEventStream } from '@/lib/use-event-stream';
import { Panel } from '@/components/Panel';
import { KindBadge, StatusBadge } from '@/components/KindBadge';
import type {
  JobEmployment,
  OpportunityDefinition,
  OpportunityInstance,
} from '@heliora/platform-sdk';

type RewardEntry = { type: string; value: number; key?: string };
type RequirementEntry = { type?: string; key?: string; value: number };

export default function OpportunitiesPage() {
  const session = useAuthGuard();
  const { character } = useCharacter();
  const [available, setAvailable] = useState<OpportunityDefinition[]>([]);
  const [instances, setInstances] = useState<OpportunityInstance[]>([]);
  const [employments, setEmployments] = useState<JobEmployment[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [hiringFor, setHiringFor] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    if (!session.characterId) return;
    try {
      const [a, i, j] = await Promise.all([
        api.getAvailableOpportunities(session.characterId),
        api.getOpportunityInstances(session.characterId),
        api.listJobs(session.characterId),
      ]);
      setAvailable(a);
      setInstances(i);
      setEmployments(j);
    } catch {
      // ignore
    }
  }, [session.characterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEventStream(
    ['simulation.tick.completed'],
    () => void refresh(),
    Boolean(session.characterId),
  );

  async function accept(opp: OpportunityDefinition) {
    if (!session.characterId) return;
    setAccepting(opp.id);
    setMessage('');
    try {
      await api.acceptOpportunity(opp.id, session.characterId);
      setMessage(`✅ Accepted: ${opp.title}`);
      await refresh();
    } catch (e) {
      setMessage(`❌ ${(e as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setAccepting(null);
      setTimeout(() => setMessage(''), 4500);
    }
  }

  async function hire(opp: OpportunityDefinition) {
    if (!session.characterId) return;
    setHiringFor(opp.id);
    setMessage('');
    try {
      await api.hireForJob(opp.id, session.characterId);
      setMessage(`✅ Hired at ${opp.title}`);
      await refresh();
    } catch (e) {
      setMessage(`❌ ${(e as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setHiringFor(null);
      setTimeout(() => setMessage(''), 4500);
    }
  }

  async function quit(employmentId: string, title: string) {
    setHiringFor(employmentId);
    setMessage('');
    try {
      await api.quitJob(employmentId);
      setMessage(`✅ Quit ${title}`);
      await refresh();
    } catch (e) {
      setMessage(`❌ ${(e as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setHiringFor(null);
      setTimeout(() => setMessage(''), 4500);
    }
  }

  async function resolve(instanceId: string) {
    setResolving(instanceId);
    setMessage('');
    try {
      const r = (await api.resolveOpportunity(instanceId)) as {
        outcome?: { success?: boolean; appliedRewards?: RewardEntry[] };
        definition?: { title?: string };
      };
      const credits = r.outcome?.appliedRewards?.find((x) => x.type === 'CREDITS');
      setMessage(
        r.outcome?.success
          ? `✅ ${r.definition?.title} succeeded${credits ? ` — +$${credits.value}` : ''}`
          : `❌ ${r.definition?.title} failed`,
      );
      await refresh();
    } catch (e) {
      setMessage(`❌ ${(e as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setResolving(null);
      setTimeout(() => setMessage(''), 4500);
    }
  }

  if (!session.ready || !session.token) return null;

  const inProgress = instances.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'ACCEPTED');
  const completed = instances.filter((i) => i.status === 'COMPLETED' || i.status === 'FAILED');
  const hasActiveActivity = inProgress.length > 0;
  const activeJobs = employments.filter((e) => e.status === 'ACTIVE');
  const employedOpportunityIds = new Set(activeJobs.map((j) => j.opportunityId));

  function shiftStatus(emp: JobEmployment): {
    label: string;
    tone: 'green' | 'yellow' | 'red';
  } {
    const elapsedHours =
      (Date.now() - new Date(emp.lastShiftAt).getTime()) / (1000 * 60 * 60);
    const overdue = elapsedHours - emp.cadenceHours;
    if (overdue > 0) {
      return { label: `OVERDUE ${overdue.toFixed(1)}h`, tone: 'red' };
    }
    if (overdue > -2) {
      return { label: `DUE in ${(-overdue).toFixed(1)}h`, tone: 'yellow' };
    }
    return { label: `next shift ${Math.max(0, -overdue).toFixed(0)}h`, tone: 'green' };
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-heliora-cyan font-mono text-2xl tracking-widest">OPPORTUNITY BOARD</h1>

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

      {inProgress.length > 0 && (
        <Panel title={`Active (${inProgress.length})`} accent="cyan">
          <div className="space-y-2">
            {inProgress.map((inst) => {
              const isReady = new Date(inst.completesAt).getTime() <= Date.now();
              const remaining = Math.max(
                0,
                Math.floor((new Date(inst.completesAt).getTime() - Date.now()) / 1000),
              );
              const total = Math.max(
                1,
                Math.floor(
                  (new Date(inst.completesAt).getTime() - new Date(inst.startedAt).getTime()) /
                    1000,
                ),
              );
              const pct = Math.min(100, Math.round(((total - remaining) / total) * 100));
              return (
                <div
                  key={inst.id}
                  className="border border-heliora-cyan/20 rounded p-3 bg-heliora-cyan/5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <KindBadge kind={inst.definition.kind} />
                      <span className="text-heliora-text font-mono text-sm">
                        {inst.definition.title}
                      </span>
                    </div>
                    {isReady ? (
                      <button
                        onClick={() => void resolve(inst.id)}
                        disabled={resolving === inst.id}
                        className="px-3 py-1 bg-heliora-green/20 border border-heliora-green/50 rounded text-heliora-green text-xs font-mono font-bold hover:bg-heliora-green/30 disabled:opacity-50"
                      >
                        {resolving === inst.id ? '…' : 'RESOLVE'}
                      </button>
                    ) : (
                      <span className="text-xs text-heliora-text-dim">
                        {Math.floor(remaining / 60)}m {remaining % 60}s
                      </span>
                    )}
                  </div>
                  <div className="h-1 bg-heliora-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-heliora-cyan transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {activeJobs.length > 0 && (
        <Panel title={`Jobs (${activeJobs.length})`} accent="yellow">
          <div className="space-y-2">
            {activeJobs.map((emp) => {
              const status = shiftStatus(emp);
              const toneClass =
                status.tone === 'red'
                  ? 'text-heliora-red border-heliora-red/40 bg-heliora-red/10'
                  : status.tone === 'yellow'
                    ? 'text-heliora-yellow border-heliora-yellow/40 bg-heliora-yellow/10'
                    : 'text-heliora-green border-heliora-green/40 bg-heliora-green/10';
              return (
                <div
                  key={emp.id}
                  className="border border-heliora-yellow/20 rounded p-3 bg-heliora-yellow/5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <KindBadge kind="JOB" />
                      <span className="text-heliora-text font-mono text-sm font-bold">
                        {emp.opportunity.title}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 border rounded ${toneClass}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-heliora-text-dim">
                    <span>
                      Shifts: {emp.totalShiftsCompleted} · Strikes: {emp.strikes}/3 · Earned: $
                      {emp.totalCreditsEarned.toFixed(0)}
                    </span>
                    <button
                      onClick={() => void quit(emp.id, emp.opportunity.title)}
                      disabled={hiringFor === emp.id}
                      className="px-2 py-0.5 border border-heliora-red/40 rounded text-heliora-red text-[10px] hover:bg-heliora-red/10 disabled:opacity-30"
                    >
                      QUIT
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel title={`Available (${available.length})`} accent="orange">
        {available.length === 0 ? (
          <p className="text-heliora-text-dim text-sm py-4 text-center">
            No opportunities available right now. Try again after the next world tick.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {available.map((opp) => {
              const requirements = (opp.requirements as RequirementEntry[]) ?? [];
              const questData = opp.questData;
              const requirementsMet = character
                ? requirements.every((r) => {
                    if (r.type === 'CREDITS_MIN') return character.credits >= r.value;
                    if (r.type === 'STAT_MIN' && r.key) {
                      const stat =
                        (character[r.key as keyof typeof character] as number | undefined) ?? 0;
                      return stat >= r.value;
                    }
                    return true;
                  })
                : true;
              return (
                <div
                  key={opp.id}
                  className={`border rounded p-3 transition-colors ${
                    requirementsMet
                      ? 'border-heliora-border bg-heliora-dark hover:border-heliora-orange/30'
                      : 'border-heliora-border/40 bg-heliora-dark/50 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <KindBadge kind={opp.kind} />
                      <span className="text-heliora-text-dim text-xs">{opp.type}</span>
                    </div>
                    <span className="text-xs text-heliora-text-dim">⚡ Diff {opp.difficulty}</span>
                  </div>
                  <h3 className="text-heliora-text font-bold text-sm mb-1">{opp.title}</h3>
                  <p className="text-heliora-text-dim text-xs mb-2 line-clamp-3">
                    {opp.description}
                  </p>
                  {opp.kind === 'QUEST' && questData?.stepNumber && questData?.totalSteps && (
                    <div className="mb-2 text-[11px] text-heliora-cyan font-mono">
                      Chain progress {questData.stepNumber}/{questData.totalSteps}
                    </div>
                  )}
                  {opp.kind === 'QUEST' && questData?.hint && (
                    <div className="mb-2 text-[11px] text-heliora-text-dim">
                      Hint: {questData.hint}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs mb-2">
                    <span className="text-heliora-text-dim">⏱ {opp.durationMinutes ?? '?'}m</span>
                    {(opp.rewards as RewardEntry[]).map((r, i) => {
                      if (r.type === 'CREDITS')
                        return (
                          <span key={i} className="text-heliora-green font-bold">
                            +${r.value}
                          </span>
                        );
                      if (r.type === 'FACTION_REPUTATION')
                        return (
                          <span key={i} className="text-heliora-yellow">
                            +{r.value} REP
                          </span>
                        );
                      if (r.type === 'CORPORATION_REPUTATION')
                        return (
                          <span key={i} className="text-heliora-cyan">
                            +{r.value} CORP
                          </span>
                        );
                      if (r.type === 'STAT_XP')
                        return (
                          <span key={i} className="text-heliora-orange">
                            +{r.value} XP {r.key}
                          </span>
                        );
                      return null;
                    })}
                  </div>
                  {requirements.length > 0 && (
                    <div
                      className={`text-xs mb-2 border-t pt-2 ${
                        requirementsMet
                          ? 'text-heliora-yellow border-heliora-border'
                          : 'text-heliora-red border-heliora-red/30'
                      }`}
                    >
                      Req: {requirements.map((r) => `${r.key ?? r.type} ≥ ${r.value}`).join(', ')}
                    </div>
                  )}
                  {opp.kind === 'JOB' && !employedOpportunityIds.has(opp.id) ? (
                    <button
                      onClick={() => void hire(opp)}
                      disabled={hiringFor === opp.id || !requirementsMet}
                      className="w-full px-3 py-1.5 bg-heliora-yellow/20 border border-heliora-yellow/50 rounded text-heliora-yellow text-xs font-mono font-bold hover:bg-heliora-yellow/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {hiringFor === opp.id ? 'HIRING…' : !requirementsMet ? 'LOCKED' : 'GET HIRED'}
                    </button>
                  ) : (
                    <button
                      onClick={() => void accept(opp)}
                      disabled={accepting === opp.id || !requirementsMet || hasActiveActivity}
                      title={hasActiveActivity ? 'Finish your current activity first' : undefined}
                      className="w-full px-3 py-1.5 bg-heliora-orange/20 border border-heliora-orange/50 rounded text-heliora-orange text-xs font-mono font-bold hover:bg-heliora-orange/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {accepting === opp.id
                        ? 'ACCEPTING…'
                        : !requirementsMet
                          ? 'LOCKED'
                          : hasActiveActivity
                            ? 'BUSY'
                            : opp.kind === 'JOB'
                              ? 'WORK SHIFT'
                              : 'ACCEPT'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {completed.length > 0 && (
        <Panel title={`History (${completed.length})`} accent="green">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {completed.slice(0, 20).map((inst) => (
              <div
                key={inst.id}
                className={`border rounded p-2 flex items-center justify-between text-sm ${
                  inst.status === 'COMPLETED'
                    ? 'border-heliora-green/20 bg-heliora-green/5'
                    : 'border-heliora-red/20 bg-heliora-red/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status={inst.status} />
                  <span className="text-heliora-text font-mono">{inst.definition.title}</span>
                </div>
                <span className="text-xs text-heliora-text-dim">
                  {inst.completedAt && new Date(inst.completedAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </main>
  );
}
