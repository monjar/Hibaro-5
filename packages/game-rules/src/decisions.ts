import { CharacterStats } from './types';

/**
 * Interactive decision points inside an in-progress activity.
 *
 * A timeline event may carry `choices`. Once the activity clock passes the
 * event's minute, the player is prompted to pick one. Choices can cost
 * credits, require a stat check, and shift the final d20 outcome of the
 * activity via roll bonuses/penalties — so a doomed run can be saved by a
 * sharp mid-mission call, and checking back in mid-activity matters.
 */

export interface DecisionEffects {
  /** Added to the final check total when the activity resolves. */
  rollBonus?: number;
  /** Bonus credits paid on top of rewards if the activity succeeds. */
  creditsBonus?: number;
  /** Applied to the character immediately when the decision resolves. */
  wantedDelta?: number;
  healthDelta?: number;
  /** Narrative line shown after choosing. */
  note?: string;
}

export interface TimelineChoice {
  id: string;
  label: string;
  /** Charged immediately when the choice is made; choice is invalid if unaffordable. */
  costCredits?: number;
  /** Optional d20 stat check deciding between effects and failEffects. */
  statCheck?: { stat: keyof CharacterStats; dc: number };
  effects?: DecisionEffects;
  failEffects?: DecisionEffects;
}

export interface DecisionTimelineEvent {
  minute: number;
  description?: string;
  successDescription?: string;
  failureDescription?: string;
  choices?: TimelineChoice[];
}

export interface DecisionRecord {
  minute: number;
  choiceId: string;
  checkRoll?: number;
  checkTotal?: number;
  checkDc?: number;
  checkPassed?: boolean;
  appliedEffects: DecisionEffects;
  decidedAt: string;
}

/** Timeline events whose decision window is open and unanswered. */
export function getPendingDecisionEvents(
  timelineEvents: DecisionTimelineEvent[] | null | undefined,
  startedAtMs: number,
  nowMs: number,
  decisions: DecisionRecord[] | null | undefined,
): DecisionTimelineEvent[] {
  if (!Array.isArray(timelineEvents)) return [];
  const answered = new Set((decisions ?? []).map((decision) => decision.minute));
  const elapsedMinutes = Math.floor(Math.max(0, nowMs - startedAtMs) / 60_000);
  return timelineEvents.filter(
    (event) =>
      Array.isArray(event.choices) &&
      event.choices.length > 0 &&
      event.minute <= elapsedMinutes &&
      !answered.has(event.minute),
  );
}

export interface ChoiceResolution {
  checkRoll?: number;
  checkTotal?: number;
  checkDc?: number;
  checkPassed?: boolean;
  appliedEffects: DecisionEffects;
}

/**
 * Resolve a choice into applied effects. When the choice has a statCheck the
 * character's effective stat modifier (stat / 10, same scale as opportunity
 * checks) plus a d20 decides between effects and failEffects.
 */
export function resolveChoice(
  choice: TimelineChoice,
  character: CharacterStats,
  random: () => number = Math.random,
): ChoiceResolution {
  if (!choice.statCheck) {
    return { appliedEffects: choice.effects ?? {} };
  }

  const statValue = Number(character[choice.statCheck.stat] ?? 0);
  const statModifier = Math.round((statValue / 10) * 10) / 10;
  const roll = Math.floor(random() * 20) + 1;
  const total = roll + statModifier;
  const passed = roll === 20 || (roll !== 1 && total >= choice.statCheck.dc);

  return {
    checkRoll: roll,
    checkTotal: Math.round(total * 10) / 10,
    checkDc: choice.statCheck.dc,
    checkPassed: passed,
    appliedEffects: (passed ? choice.effects : choice.failEffects) ?? {},
  };
}

export function totalDecisionRollBonus(decisions: DecisionRecord[] | null | undefined): number {
  return (decisions ?? []).reduce(
    (sum, decision) => sum + (decision.appliedEffects?.rollBonus ?? 0),
    0,
  );
}

export function totalDecisionCreditsBonus(
  decisions: DecisionRecord[] | null | undefined,
): number {
  return (decisions ?? []).reduce(
    (sum, decision) => sum + (decision.appliedEffects?.creditsBonus ?? 0),
    0,
  );
}

/**
 * Recompute an activity's final success from its pre-rolled d20 and the
 * accumulated decision roll bonuses. Natural 20 always succeeds, natural 1
 * always fails; otherwise decisions can rescue a failed roll or (with
 * penalties) sink a successful one.
 */
export function computeFinalSuccess(
  planned: { roll: number; checkTotal: number; difficultyClass: number },
  rollBonus: number,
): { success: boolean; adjustedTotal: number } {
  const adjustedTotal = Math.round((planned.checkTotal + rollBonus) * 10) / 10;
  if (planned.roll === 20) return { success: true, adjustedTotal };
  if (planned.roll === 1) return { success: false, adjustedTotal };
  return { success: adjustedTotal >= planned.difficultyClass, adjustedTotal };
}
