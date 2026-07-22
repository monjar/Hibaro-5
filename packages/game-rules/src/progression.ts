import { OpportunityDefinition } from './types';

/**
 * Runtime ceiling for any single skill stat. Character creation caps
 * allocation lower (see character-creation.ts); STAT_XP gains, spent stat
 * points, and gear can push stats up to this value but never past it,
 * keeping the d20 check math meaningful at high level.
 */
export const STAT_CAP = 20;

export const MAX_LEVEL = 50;
export const LEVEL_UP_STAT_POINTS = 2;
export const LEVEL_UP_MAX_HEALTH = 5;
export const LEVEL_UP_MAX_ENERGY = 5;
export const FAILURE_XP_RATIO = 0.35;

const KIND_XP_MULTIPLIER: Record<OpportunityDefinition['kind'], number> = {
  GIG: 1,
  JOB: 0.8,
  QUEST: 1.6,
};

/** XP required to advance FROM `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return Math.max(1, Math.floor(level)) * 100;
}

/** Total XP required to reach `level` (level 1 = 0 XP). */
export function xpThresholdForLevel(level: number): number {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  // Sum of 100 * k for k in [1, level-1]
  return 50 * clamped * (clamped - 1);
}

export function levelForXp(xp: number): number {
  const safeXp = Math.max(0, xp);
  let level = 1;
  while (level < MAX_LEVEL && safeXp >= xpThresholdForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

/** XP awarded for resolving an opportunity, scaled by DC and kind. */
export function xpRewardForOpportunity(
  definition: Pick<OpportunityDefinition, 'difficulty' | 'kind'>,
  success: boolean,
): number {
  const difficulty = Number.isFinite(definition.difficulty) ? definition.difficulty : 10;
  const kindMultiplier = KIND_XP_MULTIPLIER[definition.kind] ?? 1;
  const base = Math.max(10, difficulty * 6) * kindMultiplier;
  return Math.round(success ? base : base * FAILURE_XP_RATIO);
}

export interface XpGainResult {
  xp: number;
  level: number;
  levelsGained: number;
  statPointsGained: number;
  maxHealthGained: number;
  maxEnergyGained: number;
}

/** Apply an XP gain to a character's progression state, resolving level-ups. */
export function applyXpGain(
  current: { xp: number; level: number },
  gainedXp: number,
): XpGainResult {
  const xp = Math.max(0, current.xp) + Math.max(0, Math.round(gainedXp));
  const previousLevel = Math.min(MAX_LEVEL, Math.max(1, current.level));
  const level = Math.max(previousLevel, levelForXp(xp));
  const levelsGained = level - previousLevel;

  return {
    xp,
    level,
    levelsGained,
    statPointsGained: levelsGained * LEVEL_UP_STAT_POINTS,
    maxHealthGained: levelsGained * LEVEL_UP_MAX_HEALTH,
    maxEnergyGained: levelsGained * LEVEL_UP_MAX_ENERGY,
  };
}
