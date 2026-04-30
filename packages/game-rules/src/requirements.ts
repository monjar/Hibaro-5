import { CharacterStats, Requirement, RequirementContext } from './types';

export function checkRequirement(
  character: CharacterStats,
  requirement: Requirement,
  context: RequirementContext = {},
): boolean {
  switch (requirement.type) {
    case 'STAT_MIN': {
      if (!requirement.key || requirement.value === undefined) return false;
      const statValue = (character as any)[requirement.key];
      if (typeof statValue !== 'number') return false;
      return statValue >= requirement.value;
    }

    case 'CREDITS_MIN': {
      if (requirement.value === undefined) return false;
      return character.credits >= requirement.value;
    }

    case 'FACTION_REPUTATION_MIN': {
      if (!requirement.id || requirement.value === undefined) return false;
      const rep = context.factionReputations?.[requirement.id] ?? 0;
      return rep >= requirement.value;
    }

    case 'CORPORATION_REPUTATION_MIN': {
      if (!requirement.id || requirement.value === undefined) return false;
      const rep = context.corporationReputations?.[requirement.id] ?? 0;
      return rep >= requirement.value;
    }

    case 'ITEM_REQUIRED': {
      if (!requirement.id) return false;
      return context.inventoryItemIds?.includes(requirement.id) ?? false;
    }

    case 'QUEST_COMPLETED': {
      if (!requirement.id) return false;
      return context.completedQuestIds?.includes(requirement.id) ?? false;
    }

    case 'DISTRICT_ACCESS': {
      if (!requirement.id) return false;
      return context.accessibleDistrictIds?.includes(requirement.id) ?? false;
    }

    case 'PLANET_ACCESS': {
      if (!requirement.id) return false;
      return context.accessiblePlanetIds?.includes(requirement.id) ?? false;
    }

    case 'RANK_REQUIRED': {
      if (!requirement.id || !requirement.name) return false;
      return context.ranksByFaction?.[requirement.id] === requirement.name;
    }

    default:
      return false;
  }
}

export function checkRequirements(
  character: CharacterStats,
  requirements: Requirement[],
  context: RequirementContext = {},
): { passed: boolean; failedRequirements: Requirement[] } {
  const failedRequirements: Requirement[] = [];

  for (const req of requirements) {
    if (!checkRequirement(character, req, context)) {
      failedRequirements.push(req);
    }
  }

  return {
    passed: failedRequirements.length === 0,
    failedRequirements,
  };
}
