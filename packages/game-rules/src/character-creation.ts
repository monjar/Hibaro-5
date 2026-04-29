export type StatKey =
  | 'strength'
  | 'agility'
  | 'intelligence'
  | 'charisma'
  | 'hacking'
  | 'combat'
  | 'stealth'
  | 'engineering';

export const ALL_STAT_KEYS: StatKey[] = [
  'strength',
  'agility',
  'intelligence',
  'charisma',
  'hacking',
  'combat',
  'stealth',
  'engineering',
];

export const STAT_BASE_VALUE = 4;
export const STAT_ALLOCATION_BUDGET = 12;
export const STAT_MAX_PER_KEY = 8;
export const STAT_MIN_PER_KEY = 0;

export type Backstory =
  | 'EX_SOLDIER'
  | 'SMUGGLER'
  | 'CORPORATE_DRONE'
  | 'STREET_HACKER'
  | 'DRIFTER';

export interface BackstoryDefinition {
  id: Backstory;
  label: string;
  blurb: string;
  bonuses: Partial<Record<StatKey, number>>;
  startingCredits: number;
}

export const BACKSTORIES: BackstoryDefinition[] = [
  {
    id: 'EX_SOLDIER',
    label: 'Ex-Soldier',
    blurb: 'Discharged from a corporate security regiment. Trained for violence, hungry for purpose.',
    bonuses: { combat: 3, strength: 2, agility: 1 },
    startingCredits: 200,
  },
  {
    id: 'SMUGGLER',
    label: 'Smuggler',
    blurb: 'Spent a decade hauling contraband between rim worlds. Fast, quiet, and unfond of cops.',
    bonuses: { stealth: 3, charisma: 2, agility: 1 },
    startingCredits: 350,
  },
  {
    id: 'CORPORATE_DRONE',
    label: 'Corporate Drone',
    blurb: 'Recently severed from a desk job at one of the Big Four. You know how the system breathes.',
    bonuses: { intelligence: 3, charisma: 2, engineering: 1 },
    startingCredits: 500,
  },
  {
    id: 'STREET_HACKER',
    label: 'Street Hacker',
    blurb: 'Self-taught on stolen machines. Reads networks the way priests read tea leaves.',
    bonuses: { hacking: 3, intelligence: 2, stealth: 1 },
    startingCredits: 250,
  },
  {
    id: 'DRIFTER',
    label: 'Drifter',
    blurb: 'No past, no plan. The kind of person stations forget on purpose.',
    bonuses: { agility: 1, charisma: 1, stealth: 1, intelligence: 1, combat: 1, engineering: 1 },
    startingCredits: 250,
  },
];

export function getBackstory(id: Backstory): BackstoryDefinition {
  const found = BACKSTORIES.find((b) => b.id === id);
  if (!found) {
    throw new Error(`Unknown backstory: ${id}`);
  }
  return found;
}

export interface CharacterCreationInput {
  backstory: Backstory;
  statAllocation?: Partial<Record<StatKey, number>>;
}

export interface CharacterCreationResult {
  stats: Record<StatKey, number>;
  startingCredits: number;
}

export class CharacterCreationError extends Error {}

export function validateStatAllocation(
  allocation: Partial<Record<StatKey, number>> | undefined,
): Record<StatKey, number> {
  const filled: Record<StatKey, number> = {
    strength: 0,
    agility: 0,
    intelligence: 0,
    charisma: 0,
    hacking: 0,
    combat: 0,
    stealth: 0,
    engineering: 0,
  };
  let total = 0;
  for (const key of ALL_STAT_KEYS) {
    const value = allocation?.[key] ?? 0;
    if (!Number.isInteger(value)) {
      throw new CharacterCreationError(`Stat allocation for ${key} must be a whole number`);
    }
    if (value < STAT_MIN_PER_KEY) {
      throw new CharacterCreationError(`Cannot allocate less than ${STAT_MIN_PER_KEY} to ${key}`);
    }
    if (value > STAT_MAX_PER_KEY) {
      throw new CharacterCreationError(
        `Cannot allocate more than ${STAT_MAX_PER_KEY} to ${key} (got ${value})`,
      );
    }
    filled[key] = value;
    total += value;
  }
  if (total > STAT_ALLOCATION_BUDGET) {
    throw new CharacterCreationError(
      `Stat allocation totals ${total}, budget is ${STAT_ALLOCATION_BUDGET}`,
    );
  }
  return filled;
}

export function buildStartingCharacter(input: CharacterCreationInput): CharacterCreationResult {
  const backstory = getBackstory(input.backstory);
  const allocation = validateStatAllocation(input.statAllocation);

  const stats: Record<StatKey, number> = {
    strength: STAT_BASE_VALUE,
    agility: STAT_BASE_VALUE,
    intelligence: STAT_BASE_VALUE,
    charisma: STAT_BASE_VALUE,
    hacking: STAT_BASE_VALUE,
    combat: STAT_BASE_VALUE,
    stealth: STAT_BASE_VALUE,
    engineering: STAT_BASE_VALUE,
  };

  for (const key of ALL_STAT_KEYS) {
    stats[key] += allocation[key];
    stats[key] += backstory.bonuses[key] ?? 0;
  }

  return {
    stats,
    startingCredits: backstory.startingCredits,
  };
}
