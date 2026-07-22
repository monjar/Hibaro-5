import type {
  OpportunityDecisionRecord,
  OpportunityInstance,
  OpportunityTimelineEvent,
} from '@heliora/platform-sdk';

type RestProgress = {
  buildingId?: string;
  buildingName?: string;
  energyPerMinute?: number;
  healthPerMinute?: number;
  costPerMinute?: number;
  wantedReductionPerMinute?: number;
  durationMinutes?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getPlannedSuccess(instance: OpportunityInstance) {
  const outcome = asRecord(instance.outcome);
  if (typeof outcome?.success === 'boolean') {
    return outcome.success;
  }

  const progress = asRecord(instance.progress);
  const plannedOutcome = asRecord(progress?.plannedOutcome);
  return typeof plannedOutcome?.success === 'boolean' ? plannedOutcome.success : undefined;
}

export function getRestProgress(instance: OpportunityInstance): RestProgress | null {
  const progress = asRecord(instance.progress);
  const rest = asRecord(progress?.rest);
  return rest as RestProgress | null;
}

export function isRestActivity(instance: OpportunityInstance) {
  return getRestProgress(instance) !== null;
}

export function getAcceptedDescription(instance: OpportunityInstance) {
  return instance.definition.acceptedDescription ?? instance.definition.description ?? null;
}

export function getDecisions(instance: OpportunityInstance): OpportunityDecisionRecord[] {
  const progress = asRecord(instance.progress);
  const decisions = progress?.decisions;
  return Array.isArray(decisions) ? (decisions as OpportunityDecisionRecord[]) : [];
}

/** The oldest unanswered decision point whose minute has passed, if any. */
export function getPendingDecisionEvent(
  instance: OpportunityInstance,
  nowMs: number,
): OpportunityTimelineEvent | null {
  const events = Array.isArray(instance.definition.timelineEvents)
    ? (instance.definition.timelineEvents as OpportunityTimelineEvent[])
    : [];
  if (events.length === 0) return null;

  const startedAtMs = new Date(instance.startedAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor((nowMs - startedAtMs) / 60_000));
  const answered = new Set(getDecisions(instance).map((decision) => decision.minute));

  const pending = events
    .filter(
      (event) =>
        Array.isArray(event.choices) &&
        event.choices.length > 0 &&
        event.minute <= elapsedMinutes &&
        !answered.has(event.minute),
    )
    .sort((left, right) => left.minute - right.minute);

  return pending[0] ?? null;
}

export function getTimelineEventDescription(instance: OpportunityInstance, nowMs: number) {
  const events = Array.isArray(instance.definition.timelineEvents)
    ? [...(instance.definition.timelineEvents as OpportunityTimelineEvent[])]
    : [];
  if (events.length === 0) {
    return null;
  }

  const startedAtMs = new Date(instance.startedAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor((nowMs - startedAtMs) / 60_000));
  const plannedSuccess = getPlannedSuccess(instance);
  const ordered = events.sort((left, right) => left.minute - right.minute);

  let latest: string | null = null;
  for (const event of ordered) {
    if (event.minute > elapsedMinutes) {
      break;
    }

    if (plannedSuccess === true) {
      latest = event.successDescription ?? event.description ?? latest;
    } else if (plannedSuccess === false) {
      latest = event.failureDescription ?? event.description ?? latest;
    } else {
      latest = event.description ?? event.successDescription ?? event.failureDescription ?? latest;
    }
  }

  return latest;
}