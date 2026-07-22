/**
 * Retention mechanics: daily supply drops with streaks, and achievements.
 */

/** Missing this window (since the last claim) resets the streak. */
export const DAILY_STREAK_WINDOW_HOURS = 48;
export const DAILY_STREAK_CAP = 7;

export function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function canClaimDaily(lastClaimAt: Date | null, now: Date): boolean {
  return !lastClaimAt || !isSameUtcDay(lastClaimAt, now);
}

/** The streak value the next claim would record. */
export function nextStreak(
  previousStreak: number,
  lastClaimAt: Date | null,
  now: Date,
): number {
  if (!lastClaimAt) return 1;
  const elapsedHours = (now.getTime() - lastClaimAt.getTime()) / 3_600_000;
  if (isSameUtcDay(lastClaimAt, now)) return previousStreak;
  return elapsedHours <= DAILY_STREAK_WINDOW_HOURS ? previousStreak + 1 : 1;
}

export function dailyRewardForStreak(streak: number): { credits: number; xp: number } {
  const capped = Math.min(DAILY_STREAK_CAP, Math.max(1, streak));
  return { credits: 50 + 25 * capped, xp: 10 + 10 * capped };
}

// ---------------- achievements ----------------

export interface AchievementProgressSnapshot {
  completedActivities: number;
  completedGigs: number;
  completedQuests: number;
  level: number;
  credits: number;
  duelsWon: number;
  bountiesClaimed: number;
  itemsBought: number;
  completedQuestIds: string[];
}

export type AchievementMetric =
  | keyof Omit<AchievementProgressSnapshot, 'completedQuestIds'>
  | { questId: string };

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  metric: AchievementMetric;
  target: number;
  rewardCredits: number;
  rewardXp: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-gig',
    title: 'First Blood Money',
    description: 'Complete your first gig.',
    icon: '📋',
    metric: 'completedGigs',
    target: 1,
    rewardCredits: 100,
    rewardXp: 30,
  },
  {
    id: 'grinder-10',
    title: 'Operator',
    description: 'Complete 10 activities of any kind.',
    icon: '⚙️',
    metric: 'completedActivities',
    target: 10,
    rewardCredits: 250,
    rewardXp: 80,
  },
  {
    id: 'grinder-50',
    title: 'Machine',
    description: 'Complete 50 activities of any kind.',
    icon: '🤖',
    metric: 'completedActivities',
    target: 50,
    rewardCredits: 1000,
    rewardXp: 300,
  },
  {
    id: 'level-5',
    title: 'Making a Name',
    description: 'Reach level 5.',
    icon: '⬆️',
    metric: 'level',
    target: 5,
    rewardCredits: 300,
    rewardXp: 0,
  },
  {
    id: 'level-10',
    title: 'Known Quantity',
    description: 'Reach level 10.',
    icon: '🌟',
    metric: 'level',
    target: 10,
    rewardCredits: 800,
    rewardXp: 0,
  },
  {
    id: 'credits-10k',
    title: 'Liquid',
    description: 'Hold 10,000 credits at once.',
    icon: '💰',
    metric: 'credits',
    target: 10_000,
    rewardCredits: 0,
    rewardXp: 200,
  },
  {
    id: 'first-duel-win',
    title: 'Drew First',
    description: 'Win a duel against another operator.',
    icon: '⚔️',
    metric: 'duelsWon',
    target: 1,
    rewardCredits: 150,
    rewardXp: 60,
  },
  {
    id: 'duelist-10',
    title: 'Duelist',
    description: 'Win 10 duels.',
    icon: '🏆',
    metric: 'duelsWon',
    target: 10,
    rewardCredits: 600,
    rewardXp: 250,
  },
  {
    id: 'bounty-hunter',
    title: 'Bounty Hunter',
    description: 'Claim a bounty on another operator.',
    icon: '🎯',
    metric: 'bountiesClaimed',
    target: 1,
    rewardCredits: 200,
    rewardXp: 80,
  },
  {
    id: 'shopaholic',
    title: 'Retail Therapy',
    description: 'Buy 5 items from shops.',
    icon: '🛍️',
    metric: 'itemsBought',
    target: 5,
    rewardCredits: 120,
    rewardXp: 40,
  },
  {
    id: 'quest-master',
    title: 'Storychaser',
    description: 'Complete 5 quests.',
    icon: '🗺️',
    metric: 'completedQuests',
    target: 5,
    rewardCredits: 500,
    rewardXp: 200,
  },
  {
    id: 'pigeon95-conspiracy',
    title: 'The Trail Is Real',
    description: 'Crack the Pigeon95 Secret.',
    icon: '🕵️',
    metric: { questId: 'opp-quest-pigeon95-secret' },
    target: 1,
    rewardCredits: 250,
    rewardXp: 100,
  },
];

export function achievementProgress(
  definition: AchievementDefinition,
  snapshot: AchievementProgressSnapshot,
): number {
  if (typeof definition.metric === 'object') {
    return snapshot.completedQuestIds.includes(definition.metric.questId) ? 1 : 0;
  }
  return Math.max(0, Number(snapshot[definition.metric] ?? 0));
}

export function isAchievementUnlocked(
  definition: AchievementDefinition,
  snapshot: AchievementProgressSnapshot,
): boolean {
  return achievementProgress(definition, snapshot) >= definition.target;
}
