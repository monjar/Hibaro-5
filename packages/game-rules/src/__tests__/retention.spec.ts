import {
  ACHIEVEMENTS,
  AchievementProgressSnapshot,
  achievementProgress,
  canClaimDaily,
  dailyRewardForStreak,
  isAchievementUnlocked,
  isSameUtcDay,
  nextStreak,
} from '../retention';

const HOUR = 3_600_000;

describe('daily claims', () => {
  const noonUtc = new Date('2026-07-15T12:00:00Z');

  it('allows the first claim and blocks a same-day repeat', () => {
    expect(canClaimDaily(null, noonUtc)).toBe(true);
    expect(canClaimDaily(new Date('2026-07-15T01:00:00Z'), noonUtc)).toBe(false);
    expect(canClaimDaily(new Date('2026-07-14T23:59:00Z'), noonUtc)).toBe(true);
  });

  it('continues the streak within the 48h window and resets after', () => {
    const yesterday = new Date(noonUtc.getTime() - 24 * HOUR);
    const threeDaysAgo = new Date(noonUtc.getTime() - 72 * HOUR);
    expect(nextStreak(3, yesterday, noonUtc)).toBe(4);
    expect(nextStreak(3, threeDaysAgo, noonUtc)).toBe(1);
    expect(nextStreak(0, null, noonUtc)).toBe(1);
  });

  it('scales the reward with streak and caps at 7', () => {
    expect(dailyRewardForStreak(1)).toEqual({ credits: 75, xp: 20 });
    expect(dailyRewardForStreak(7)).toEqual({ credits: 225, xp: 80 });
    expect(dailyRewardForStreak(30)).toEqual(dailyRewardForStreak(7));
  });

  it('compares UTC days correctly', () => {
    expect(isSameUtcDay(new Date('2026-07-15T00:01:00Z'), new Date('2026-07-15T23:59:00Z'))).toBe(
      true,
    );
    expect(isSameUtcDay(new Date('2026-07-15T23:59:00Z'), new Date('2026-07-16T00:01:00Z'))).toBe(
      false,
    );
  });
});

describe('achievements', () => {
  const emptySnapshot: AchievementProgressSnapshot = {
    completedActivities: 0,
    completedGigs: 0,
    completedQuests: 0,
    level: 1,
    credits: 0,
    duelsWon: 0,
    bountiesClaimed: 0,
    itemsBought: 0,
    completedQuestIds: [],
  };

  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tracks numeric metrics', () => {
    const firstGig = ACHIEVEMENTS.find((a) => a.id === 'first-gig')!;
    expect(isAchievementUnlocked(firstGig, emptySnapshot)).toBe(false);
    expect(isAchievementUnlocked(firstGig, { ...emptySnapshot, completedGigs: 1 })).toBe(true);
  });

  it('tracks quest-specific achievements', () => {
    const conspiracy = ACHIEVEMENTS.find((a) => a.id === 'pigeon95-conspiracy')!;
    expect(achievementProgress(conspiracy, emptySnapshot)).toBe(0);
    expect(
      achievementProgress(conspiracy, {
        ...emptySnapshot,
        completedQuestIds: ['opp-quest-pigeon95-secret'],
      }),
    ).toBe(1);
  });

  it('unlocks level milestones from the snapshot level', () => {
    const level5 = ACHIEVEMENTS.find((a) => a.id === 'level-5')!;
    expect(isAchievementUnlocked(level5, { ...emptySnapshot, level: 4 })).toBe(false);
    expect(isAchievementUnlocked(level5, { ...emptySnapshot, level: 5 })).toBe(true);
  });
});
