import {
  buildStartingCharacter,
  validateStatAllocation,
  getBackstory,
  BACKSTORIES,
  STAT_ALLOCATION_BUDGET,
  STAT_MAX_PER_KEY,
  STAT_BASE_VALUE,
  CharacterCreationError,
} from '../character-creation';

describe('validateStatAllocation', () => {
  it('returns zeroed stats when allocation is omitted', () => {
    expect(validateStatAllocation(undefined)).toEqual({
      strength: 0,
      agility: 0,
      intelligence: 0,
      charisma: 0,
      hacking: 0,
      combat: 0,
      stealth: 0,
      engineering: 0,
    });
  });

  it('accepts a valid allocation summing exactly to the budget', () => {
    const allocation = { strength: 4, agility: 4, hacking: 4 };
    const result = validateStatAllocation(allocation);
    expect(result.strength + result.agility + result.hacking).toBe(STAT_ALLOCATION_BUDGET);
  });

  it('rejects allocations that exceed the budget', () => {
    expect(() =>
      validateStatAllocation({ strength: 5, agility: 5, hacking: 5 }),
    ).toThrow(CharacterCreationError);
  });

  it('rejects allocations that exceed the per-key cap', () => {
    expect(() =>
      validateStatAllocation({ strength: STAT_MAX_PER_KEY + 1 }),
    ).toThrow(/more than/);
  });

  it('rejects negative allocations', () => {
    expect(() => validateStatAllocation({ stealth: -1 })).toThrow(/less than/);
  });

  it('rejects non-integer allocations', () => {
    expect(() => validateStatAllocation({ stealth: 1.5 })).toThrow(/whole number/);
  });
});

describe('getBackstory', () => {
  it('returns each known backstory', () => {
    for (const b of BACKSTORIES) {
      expect(getBackstory(b.id).id).toBe(b.id);
    }
  });

  it('throws on unknown backstory', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getBackstory('UNKNOWN' as any)).toThrow();
  });
});

describe('buildStartingCharacter', () => {
  it('applies backstory bonuses on top of base stats', () => {
    const result = buildStartingCharacter({ backstory: 'EX_SOLDIER' });
    // EX_SOLDIER: combat +3, strength +2, agility +1
    expect(result.stats.combat).toBe(STAT_BASE_VALUE + 3);
    expect(result.stats.strength).toBe(STAT_BASE_VALUE + 2);
    expect(result.stats.agility).toBe(STAT_BASE_VALUE + 1);
    expect(result.stats.hacking).toBe(STAT_BASE_VALUE);
    expect(result.startingCredits).toBe(200);
  });

  it('stacks player allocation with backstory bonuses', () => {
    const result = buildStartingCharacter({
      backstory: 'STREET_HACKER',
      statAllocation: { hacking: 4, intelligence: 4, stealth: 4 },
    });
    // STREET_HACKER: hacking +3, intelligence +2, stealth +1
    expect(result.stats.hacking).toBe(STAT_BASE_VALUE + 3 + 4);
    expect(result.stats.intelligence).toBe(STAT_BASE_VALUE + 2 + 4);
    expect(result.stats.stealth).toBe(STAT_BASE_VALUE + 1 + 4);
  });

  it('throws when allocation budget is exceeded', () => {
    expect(() =>
      buildStartingCharacter({
        backstory: 'DRIFTER',
        statAllocation: { combat: 5, hacking: 5, stealth: 5 },
      }),
    ).toThrow(CharacterCreationError);
  });

  it('throws when backstory is unknown', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => buildStartingCharacter({ backstory: 'NOT_REAL' as any })).toThrow();
  });
});
