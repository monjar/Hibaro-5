import { CharacterStats } from './types';

/**
 * PVP v1 — same-district duels and player bounties.
 *
 * Contests are symmetric d20 checks: each side rolls a d20 and adds a stat
 * modifier (relevant stats / 10, the same scale opportunity checks use).
 * Ties go to the defender — the aggressor carries the risk.
 */

/** Characters below this level can neither attack nor be attacked. */
export const PVP_MIN_LEVEL = 3;

export const DUEL_MIN_WAGER = 10;
export const DUEL_MAX_WAGER = 500;
export const DUEL_ENERGY_COST = 10;
/** An attacker can start one duel per this window. */
export const DUEL_ATTACKER_COOLDOWN_MS = 15 * 60 * 1000;
/** The same defender can only be hit by the same attacker once per this window. */
export const DUEL_TARGET_COOLDOWN_MS = 60 * 60 * 1000;
/** Health lost by the loser / winner of a duel (never lethal — floor 1). */
export const DUEL_LOSER_HEALTH_LOSS = 15;
export const DUEL_WINNER_HEALTH_LOSS = 5;
/** Districts at or above this law level flag dueling attackers. */
export const DUEL_HEAT_LAW_LEVEL = 5;

export const BOUNTY_MIN_AMOUNT = 50;
export const BOUNTY_CLAIM_ENERGY_COST = 12;
export const BOUNTY_FAILED_CLAIM_HEALTH_LOSS = 10;
export const BOUNTY_TARGET_HEALTH_LOSS = 20;

export interface PvpContestSide {
  roll: number;
  statModifier: number;
  total: number;
}

export interface PvpContestResult {
  attacker: PvpContestSide;
  defender: PvpContestSide;
  attackerWins: boolean;
}

function rollD20(random: () => number): number {
  return Math.floor(random() * 20) + 1;
}

function modifierFor(stats: CharacterStats, keys: Array<keyof CharacterStats>): number {
  const total = keys.reduce((sum, key) => sum + Number(stats[key] ?? 0), 0);
  return Math.round((total / 10) * 10) / 10;
}

/**
 * Roll a PVP contest. Attacker wins strictly greater totals; ties defend.
 */
export function rollPvpContest(
  attackerStats: CharacterStats,
  defenderStats: CharacterStats,
  attackerKeys: Array<keyof CharacterStats>,
  defenderKeys: Array<keyof CharacterStats>,
  random: () => number = Math.random,
): PvpContestResult {
  const attackerModifier = modifierFor(attackerStats, attackerKeys);
  const defenderModifier = modifierFor(defenderStats, defenderKeys);
  const attackerRoll = rollD20(random);
  const defenderRoll = rollD20(random);
  const attackerTotal = Math.round((attackerRoll + attackerModifier) * 10) / 10;
  const defenderTotal = Math.round((defenderRoll + defenderModifier) * 10) / 10;

  return {
    attacker: { roll: attackerRoll, statModifier: attackerModifier, total: attackerTotal },
    defender: { roll: defenderRoll, statModifier: defenderModifier, total: defenderTotal },
    attackerWins: attackerTotal > defenderTotal,
  };
}

/** Duels contest combat + agility on both sides. */
export function rollDuel(
  attackerStats: CharacterStats,
  defenderStats: CharacterStats,
  random: () => number = Math.random,
): PvpContestResult {
  return rollPvpContest(
    attackerStats,
    defenderStats,
    ['combat', 'agility'],
    ['combat', 'agility'],
    random,
  );
}

/** Bounty claims pit the hunter's combat + agility against the target's stealth + agility. */
export function rollBountyClaim(
  hunterStats: CharacterStats,
  targetStats: CharacterStats,
  random: () => number = Math.random,
): PvpContestResult {
  return rollPvpContest(
    hunterStats,
    targetStats,
    ['combat', 'agility'],
    ['stealth', 'agility'],
    random,
  );
}

/** Credits that actually change hands — capped by what the loser is carrying. */
export function duelTransferAmount(wager: number, loserCredits: number): number {
  return Math.max(0, Math.min(wager, Math.floor(loserCredits)));
}
