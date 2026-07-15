'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { useCharacter, useNow } from '@/lib/use-character';
import { useEventStream } from '@/lib/use-event-stream';
import { Panel } from '@/components/Panel';
import { Tooltip } from '@/components/Tooltip';
import { KindBadge, StatusBadge } from '@/components/KindBadge';
import {
  describeRewardTooltip,
  formatRewardBadgeLabel,
  formatOpportunityCheckHint,
  formatUiError,
} from '@/lib/ui-presenters';
import {
  getAcceptedDescription,
  getRestProgress,
  getTimelineEventDescription,
  isRestActivity,
} from '@/lib/opportunity-activity';
import { useRewardReferenceLookup } from '@/lib/use-reward-reference-lookup';
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
  const now = useNow();
  const rewardReferenceLookup = useRewardReferenceLookup();

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
  const handleTick = useCallback(() => {
    void refresh();
  }, [refresh]);
  useEventStream(['simulation.tick.completed'], handleTick, Boolean(session.characterId));

  async function accept(opp: OpportunityDefinition) {
    if (!session.characterId) return;
    setAccepting(opp.id);
    setMessage('');
    try {
      await api.acceptOpportunity(opp.id, session.characterId);
      setMessage(`✅ Accepted: ${opp.title}`);
      await refresh();
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
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
      setMessage(`❌ ${formatUiError(e)}`);
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
      setMessage(`❌ ${formatUiError(e)}`);
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
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setResolving(null);
      setTimeout(() => setMessage(''), 4500);
    }
  }

  async function stopRest() {
    if (!session.characterId) return;
    setMessage('');
    try {
      await api.stopRest(session.characterId);
      setMessage('✅ Rest interrupted');
      await refresh();
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setTimeout(() => setMessage(''), 4500);
    }
  }

  if (!session.ready || !session.token) return null;

  const inProgress = instances.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'ACCEPTED');
  const completed = instances.filter((i) => i.status === 'COMPLETED' || i.status === 'FAILED');
  const hasActiveActivity = inProgress.length > 0;
  const activeJobs = employments.filter((e) => e.status === 'ACTIVE');
  const employedOpportunityIds = new Set(activeJobs.map((j) => j.opportunityId));
  const availableQuests = available.filter((opportunity) => opportunity.kind === 'QUEST');
  const availableJobs = available.filter((opportunity) => opportunity.kind === 'JOB');
  const availableGigs = available.filter((opportunity) => opportunity.kind === 'GIG');

  function shiftStatus(emp: JobEmployment): {
    taken: boolean;
    tone: 'green' | 'yellow' | 'red';
    headline: string;
    subline: string;
  } {
    const elapsedHours =
      (now - new Date(emp.lastShiftAt).getTime()) / (1000 * 60 * 60);
    const overdue = elapsedHours - emp.cadenceHours;
    if (overdue > 0) {
      return {
        taken: false,
        tone: 'red',
        headline: "DON'T MISS YOUR SHIFT",
        subline: `Overdue ${overdue.toFixed(1)}h`,
      };
    }
    if (overdue > -2) {
      return {
        taken: false,
        tone: 'yellow',
        headline: 'Shift due soon',
        subline: `DUE in ${(-overdue).toFixed(1)}h`,
      };
    }
    return {
      taken: true,
      tone: 'green',
      headline: "Today's shift: DONE",
      subline: `Next shift in ${Math.max(0, -overdue).toFixed(0)}h`,
    };
  }

  const toneRank: Record<'red' | 'yellow' | 'green', number> = { red: 0, yellow: 1, green: 2 };
  const sortedActiveJobs = [...activeJobs].sort(
    (a, b) => toneRank[shiftStatus(a).tone] - toneRank[shiftStatus(b).tone],
  );
  const shiftCounts = activeJobs.reduce(
    (acc, emp) => {
      const tone = shiftStatus(emp).tone;
      if (tone === 'red') acc.overdue += 1;
      else if (tone === 'yellow') acc.due += 1;
      else acc.done += 1;
      return acc;
    },
    { overdue: 0, due: 0, done: 0 },
  );
  const pendingShifts = shiftCounts.overdue + shiftCounts.due;
  const shiftSummaryTone: 'red' | 'yellow' | 'green' =
    shiftCounts.overdue > 0 ? 'red' : shiftCounts.due > 0 ? 'yellow' : 'green';
  const shiftSummaryClass =
    shiftSummaryTone === 'red'
      ? 'border-heliora-red/40 bg-heliora-red/10 text-heliora-red'
      : shiftSummaryTone === 'yellow'
        ? 'border-heliora-yellow/40 bg-heliora-yellow/10 text-heliora-yellow'
        : 'border-heliora-green/40 bg-heliora-green/10 text-heliora-green';

  function renderOpportunityCard(
    opp: OpportunityDefinition,
    accent: 'cyan' | 'yellow' | 'orange',
  ) {
    const requirements = (opp.requirements as RequirementEntry[]) ?? [];
    const questData = opp.questData;
    const requirementsMet = character
      ? requirements.every((requirement) => {
          if (requirement.type === 'CREDITS_MIN') return character.credits >= requirement.value;
          if (requirement.type === 'STAT_MIN' && requirement.key) {
            const stat =
              (character[requirement.key as keyof typeof character] as number | undefined) ?? 0;
            return stat >= requirement.value;
          }
          return true;
        })
      : true;
    const cannotTakeAnotherJob =
      opp.kind === 'JOB' && !employedOpportunityIds.has(opp.id) && activeJobs.length > 0;
    const tooExhausted = Boolean(
      character && typeof opp.energyCost === 'number' && character.energy < opp.energyCost,
    );
    const hoverClass =
      accent === 'cyan'
        ? 'hover:border-heliora-cyan/40'
        : accent === 'yellow'
          ? 'hover:border-heliora-yellow/40'
          : 'hover:border-heliora-orange/40';

    return (
      <div
        key={opp.id}
        className={`rounded border p-3 transition-colors ${
          requirementsMet
            ? `border-heliora-border bg-heliora-dark ${hoverClass}`
            : 'border-heliora-border/40 bg-heliora-dark/50 opacity-70'
        }`}
      >
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KindBadge kind={opp.kind} />
            <span className="text-xs text-heliora-text-dim">{opp.type}</span>
          </div>
          <Tooltip content={formatOpportunityCheckHint(opp)}>
            <span className="text-xs text-heliora-text-dim">DC {opp.difficulty}</span>
          </Tooltip>
        </div>
        <h3 className="mb-1 text-sm font-bold text-heliora-text">{opp.title}</h3>
        <p className="mb-2 line-clamp-3 text-xs text-heliora-text-dim">{opp.description}</p>
        {opp.kind === 'QUEST' && questData?.stepNumber && questData?.totalSteps && (
          <div className="mb-2 text-[11px] font-mono text-heliora-cyan">
            Chain progress {questData.stepNumber}/{questData.totalSteps}
          </div>
        )}
        {opp.kind === 'QUEST' && questData?.hint && (
          <div className="mb-2 text-[11px] text-heliora-text-dim">Hint: {questData.hint}</div>
        )}
        <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className="text-heliora-text-dim">⏱ {opp.durationMinutes ?? '?'}m</span>
          {typeof opp.energyCost === 'number' && (
            <Tooltip content="Energy spent when you accept this activity. Rest to recover.">
              <span className={tooExhausted ? 'font-bold text-heliora-red' : 'text-heliora-text-dim'}>
                ⚡ -{opp.energyCost}
              </span>
            </Tooltip>
          )}
          {(opp.rewards as RewardEntry[]).map((reward, index) => {
            if (reward.type === 'CREDITS') {
              return (
                <Tooltip
                  key={`${opp.id}-reward-${index}`}
                  content={describeRewardTooltip(
                    reward as unknown as Record<string, unknown>,
                    rewardReferenceLookup,
                  )}
                >
                  <span className="font-bold text-heliora-green">
                    {formatRewardBadgeLabel(
                      reward as unknown as Record<string, unknown>,
                      rewardReferenceLookup,
                    )}
                  </span>
                </Tooltip>
              );
            }
            if (reward.type === 'FACTION_REPUTATION') {
              return (
                <Tooltip
                  key={`${opp.id}-reward-${index}`}
                  content={describeRewardTooltip(
                    reward as unknown as Record<string, unknown>,
                    rewardReferenceLookup,
                  )}
                >
                  <span className="text-heliora-yellow">
                    {formatRewardBadgeLabel(
                      reward as unknown as Record<string, unknown>,
                      rewardReferenceLookup,
                    )}
                  </span>
                </Tooltip>
              );
            }
            if (reward.type === 'CORPORATION_REPUTATION') {
              return (
                <Tooltip
                  key={`${opp.id}-reward-${index}`}
                  content={describeRewardTooltip(
                    reward as unknown as Record<string, unknown>,
                    rewardReferenceLookup,
                  )}
                >
                  <span className="text-heliora-cyan">
                    {formatRewardBadgeLabel(
                      reward as unknown as Record<string, unknown>,
                      rewardReferenceLookup,
                    )}
                  </span>
                </Tooltip>
              );
            }
            if (reward.type === 'STAT_XP') {
              return (
                <Tooltip
                  key={`${opp.id}-reward-${index}`}
                  content={describeRewardTooltip(
                    reward as unknown as Record<string, unknown>,
                    rewardReferenceLookup,
                  )}
                >
                  <span className="text-heliora-orange">
                    {formatRewardBadgeLabel(
                      reward as unknown as Record<string, unknown>,
                      rewardReferenceLookup,
                    )}
                  </span>
                </Tooltip>
              );
            }
            if (reward.type === 'ITEM') {
              return (
                <Tooltip
                  key={`${opp.id}-reward-${index}`}
                  content={describeRewardTooltip(
                    reward as unknown as Record<string, unknown>,
                    rewardReferenceLookup,
                  )}
                >
                  <span className="text-heliora-cyan">
                    {formatRewardBadgeLabel(
                      reward as unknown as Record<string, unknown>,
                      rewardReferenceLookup,
                    )}
                  </span>
                </Tooltip>
              );
            }
            return null;
          })}
        </div>
        {requirements.length > 0 && (
          <div
            className={`mb-2 border-t pt-2 text-xs ${
              requirementsMet
                ? 'border-heliora-border text-heliora-yellow'
                : 'border-heliora-red/30 text-heliora-red'
            }`}
          >
            Req:{' '}
            {requirements
              .map((requirement) => `${requirement.key ?? requirement.type} ≥ ${requirement.value}`)
              .join(', ')}
          </div>
        )}
        {opp.kind === 'JOB' && !employedOpportunityIds.has(opp.id) ? (
          <button
            onClick={() => void hire(opp)}
            disabled={hiringFor === opp.id || !requirementsMet || cannotTakeAnotherJob}
            className="w-full rounded border border-heliora-yellow/50 bg-heliora-yellow/20 px-3 py-1.5 text-xs font-mono font-bold text-heliora-yellow transition-colors hover:bg-heliora-yellow/30 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {hiringFor === opp.id
              ? 'HIRING…'
              : !requirementsMet
                ? 'LOCKED'
                : cannotTakeAnotherJob
                  ? 'JOB SLOT FULL'
                  : 'GET HIRED'}
          </button>
        ) : (
          <button
            onClick={() => void accept(opp)}
            disabled={accepting === opp.id || !requirementsMet || hasActiveActivity || tooExhausted}
            title={
              hasActiveActivity
                ? 'Finish your current activity first'
                : tooExhausted
                  ? `You need ${opp.energyCost} energy — rest at a safehouse, clinic, or hub first`
                  : undefined
            }
            className={`w-full rounded border px-3 py-1.5 text-xs font-mono font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
              accent === 'cyan'
                ? 'border-heliora-cyan/50 bg-heliora-cyan/20 text-heliora-cyan hover:bg-heliora-cyan/30'
                : accent === 'yellow'
                  ? 'border-heliora-yellow/50 bg-heliora-yellow/20 text-heliora-yellow hover:bg-heliora-yellow/30'
                  : 'border-heliora-orange/50 bg-heliora-orange/20 text-heliora-orange hover:bg-heliora-orange/30'
            }`}
          >
            {accepting === opp.id
              ? 'ACCEPTING…'
              : !requirementsMet
                ? 'LOCKED'
                : hasActiveActivity
                  ? 'BUSY'
                  : tooExhausted
                    ? 'EXHAUSTED'
                    : opp.kind === 'JOB'
                      ? 'WORK SHIFT'
                      : 'ACCEPT'}
          </button>
        )}
      </div>
    );
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

      {activeJobs.length > 0 && (
        <div
          className={`rounded border px-3 py-2 text-sm font-mono ${shiftSummaryClass}`}
        >
          {pendingShifts > 0
            ? `${pendingShifts} of ${activeJobs.length} shift${activeJobs.length === 1 ? '' : 's'} pending`
            : `All ${activeJobs.length} shift${activeJobs.length === 1 ? '' : 's'} done — keep it up`}
        </div>
      )}

      {inProgress.length > 0 && (
        <Panel title={`Active (${inProgress.length})`} accent="cyan">
          <div className="space-y-2">
            {inProgress.map((inst) => {
              const completesAtMs = new Date(inst.completesAt).getTime();
              const startedAtMs = new Date(inst.startedAt).getTime();
              const isReady = completesAtMs <= now;
              const isRest = isRestActivity(inst);
              const rest = getRestProgress(inst);
              const acceptedDescription = getAcceptedDescription(inst);
              const timelineEvent = getTimelineEventDescription(inst, now);
              const remaining = Math.max(
                0,
                Math.floor((completesAtMs - now) / 1000),
              );
              const total = Math.max(
                1,
                Math.floor((completesAtMs - startedAtMs) / 1000),
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
                      {!isRest && (
                        <Tooltip content={formatOpportunityCheckHint(inst.definition)}>
                          <span className="rounded border border-heliora-border px-2 py-0.5 text-[10px] text-heliora-text-dim">
                            DC {inst.definition.difficulty}
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    {isReady ? (
                      <button
                        onClick={() => void resolve(inst.id)}
                        disabled={resolving === inst.id}
                        className="px-3 py-1 bg-heliora-green/20 border border-heliora-green/50 rounded text-heliora-green text-xs font-mono font-bold hover:bg-heliora-green/30 disabled:opacity-50"
                      >
                        {resolving === inst.id ? '…' : isRest ? 'FINISH REST' : 'RESOLVE'}
                      </button>
                    ) : isRest ? (
                      <button
                        onClick={() => void stopRest()}
                        className="px-3 py-1 rounded border border-heliora-yellow/50 bg-heliora-yellow/10 text-heliora-yellow text-xs font-mono font-bold hover:bg-heliora-yellow/20"
                      >
                        STOP REST
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
                  {acceptedDescription && (
                    <p className="mt-2 text-xs text-heliora-text-dim">
                      {acceptedDescription}
                    </p>
                  )}
                  {timelineEvent && (
                    <div className="mt-2 rounded border border-heliora-cyan/20 bg-black/10 px-3 py-2 text-xs text-heliora-text">
                      <span className="mr-2 uppercase tracking-wider text-heliora-cyan/80">
                        Live update
                      </span>
                      {timelineEvent}
                    </div>
                  )}
                  {isRest && rest && (
                    <p className="mt-2 text-[11px] text-heliora-text-dim">
                      {rest.buildingName ?? 'Current building'} · +{rest.energyPerMinute ?? 0} EN/min
                      {rest.healthPerMinute ? ` · +${rest.healthPerMinute} HP/min` : ''}
                    </p>
                  )}
                  {inst.definition.questData?.hint && (
                    <p className="mt-1 text-[11px] text-heliora-text-dim">
                      Hint: {inst.definition.questData.hint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {activeJobs.length > 0 && (
        <Panel title={`Jobs (${activeJobs.length})`} accent="yellow">
          <div className="space-y-2">
            {sortedActiveJobs.map((emp) => {
              const status = shiftStatus(emp);
              const pillClass =
                status.tone === 'red'
                  ? 'text-heliora-red border-heliora-red/40 bg-heliora-red/10'
                  : status.tone === 'yellow'
                    ? 'text-heliora-yellow border-heliora-yellow/40 bg-heliora-yellow/10'
                    : 'text-heliora-green border-heliora-green/40 bg-heliora-green/10';
              const cardClass =
                status.tone === 'red'
                  ? 'border-heliora-red/40 bg-heliora-red/5'
                  : status.tone === 'yellow'
                    ? 'border-heliora-yellow/40 bg-heliora-yellow/5'
                    : 'border-heliora-green/30 bg-heliora-green/5';
              const headlineClass =
                status.tone === 'red'
                  ? 'text-heliora-red'
                  : status.tone === 'yellow'
                    ? 'text-heliora-yellow'
                    : 'text-heliora-green';
              return (
                <div key={emp.id} className={`border rounded p-3 ${cardClass}`}>
                  <div
                    className={`mb-2 text-sm font-mono font-bold tracking-wider ${headlineClass}`}
                  >
                    {status.headline}
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <KindBadge kind="JOB" />
                      <span className="text-heliora-text font-mono text-sm font-bold">
                        {emp.opportunity.title}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 border rounded ${pillClass}`}
                    >
                      {status.subline}
                    </span>
                  </div>
                  {!status.taken && (
                    <div
                      className={`mb-2 rounded border px-2 py-1 text-[11px] font-mono ${pillClass}`}
                    >
                      Don't miss your shift — accept the JOB opportunity below to complete it.
                    </div>
                  )}
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

      {available.length === 0 ? (
        <Panel title="Available Opportunities" accent="orange">
          <p className="text-heliora-text-dim text-sm py-4 text-center">
            No opportunities available right now. Try again after the next world tick.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title={`Quest Board (${availableQuests.length})`} accent="cyan" glow>
            {availableQuests.length === 0 ? (
              <p className="py-4 text-center text-sm text-heliora-text-dim">
                No quests are currently unlocked for this operator.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {availableQuests.map((opp) => renderOpportunityCard(opp, 'cyan'))}
              </div>
            )}
          </Panel>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title={`Gig Board (${availableGigs.length})`} accent="orange">
              {availableGigs.length === 0 ? (
                <p className="py-4 text-center text-sm text-heliora-text-dim">
                  No gigs are on the wire right now.
                </p>
              ) : (
                <div className="space-y-3">
                  {availableGigs.map((opp) => renderOpportunityCard(opp, 'orange'))}
                </div>
              )}
            </Panel>

            <Panel title={`Job Board (${availableJobs.length})`} accent="yellow">
              <p className="mb-3 text-[11px] text-heliora-text-dim">
                Only one active job may be held at a time.
              </p>
              {availableJobs.length === 0 ? (
                <p className="py-4 text-center text-sm text-heliora-text-dim">
                  No job openings are currently posted.
                </p>
              ) : (
                <div className="space-y-3">
                  {availableJobs.map((opp) => renderOpportunityCard(opp, 'yellow'))}
                </div>
              )}
            </Panel>
          </div>
        </>
      )}

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
