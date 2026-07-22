import {
  FAILURE_XP_RATIO,
  LEVEL_UP_MAX_ENERGY,
  LEVEL_UP_MAX_HEALTH,
  LEVEL_UP_STAT_POINTS,
  MAX_LEVEL,
  applyXpGain,
  levelForXp,
  xpRewardForOpportunity,
  xpThresholdForLevel,
  xpToNextLevel,
} from '../progression';

describe('level curve', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(xpThresholdForLevel(1)).toBe(0);
    expect(levelForXp(0)).toBe(1);
  });

  it('requires 100 XP per current level to advance', () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(2)).toBe(200);
    expect(xpThresholdForLevel(2)).toBe(100);
    expect(xpThresholdForLevel(3)).toBe(300);
    expect(xpThresholdForLevel(4)).toBe(600);
  });

  it('maps XP totals to levels', () => {
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(300)).toBe(3);
  });

  it('caps at MAX_LEVEL', () => {
    expect(levelForXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
  });
});

describe('xpRewardForOpportunity', () => {
  it('scales with difficulty', () => {
    expect(xpRewardForOpportunity({ difficulty: 10, kind: 'GIG' }, true)).toBe(60);
    expect(xpRewardForOpportunity({ difficulty: 14, kind: 'GIG' }, true)).toBe(84);
  });

  it('pays quests more and jobs less', () => {
    expect(xpRewardForOpportunity({ difficulty: 10, kind: 'QUEST' }, true)).toBe(96);
    expect(xpRewardForOpportunity({ difficulty: 10, kind: 'JOB' }, true)).toBe(48);
  });

  it('pays partial XP on failure', () => {
    const success = xpRewardForOpportunity({ difficulty: 10, kind: 'GIG' }, true);
    const failure = xpRewardForOpportunity({ difficulty: 10, kind: 'GIG' }, false);
    expect(failure).toBe(Math.round(success * FAILURE_XP_RATIO));
    expect(failure).toBeGreaterThan(0);
  });
});

describe('applyXpGain', () => {
  it('accumulates XP without leveling below the threshold', () => {
    const result = applyXpGain({ xp: 0, level: 1 }, 60);
    expect(result).toMatchObject({ xp: 60, level: 1, levelsGained: 0, statPointsGained: 0 });
  });

  it('levels up across a threshold and grants points', () => {
    const result = applyXpGain({ xp: 60, level: 1 }, 60);
    expect(result.level).toBe(2);
    expect(result.levelsGained).toBe(1);
    expect(result.statPointsGained).toBe(LEVEL_UP_STAT_POINTS);
    expect(result.maxHealthGained).toBe(LEVEL_UP_MAX_HEALTH);
    expect(result.maxEnergyGained).toBe(LEVEL_UP_MAX_ENERGY);
  });

  it('handles multi-level gains in one award', () => {
    const result = applyXpGain({ xp: 0, level: 1 }, 300);
    expect(result.level).toBe(3);
    expect(result.levelsGained).toBe(2);
    expect(result.statPointsGained).toBe(2 * LEVEL_UP_STAT_POINTS);
  });

  it('never reduces level even if XP is inconsistent', () => {
    const result = applyXpGain({ xp: 0, level: 5 }, 10);
    expect(result.level).toBe(5);
    expect(result.levelsGained).toBe(0);
  });
});
