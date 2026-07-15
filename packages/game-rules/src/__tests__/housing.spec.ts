import {
  HOUSING_MIN_DAILY_RENT,
  HOUSING_WANTED_REDUCTION_PER_RENT,
  calculateDailyRent,
  evaluateRentCycle,
} from '../housing';

const HOUR = 3_600_000;

describe('calculateDailyRent', () => {
  it('prices by district economy with a danger discount', () => {
    expect(calculateDailyRent({ economyLevel: 5, dangerLevel: 1 })).toBe(47);
    expect(calculateDailyRent({ economyLevel: 8, dangerLevel: 2 })).toBe(62);
    expect(calculateDailyRent({ economyLevel: 2, dangerLevel: 5 })).toBe(HOUSING_MIN_DAILY_RENT);
  });
});

describe('evaluateRentCycle', () => {
  const now = new Date('2026-07-15T12:00:00Z');

  it('does nothing when rent is not due yet', () => {
    const result = evaluateRentCycle(
      { nextRentDueAt: new Date(now.getTime() + HOUR), rentPerDay: 40 },
      { credits: 500, wantedLevel: 2 },
      now,
    );
    expect(result.periodsPaid).toBe(0);
    expect(result.evicted).toBe(false);
    expect(result.creditsAfter).toBe(500);
  });

  it('collects a single due period and reduces wanted level', () => {
    const dueAt = new Date(now.getTime() - HOUR);
    const result = evaluateRentCycle(
      { nextRentDueAt: dueAt, rentPerDay: 40 },
      { credits: 500, wantedLevel: 2 },
      now,
    );
    expect(result.periodsPaid).toBe(1);
    expect(result.totalRent).toBe(40);
    expect(result.creditsAfter).toBe(460);
    expect(result.wantedReduction).toBe(HOUSING_WANTED_REDUCTION_PER_RENT);
    expect(result.evicted).toBe(false);
    expect(result.nextRentDueAt.getTime()).toBe(dueAt.getTime() + 24 * HOUR);
  });

  it('collects multiple missed periods at once', () => {
    const result = evaluateRentCycle(
      { nextRentDueAt: new Date(now.getTime() - 49 * HOUR), rentPerDay: 40 },
      { credits: 500, wantedLevel: 5 },
      now,
    );
    expect(result.periodsPaid).toBe(3);
    expect(result.totalRent).toBe(120);
    expect(result.creditsAfter).toBe(380);
    expect(result.wantedReduction).toBe(3);
  });

  it('caps wanted reduction at the current wanted level', () => {
    const result = evaluateRentCycle(
      { nextRentDueAt: new Date(now.getTime() - 49 * HOUR), rentPerDay: 40 },
      { credits: 500, wantedLevel: 1 },
      now,
    );
    expect(result.wantedReduction).toBe(1);
  });

  it('evicts on the first unaffordable period, keeping prior payments', () => {
    const result = evaluateRentCycle(
      { nextRentDueAt: new Date(now.getTime() - 25 * HOUR), rentPerDay: 40 },
      { credits: 60, wantedLevel: 0 },
      now,
    );
    expect(result.periodsPaid).toBe(1);
    expect(result.creditsAfter).toBe(20);
    expect(result.evicted).toBe(true);
  });

  it('evicts immediately when the first period is unaffordable', () => {
    const result = evaluateRentCycle(
      { nextRentDueAt: new Date(now.getTime() - HOUR), rentPerDay: 40 },
      { credits: 10, wantedLevel: 0 },
      now,
    );
    expect(result.periodsPaid).toBe(0);
    expect(result.evicted).toBe(true);
    expect(result.creditsAfter).toBe(10);
  });
});
