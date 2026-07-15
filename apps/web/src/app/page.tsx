'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { useCharacter, useNow } from '@/lib/use-character';
import { useEventStream } from '@/lib/use-event-stream';
import { Panel } from '@/components/Panel';
import { Tooltip } from '@/components/Tooltip';
import { StatBar, StatPill } from '@/components/StatBar';
import { KindBadge, StatusBadge } from '@/components/KindBadge';
import {
  describeRewardTooltip,
  describeWorldEventEffects,
  formatRewardBadgeLabel,
  formatOpportunityCheckHint,
  formatUiError,
} from '@/lib/ui-presenters';
import {
  getAcceptedDescription,
  getDecisions,
  getPendingDecisionEvent,
  getRestProgress,
  getTimelineEventDescription,
  isRestActivity,
} from '@/lib/opportunity-activity';
import { useRewardReferenceLookup } from '@/lib/use-reward-reference-lookup';
import type {
  ActivityLog,
  DailyStatus,
  OpportunityDefinition,
  OpportunityInstance,
  WorldEvent,
} from '@heliora/platform-sdk';

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
  LEVEL_UP: '⬆️',
  STAT_TRAINED: '🏋️',
  DECISION_MADE: '🎲',
  COMBAT_EVENT: '⚔️',
  DAILY_CLAIMED: '📦',
  ACHIEVEMENT_EARNED: '🏆',
};

