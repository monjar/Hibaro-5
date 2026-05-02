export type JobEmploymentStatus = 'ACTIVE' | 'FIRED' | 'QUIT';

export const STRIKES_BEFORE_FIRED = 3;
export const DEFAULT_SHIFT_CADENCE_HOURS = 24;
export const STRIKE_PENALTY_RATIO = 0.5;

export interface JobShiftEvaluationInput {
  now: Date;
  lastShiftAt: Date;
  cadenceHours: number;
  strikes: number;
  shiftSalary: number;
}

export interface JobShiftEvaluation {
  shouldStrike: boolean;
  newStrikes: number;
  newStatus: JobEmploymentStatus;
  penaltyCredits: number;
  hoursOverdue: number;
}

export function evaluateJobShift(input: JobShiftEvaluationInput): JobShiftEvaluation {
  const elapsedHours = (input.now.getTime() - input.lastShiftAt.getTime()) / (1000 * 60 * 60);
  const overdueHours = elapsedHours - input.cadenceHours;
  const shouldStrike = overdueHours > 0;

  if (!shouldStrike) {
    return {
      shouldStrike: false,
      newStrikes: input.strikes,
      newStatus: 'ACTIVE',
      penaltyCredits: 0,
      hoursOverdue: 0,
    };
  }

  const newStrikes = input.strikes + 1;
  const newStatus: JobEmploymentStatus =
    newStrikes >= STRIKES_BEFORE_FIRED ? 'FIRED' : 'ACTIVE';
  const penaltyCredits = Math.max(0, Math.round(input.shiftSalary * STRIKE_PENALTY_RATIO));

  return {
    shouldStrike: true,
    newStrikes,
    newStatus,
    penaltyCredits,
    hoursOverdue: Math.round(overdueHours * 100) / 100,
  };
}

export function shouldEvaluateForStrike(
  now: Date,
  lastShiftAt: Date,
  cadenceHours: number,
): boolean {
  const elapsedMs = now.getTime() - lastShiftAt.getTime();
  return elapsedMs > cadenceHours * 60 * 60 * 1000;
}
