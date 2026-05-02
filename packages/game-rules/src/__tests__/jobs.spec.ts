import {
  evaluateJobShift,
  shouldEvaluateForStrike,
  STRIKES_BEFORE_FIRED,
  STRIKE_PENALTY_RATIO,
} from '../jobs';

const HOUR = 60 * 60 * 1000;

describe('shouldEvaluateForStrike', () => {
  it('returns false when within cadence window', () => {
    const now = new Date('2026-05-01T12:00:00Z');
    const lastShift = new Date(now.getTime() - 23 * HOUR);
    expect(shouldEvaluateForStrike(now, lastShift, 24)).toBe(false);
  });

  it('returns true when past cadence window', () => {
    const now = new Date('2026-05-01T12:00:00Z');
    const lastShift = new Date(now.getTime() - 25 * HOUR);
    expect(shouldEvaluateForStrike(now, lastShift, 24)).toBe(true);
  });
});

describe('evaluateJobShift', () => {
  const baseInput = {
    cadenceHours: 24,
    strikes: 0,
    shiftSalary: 200,
  };

  it('returns no strike when shift is on time', () => {
    const now = new Date('2026-05-01T12:00:00Z');
    const lastShiftAt = new Date(now.getTime() - 12 * HOUR);
    const result = evaluateJobShift({ ...baseInput, now, lastShiftAt });
    expect(result.shouldStrike).toBe(false);
    expect(result.newStrikes).toBe(0);
    expect(result.newStatus).toBe('ACTIVE');
    expect(result.penaltyCredits).toBe(0);
  });

  it('issues a strike when overdue', () => {
    const now = new Date('2026-05-01T12:00:00Z');
    const lastShiftAt = new Date(now.getTime() - 30 * HOUR);
    const result = evaluateJobShift({ ...baseInput, now, lastShiftAt });
    expect(result.shouldStrike).toBe(true);
    expect(result.newStrikes).toBe(1);
    expect(result.newStatus).toBe('ACTIVE');
    expect(result.penaltyCredits).toBe(Math.round(baseInput.shiftSalary * STRIKE_PENALTY_RATIO));
    expect(result.hoursOverdue).toBeCloseTo(6, 1);
  });

  it('fires the worker on the third strike', () => {
    const now = new Date('2026-05-01T12:00:00Z');
    const lastShiftAt = new Date(now.getTime() - 100 * HOUR);
    const result = evaluateJobShift({
      ...baseInput,
      strikes: STRIKES_BEFORE_FIRED - 1,
      now,
      lastShiftAt,
    });
    expect(result.shouldStrike).toBe(true);
    expect(result.newStrikes).toBe(STRIKES_BEFORE_FIRED);
    expect(result.newStatus).toBe('FIRED');
  });

  it('clamps penalty at zero for non-paying jobs', () => {
    const now = new Date('2026-05-01T12:00:00Z');
    const lastShiftAt = new Date(now.getTime() - 30 * HOUR);
    const result = evaluateJobShift({
      ...baseInput,
      shiftSalary: 0,
      now,
      lastShiftAt,
    });
    expect(result.shouldStrike).toBe(true);
    expect(result.penaltyCredits).toBe(0);
  });
});