export default function HomePage() {
  const session = useAuthGuard();
  const { character, refresh } = useCharacter();
  const [instances, setInstances] = useState<OpportunityInstance[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [availableQuests, setAvailableQuests] = useState<OpportunityDefinition[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [pendingAlloc, setPendingAlloc] = useState<Record<string, number>>({});
  const [training, setTraining] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyStatus | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const now = useNow();
  const rewardReferenceLookup = useRewardReferenceLookup();

  const refreshAll = useCallback(async () => {
    if (!session.characterId || !session.player?.id) return;
    try {
      const [inst, act, events, available, dailyStatus] = await Promise.all([
        api.getOpportunityInstances(session.characterId),
        api.getActivity(session.player.id, 1, 12),
        api.getActiveWorldEvents(),
        api.getAvailableOpportunities(session.characterId),
        api.getDailyStatus(session.player.id),
      ]);
      setInstances(inst);
      setActivity(act.logs);
      setWorldEvents(events);
      setAvailableQuests(available.filter((opportunity) => opportunity.kind === 'QUEST'));
      setDaily(dailyStatus);
      await refresh();
    } catch {
      // soft fail
    }
  }, [refresh, session.characterId, session.player?.id]);

  const handleTick = useCallback(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!session.characterId) return;
    void refreshAll();
  }, [refreshAll, session.characterId]);

  useEventStream(['simulation.tick.completed'], handleTick, Boolean(session.characterId));

  async function resolveInstance(instanceId: string) {
    setResolving(instanceId);
    setMessage('');
    try {
      const result = (await api.resolveOpportunity(instanceId)) as {
        outcome?: {
          success?: boolean;
          appliedRewards?: Array<{ type: string; value: number }>;
          progression?: { xpGained?: number; levelsGained?: number; level?: number };
        };
        definition?: { title?: string };
      };
      const outcome = result.outcome;
      const credits = outcome?.appliedRewards?.find((r) => r.type === 'CREDITS');
      const xpNote = outcome?.progression?.xpGained ? ` · +${outcome.progression.xpGained} XP` : '';
      const levelNote =
        (outcome?.progression?.levelsGained ?? 0) > 0
          ? ` · ⬆ LEVEL UP! Now level ${outcome?.progression?.level}`
          : '';
      if (outcome?.success) {
        setMessage(
          `✅ ${result.definition?.title ?? 'Job'} succeeded${credits ? ` — +$${credits.value}` : ''}${xpNote}${levelNote}`,
        );
      } else {
        setMessage(`❌ ${result.definition?.title ?? 'Job'} failed${xpNote}${levelNote}`);
      }
      await refreshAll();
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setResolving(null);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function claimDaily() {
    if (!session.player?.id) return;
    setClaimingDaily(true);
    setMessage('');
    try {
      const result = await api.claimDaily(session.player.id);
      const levelNote = result.levelUp
        ? ` · ⬆ LEVEL UP! Now level ${result.levelUp.level}`
        : '';
      setMessage(
        `✅ Supply drop claimed: +$${result.reward.credits}, +${result.reward.xp} XP (streak ${result.streak})${levelNote}`,
      );
      await refreshAll();
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setClaimingDaily(false);
      setTimeout(() => setMessage(''), 7000);
    }
  }

  async function decide(instanceId: string, minute: number, choiceId: string) {
    setDeciding(`${instanceId}:${minute}:${choiceId}`);
    setMessage('');
    try {
      const result = await api.decideOpportunity(instanceId, minute, choiceId);
      const effects = result.decision.appliedEffects;
      const parts: string[] = [];
      if (result.decision.checkPassed !== undefined) {
        parts.push(
          result.decision.checkPassed
            ? `check passed (${result.decision.checkRoll} + mod vs DC ${result.decision.checkDc})`
            : `check failed (${result.decision.checkRoll} + mod vs DC ${result.decision.checkDc})`,
        );
      }
      if (effects.rollBonus) {
        parts.push(`${effects.rollBonus > 0 ? '+' : ''}${effects.rollBonus} to the final check`);
      }
      if (effects.creditsBonus) parts.push(`+$${effects.creditsBonus} bonus on success`);
      if (effects.wantedDelta) parts.push(`wanted ${effects.wantedDelta > 0 ? '+' : ''}${effects.wantedDelta}`);
      if (effects.healthDelta) parts.push(`health ${effects.healthDelta > 0 ? '+' : ''}${effects.healthDelta}`);
      const summary = parts.length ? ` — ${parts.join(', ')}` : '';
      setMessage(`✅ ${effects.note ?? 'Call made.'}${summary}`);
      await refreshAll();
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setDeciding(null);
      setTimeout(() => setMessage(''), 8000);
    }
  }

  async function trainStats() {
    if (!session.characterId || Object.keys(pendingAlloc).length === 0) return;
    setTraining(true);
    setMessage('');
    try {
      await api.allocateStatPoints(session.characterId, pendingAlloc);
      setPendingAlloc({});
      setMessage('✅ Training complete');
      await refresh();
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setTraining(false);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function stopRest() {
    if (!session.characterId) return;
    setMessage('');
    try {
      await api.stopRest(session.characterId);
      setMessage('✅ Rest interrupted');
      await refreshAll();
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setTimeout(() => setMessage(''), 5000);
    }
  }

  if (!session.ready || !session.token) {
    return <main className="max-w-7xl mx-auto px-4 py-12 text-heliora-text-dim">Loading…</main>;
  }
  if (!character) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-12 text-heliora-text-dim">
        Loading character data…
      </main>
    );
  }

  const inProgress = instances.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'ACCEPTED');
  const activeRest = inProgress.find((instance) => isRestActivity(instance)) ?? null;
  const recentCompleted = instances
    .filter((i) => i.status === 'COMPLETED' || i.status === 'FAILED')
    .slice(0, 5);

  const buildingFunctionality = Array.isArray(character.currentBuilding?.functionality)
    ? (character.currentBuilding?.functionality as string[])
    : [];
  const visibleWorldEvents = worldEvents.filter((event) => {
    if (!event.endsAt) return true;
    return new Date(event.endsAt).getTime() > now;
  });

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

      {daily?.canClaim && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-heliora-green/50 bg-heliora-green/10 p-3">
          <div className="text-sm font-mono text-heliora-green">
            📦 Daily supply drop ready — +${daily.nextReward.credits} and +{daily.nextReward.xp} XP
            {daily.nextStreak > 1 ? ` (streak ${daily.nextStreak})` : ''}
          </div>
          <button
            onClick={() => void claimDaily()}
            disabled={claimingDaily}
            className="rounded border border-heliora-green/60 bg-heliora-green/20 px-4 py-1.5 text-xs font-mono font-bold text-heliora-green hover:bg-heliora-green/30 disabled:opacity-50"
          >
            {claimingDaily ? 'CLAIMING…' : 'CLAIM'}
          </button>
        </div>
      )}
      {daily && !daily.canClaim && daily.currentStreak > 0 && (
        <p className="text-[11px] font-mono text-heliora-text-dim">
          📦 Daily supply drop claimed · streak {daily.currentStreak} · come back tomorrow (48h
          grace before the streak resets)
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Operator" accent="cyan" glow>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-heliora-cyan text-2xl font-bold font-mono">{character.name}</h2>
              <span className="rounded border border-heliora-yellow/50 bg-heliora-yellow/10 px-1.5 py-0.5 text-xs font-mono font-bold text-heliora-yellow">
                LVL {character.level ?? 1}
              </span>
            </div>
            <p className="text-heliora-text-dim text-xs">
              {session.player?.username} ∷ {character.type}
            </p>
          </div>
          {character.progression && !character.progression.atMaxLevel && (
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-[11px] font-mono text-heliora-text-dim">
                <span>XP</span>
                <span>
                  {character.progression.xpIntoLevel} / {character.progression.xpForNextLevel}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded bg-heliora-dark border border-heliora-border">
                <div
                  className="h-full bg-heliora-yellow transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      100,
                      (character.progression.xpIntoLevel /
                        Math.max(1, character.progression.xpForNextLevel ?? 1)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
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
            {(
              [
                ['STR', 'strength', character.strength],
                ['AGI', 'agility', character.agility],
                ['INT', 'intelligence', character.intelligence],
                ['CHA', 'charisma', character.charisma],
                ['HACK', 'hacking', character.hacking],
                ['CMB', 'combat', character.combat],
                ['STH', 'stealth', character.stealth],
                ['ENG', 'engineering', character.engineering],
              ] as Array<[string, string, number]>
            ).map(([label, key, value]) => (
              <div key={key} className="relative">
                <StatPill label={label} value={value + (pendingAlloc[key] ?? 0)} />
                {(character.unspentStatPoints ?? 0) > 0 && (
                  <button
                    onClick={() =>
                      setPendingAlloc((prev) => {
                        const queued = Object.values(prev).reduce((sum, n) => sum + n, 0);
                        if (queued >= (character.unspentStatPoints ?? 0)) return prev;
                        if (value + (prev[key] ?? 0) >= 20) return prev;
                        return { ...prev, [key]: (prev[key] ?? 0) + 1 };
                      })
                    }
                    className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-heliora-yellow/60 bg-heliora-yellow/20 text-[10px] font-bold leading-none text-heliora-yellow hover:bg-heliora-yellow/40"
                    title={`Train ${label}`}
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>
          {(character.unspentStatPoints ?? 0) > 0 && (
            <div className="mt-3 rounded border border-heliora-yellow/40 bg-heliora-yellow/10 p-2 text-xs">
              <div className="mb-2 font-mono font-bold text-heliora-yellow">
                ⬆{' '}
                {(character.unspentStatPoints ?? 0) -
                  Object.values(pendingAlloc).reduce((sum, n) => sum + n, 0)}{' '}
                stat point(s) available — click + on a stat to queue training
              </div>
              {Object.keys(pendingAlloc).length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => void trainStats()}
                    disabled={training}
                    className="rounded border border-heliora-yellow/60 bg-heliora-yellow/20 px-3 py-1 font-mono font-bold text-heliora-yellow hover:bg-heliora-yellow/30 disabled:opacity-40"
                  >
                    {training ? 'TRAINING…' : 'CONFIRM TRAINING'}
                  </button>
                  <button
                    onClick={() => setPendingAlloc({})}
                    disabled={training}
                    className="rounded border border-heliora-border px-3 py-1 font-mono text-heliora-text-dim hover:text-heliora-text disabled:opacity-40"
                  >
                    RESET
                  </button>
                </div>
              )}
            </div>
          )}
          {character.equipment && Object.keys(character.equipment.bonuses).length > 0 && (
            <div className="mt-3 rounded border border-heliora-cyan/30 bg-heliora-cyan/5 p-2 text-xs font-mono">
              <span className="text-heliora-text-dim">⚔ Gear: </span>
              {Object.entries(character.equipment.bonuses).map(([stat, bonus], index) => (
                <span key={stat} className="text-heliora-cyan">
                  {index > 0 && ' · '}
                  {stat.slice(0, 3).toUpperCase()} +{bonus}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 text-xs text-heliora-text-dim border-t border-heliora-border pt-2">
            Earn XP from every gig, job, and quest. Level-ups grant stat points, plus stat XP still
            grows from matching work (≈50% chance per success). Equipped gear boosts your checks.
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
              onStop={() => void stopRest()}
              hasActiveRest={Boolean(activeRest)}
              hasBlockingActivity={inProgress.length > 0 && !activeRest}
              canRest={buildingFunctionality.some(
                (f) => f === 'SAFEHOUSE' || f === 'CLINIC' || f === 'HUB',
              )}
            />
          </div>
        </Panel>
      </div>

      {visibleWorldEvents.length > 0 && (
        <Panel title={`Active World Events (${visibleWorldEvents.length})`} accent="red">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleWorldEvents.map((event) => (
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
                  {event.endsAt && ` · ends in ${formatTimeLeft(event.endsAt)}`}
                </p>
                {describeWorldEventEffects(event.effects).length > 0 && (
                  <div className="mt-2 rounded border border-heliora-red/20 bg-black/10 p-2">
                    <p className="text-[10px] uppercase tracking-wider text-heliora-text-dim">
                      World Effects
                    </p>
                    <div className="mt-1 space-y-1 text-xs text-heliora-text-dim">
                      {describeWorldEventEffects(event.effects).map((effect) => (
                        <p key={effect}>{effect}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {availableQuests.length > 0 && (
        <Panel title={`Available Quests (${availableQuests.length})`} accent="cyan" glow>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {availableQuests.slice(0, 4).map((quest) => (
              <div
                key={quest.id}
                className="rounded border border-heliora-cyan/30 bg-heliora-cyan/5 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <KindBadge kind="QUEST" />
                  <span className="text-xs text-heliora-text-dim">{quest.type}</span>
                </div>
                <h3 className="text-sm font-bold text-heliora-cyan">{quest.title}</h3>
                <p className="mt-1 text-xs text-heliora-text-dim">{quest.description}</p>
                {quest.questData?.stepNumber && quest.questData?.totalSteps && (
                  <p className="mt-2 text-[11px] font-mono text-heliora-cyan">
                    Chain progress {quest.questData.stepNumber}/{quest.questData.totalSteps}
                  </p>
                )}
                {quest.questData?.hint && (
                  <p className="mt-1 text-[11px] text-heliora-text-dim">
                    Hint: {quest.questData.hint}
                  </p>
                )}
                <div className="mt-3">
                  <Link
                    href="/opportunities"
                    className="inline-flex rounded border border-heliora-cyan/40 px-3 py-1 text-xs font-mono text-heliora-cyan hover:bg-heliora-cyan/10"
                  >
                    Open quest board
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {inProgress.length > 0 && (
        <Panel title={`In Progress (${inProgress.length})`} accent="cyan">
          <div className="space-y-3">
            {inProgress.map((inst) => {
              const isReady = new Date(inst.completesAt).getTime() <= now;
              const isRest = isRestActivity(inst);
              const rest = getRestProgress(inst);
              const acceptedDescription = getAcceptedDescription(inst);
              const timelineEvent = getTimelineEventDescription(inst, now);
              const pendingDecision = isRest ? null : getPendingDecisionEvent(inst, now);
              const madeDecisions = isRest ? [] : getDecisions(inst);
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
                      {!isRest && (
                        <Tooltip content={formatOpportunityCheckHint(inst.definition)}>
                          <span className="rounded border border-heliora-border px-2 py-0.5 text-[10px] text-heliora-text-dim">
                            DC {inst.definition.difficulty}
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    {acceptedDescription && (
                      <p className="max-w-xl text-xs text-heliora-text-dim">
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
                    {pendingDecision && (
                      <div className="mt-2 rounded border border-heliora-yellow/50 bg-heliora-yellow/10 px-3 py-2">
                        <div className="mb-1 text-xs font-mono font-bold uppercase tracking-wider text-heliora-yellow">
                          ⚠ Decision needed
                        </div>
                        {pendingDecision.description && (
                          <p className="mb-2 text-xs text-heliora-text">
                            {pendingDecision.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {(pendingDecision.choices ?? []).map((choice) => {
                            const busyKey = `${inst.id}:${pendingDecision.minute}:${choice.id}`;
                            const unaffordable =
                              (choice.costCredits ?? 0) > (character?.credits ?? 0);
                            return (
                              <button
                                key={choice.id}
                                onClick={() =>
                                  void decide(inst.id, pendingDecision.minute, choice.id)
                                }
                                disabled={deciding !== null || unaffordable}
                                title={
                                  unaffordable
                                    ? `Needs $${choice.costCredits}`
                                    : choice.statCheck
                                      ? `${choice.statCheck.stat} check vs DC ${choice.statCheck.dc}`
                                      : undefined
                                }
                                className="rounded border border-heliora-yellow/60 bg-heliora-dark px-3 py-1 text-xs font-mono text-heliora-yellow transition-colors hover:bg-heliora-yellow/20 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {deciding === busyKey ? '…' : choice.label}
                                {choice.costCredits ? ` ($${choice.costCredits})` : ''}
                                {choice.statCheck
                                  ? ` [${choice.statCheck.stat.slice(0, 3).toUpperCase()} DC ${choice.statCheck.dc}]`
                                  : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {madeDecisions.length > 0 && (
                      <p className="mt-1 text-[11px] text-heliora-text-dim">
                        {madeDecisions.length} call{madeDecisions.length === 1 ? '' : 's'} made
                        {madeDecisions.some((d) => d.appliedEffects?.rollBonus)
                          ? ` · net ${madeDecisions.reduce((s, d) => s + (d.appliedEffects?.rollBonus ?? 0), 0) >= 0 ? '+' : ''}${madeDecisions.reduce((s, d) => s + (d.appliedEffects?.rollBonus ?? 0), 0)} on the final check`
                          : ''}
                      </p>
                    )}
                    {isRest && rest && (
                      <p className="mt-2 text-[11px] text-heliora-text-dim">
                        {rest.buildingName ?? 'Current building'} · +{rest.energyPerMinute ?? 0} EN/min
                        {rest.healthPerMinute ? ` · +${rest.healthPerMinute} HP/min` : ''}
                      </p>
                    )}
                    {Array.isArray(inst.definition.rewards) && inst.definition.rewards.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(inst.definition.rewards as Array<Record<string, unknown>>).map((reward, index) => (
                          <Tooltip
                            key={`${inst.id}-reward-${index}`}
                            content={describeRewardTooltip(reward, rewardReferenceLookup)}
                          >
                            <span className="rounded border border-heliora-cyan/30 px-2 py-0.5 text-[10px] text-heliora-cyan">
                              {formatRewardBadgeLabel(reward, rewardReferenceLookup)}
                            </span>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                    {inst.definition.questData?.hint && (
                      <p className="mt-1 text-[11px] text-heliora-text-dim">
                        Hint: {inst.definition.questData.hint}
                      </p>
                    )}
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
                      {resolving === inst.id ? '…' : isRest ? 'FINISH REST' : 'RESOLVE'}
                    </button>
                  ) : isRest ? (
                    <button
                      onClick={() => void stopRest()}
                      className="px-3 py-1 border border-heliora-yellow/50 rounded text-heliora-yellow text-xs font-mono font-bold hover:bg-heliora-yellow/10 transition-colors ml-4 shrink-0"
                    >
                      STOP REST
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

function RestButton({
  canRest,
  hasActiveRest,
  hasBlockingActivity,
  onComplete,
  onStop,
}: {
  canRest: boolean;
  hasActiveRest: boolean;
  hasBlockingActivity: boolean;
  onComplete: () => void;
  onStop: () => void;
}) {
  const session = useAuthGuard();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function runRestAction() {
    if (!session.characterId) return;
    setBusy(true);
    setError('');
    try {
      if (hasActiveRest) {
        await api.stopRest(session.characterId);
        onStop();
      } else {
        await api.rest(session.characterId);
        onComplete();
      }
    } catch (e) {
      setError(formatUiError(e));
      setTimeout(() => setError(''), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => void runRestAction()}
        disabled={(!canRest && !hasActiveRest) || hasBlockingActivity || busy}
        className="w-full text-center text-xs text-heliora-green border border-heliora-green/30 rounded py-1 hover:bg-heliora-green/10 disabled:opacity-40 disabled:cursor-not-allowed"
        title={
          hasBlockingActivity
            ? 'Finish the current activity before resting'
            : hasActiveRest
              ? 'Stop the active rest session'
              : canRest
                ? 'Rest at this location'
                : 'Move to a safehouse, clinic, or hub to rest'
        }
      >
        {busy ? '◌' : hasActiveRest ? 'STOP REST' : '☾ REST'}
      </button>
      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 text-[10px] text-heliora-red text-center">
          {error.slice(0, 80)}
        </div>
      )}
    </div>
  );
}
