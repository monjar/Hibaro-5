/**
 * Player housing: rent a safehouse for persistent item storage and passive
 * benefits (no energy decay while housed; laying low shaves wanted level on
 * every paid rent cycle).
 */

export const HOUSING_RENT_PERIOD_HOURS = 24;
export const HOUSING_WANTED_REDUCTION_PER_RENT = 1;
export const HOUSING_MIN_DAILY_RENT = 20;

/** Prosperous districts cost more; dangerous ones offer a discount. */
export function calculateDailyRent(district: {
  economyLevel: number;
  dangerLevel: number;
}): number {
  const economy = Number.isFinite(district.economyLevel) ? district.economyLevel : 5;
  const danger = Number.isFinite(district.dangerLevel) ? district.dangerLevel : 1;
  return Math.max(HOUSING_MIN_DAILY_RENT, 20 + economy * 6 - danger * 3);
}

export interface RentCycleResult {
  /** Rent periods that came due and were paid. */
  periodsPaid: number;
  totalRent: number;
  creditsAfter: number;
  wantedReduction: number;
  evicted: boolean;
  nextRentDueAt: Date;
}

/**
 * Settle all due rent periods. Each 24h period is charged as it comes due;
 * the first unaffordable period evicts the tenant (no partial payment).
 */
export function evaluateRentCycle(
  housing: { nextRentDueAt: Date; rentPerDay: number },
  character: { credits: number; wantedLevel: number },
  now: Date,
): RentCycleResult {
  const periodMs = HOUSING_RENT_PERIOD_HOURS * 3_600_000;
  let dueAt = housing.nextRentDueAt.getTime();
  let credits = character.credits;
  let periodsPaid = 0;
  let evicted = false;

  while (dueAt <= now.getTime()) {
    if (credits < housing.rentPerDay) {
      evicted = true;
      break;
    }
    credits = Number((credits - housing.rentPerDay).toFixed(2));
    periodsPaid += 1;
    dueAt += periodMs;
  }

  const wantedReduction = Math.min(
    character.wantedLevel,
    periodsPaid * HOUSING_WANTED_REDUCTION_PER_RENT,
  );

  return {
    periodsPaid,
    totalRent: Number((periodsPaid * housing.rentPerDay).toFixed(2)),
    creditsAfter: credits,
    wantedReduction,
    evicted,
    nextRentDueAt: new Date(dueAt),
  };
}
