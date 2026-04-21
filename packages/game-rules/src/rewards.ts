import { CharacterStats, Reward } from './types';

export interface RewardApplicationResult {
  creditsDelta: number;
  statChanges: Record<string, number>;
  itemsToAdd: string[];
  factionReputationChanges: Record<string, number>;
  corporationReputationChanges: Record<string, number>;
  buildingsToUnlock: string[];
  questsToUnlock: string[];
}

export function applyReward(
  character: CharacterStats,
  reward: Reward,
): Partial<RewardApplicationResult> {
  switch (reward.type) {
    case 'CREDITS':
      return { creditsDelta: reward.value ?? 0 };

    case 'STAT_XP': {
      const key = reward.key;
      if (!key) return {};
      // 50% chance to actually increment stat on XP rewards
      const increment = Math.random() < 0.5 ? 1 : 0;
      return { statChanges: { [key]: increment } };
    }

    case 'ITEM': {
      if (!reward.itemDefinitionId) return {};
      return { itemsToAdd: [reward.itemDefinitionId] };
    }

    case 'FACTION_REPUTATION': {
      if (!reward.factionId || reward.value === undefined) return {};
      return { factionReputationChanges: { [reward.factionId]: reward.value } };
    }

    case 'CORPORATION_REPUTATION': {
      if (!reward.corporationId || reward.value === undefined) return {};
      return { corporationReputationChanges: { [reward.corporationId]: reward.value } };
    }

    case 'UNLOCK_BUILDING': {
      if (!reward.buildingId) return {};
      return { buildingsToUnlock: [reward.buildingId] };
    }

    case 'UNLOCK_QUEST': {
      if (!reward.questId) return {};
      return { questsToUnlock: [reward.questId] };
    }

    default:
      return {};
  }
}

export function applyRewards(
  character: CharacterStats,
  rewards: Reward[],
): RewardApplicationResult {
  const result: RewardApplicationResult = {
    creditsDelta: 0,
    statChanges: {},
    itemsToAdd: [],
    factionReputationChanges: {},
    corporationReputationChanges: {},
    buildingsToUnlock: [],
    questsToUnlock: [],
  };

  for (const reward of rewards) {
    const partial = applyReward(character, reward);
    if (partial.creditsDelta) result.creditsDelta += partial.creditsDelta;
    if (partial.statChanges) {
      for (const [key, val] of Object.entries(partial.statChanges)) {
        result.statChanges[key] = (result.statChanges[key] ?? 0) + val;
      }
    }
    if (partial.itemsToAdd) result.itemsToAdd.push(...partial.itemsToAdd);
    if (partial.factionReputationChanges) {
      for (const [id, val] of Object.entries(partial.factionReputationChanges)) {
        result.factionReputationChanges[id] = (result.factionReputationChanges[id] ?? 0) + val;
      }
    }
    if (partial.corporationReputationChanges) {
      for (const [id, val] of Object.entries(partial.corporationReputationChanges)) {
        result.corporationReputationChanges[id] =
          (result.corporationReputationChanges[id] ?? 0) + val;
      }
    }
    if (partial.buildingsToUnlock) result.buildingsToUnlock.push(...partial.buildingsToUnlock);
    if (partial.questsToUnlock) result.questsToUnlock.push(...partial.questsToUnlock);
  }

  return result;
}
