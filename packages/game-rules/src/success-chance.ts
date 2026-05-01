import { CharacterStats, OpportunityDefinition } from './types';

export interface OpportunityCheckProfile {
  label: string;
  relevantStatTotal: number;
  statModifier: number;
  difficultyClass: number;
}

export interface OpportunityCheckResult extends OpportunityCheckProfile {
  d20Roll: number;
  checkTotal: number;
  successChance: number;
  success: boolean;
}

function buildOpportunityCheckProfile(
  label: string,
  relevantStatTotal: number,
  difficultyClass: number,
): OpportunityCheckProfile {
  return {
    label,
    relevantStatTotal,
    statModifier: Number((relevantStatTotal / 10).toFixed(1)),
    difficultyClass,
  };
}

export function getOpportunityCheckProfile(
  character: CharacterStats,
  opportunity: OpportunityDefinition,
): OpportunityCheckProfile {
  const difficultyClass = opportunity.difficulty || 10;

  switch (opportunity.type) {
    case 'HACKING':
      return buildOpportunityCheckProfile(
        'Hacking + Intelligence',
        character.hacking + character.intelligence,
        difficultyClass,
      );
    case 'SMUGGLING':
      return buildOpportunityCheckProfile(
        'Stealth + Charisma',
        character.stealth + character.charisma,
        difficultyClass,
      );
    case 'BOUNTY':
    case 'ASSASSINATION':
      return buildOpportunityCheckProfile(
        'Combat + Agility',
        character.combat + character.agility,
        difficultyClass,
      );
    case 'REPAIR':
      return buildOpportunityCheckProfile(
        'Engineering + Intelligence',
        character.engineering + character.intelligence,
        difficultyClass,
      );
    case 'DELIVERY':
    case 'ESCORT':
      return buildOpportunityCheckProfile('Agility', character.agility, difficultyClass);
    case 'DIPLOMACY':
      return buildOpportunityCheckProfile('Charisma', character.charisma, difficultyClass);
    case 'MINING':
      return buildOpportunityCheckProfile(
        'Strength + Engineering',
        character.strength + character.engineering,
        difficultyClass,
      );
    case 'INVESTIGATION':
      return buildOpportunityCheckProfile(
        'Intelligence + Charisma',
        character.intelligence + character.charisma,
        difficultyClass,
      );
    case 'SECURITY':
      return buildOpportunityCheckProfile(
        'Combat + Intelligence',
        character.combat + character.intelligence,
        difficultyClass,
      );
    case 'TRADING':
      return buildOpportunityCheckProfile(
        'Charisma + Intelligence',
        character.charisma + character.intelligence,
        difficultyClass,
      );
    case 'STORY':
    case 'WORLD':
      return buildOpportunityCheckProfile(
        'Intelligence + Charisma',
        character.intelligence + character.charisma,
        difficultyClass,
      );
  }
}

export function calculateOpportunitySuccessChance(
  character: CharacterStats,
  opportunity: OpportunityDefinition,
): number {
  const { statModifier, difficultyClass } = getOpportunityCheckProfile(character, opportunity);
  let successfulFaces = 0;

  for (let face = 1; face <= 20; face += 1) {
    if (face === 1) continue;
    if (face === 20 || face + statModifier >= difficultyClass) {
      successfulFaces += 1;
    }
  }

  return Math.min(0.95, Math.max(0.05, successfulFaces / 20));
}

export function rollOpportunityCheck(
  character: CharacterStats,
  opportunity: OpportunityDefinition,
  randomSeed?: number,
): OpportunityCheckResult {
  const profile = getOpportunityCheckProfile(character, opportunity);
  const d20Roll = randomSeed !== undefined ? Math.floor(randomSeed * 20) + 1 : Math.floor(Math.random() * 20) + 1;
  const checkTotal = Number((d20Roll + profile.statModifier).toFixed(1));
  const successChance = calculateOpportunitySuccessChance(character, opportunity);
  const success = d20Roll === 20 || (d20Roll !== 1 && checkTotal >= profile.difficultyClass);

  return {
    ...profile,
    d20Roll,
    checkTotal,
    successChance,
    success,
  };
}
