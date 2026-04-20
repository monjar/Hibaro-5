import { CharacterStats, OpportunityDefinition } from './types';

export function calculateOpportunitySuccessChance(
  character: CharacterStats,
  opportunity: OpportunityDefinition,
): number {
  let chance = 0.7;

  // Reduce by difficulty
  chance -= (opportunity.difficulty || 1) * 0.08;

  // Add stat bonuses (each stat point adds a small bonus)
  const statBonus = (statTotal: number) => statTotal * 0.005;

  switch (opportunity.type) {
    case 'HACKING':
      chance += statBonus(character.hacking + character.intelligence);
      break;
    case 'SMUGGLING':
      chance += statBonus(character.stealth + character.charisma);
      break;
    case 'BOUNTY':
    case 'ASSASSINATION':
      chance += statBonus(character.combat + character.agility);
      break;
    case 'REPAIR':
      chance += statBonus(character.engineering + character.intelligence);
      break;
    case 'DELIVERY':
    case 'ESCORT':
      chance += statBonus(character.agility);
      break;
    case 'DIPLOMACY':
      chance += statBonus(character.charisma);
      break;
    case 'MINING':
      chance += statBonus(character.strength + character.engineering);
      break;
    case 'INVESTIGATION':
      chance += statBonus(character.intelligence + character.charisma);
      break;
    case 'SECURITY':
      chance += statBonus(character.combat + character.intelligence);
      break;
    case 'TRADING':
      chance += statBonus(character.charisma + character.intelligence);
      break;
    case 'STORY':
    case 'WORLD':
      // Story/world opportunities are more about progress than stats
      chance += statBonus(character.intelligence);
      break;
  }

  // Clamp between 5% and 95%
  return Math.min(0.95, Math.max(0.05, chance));
}
