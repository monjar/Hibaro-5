import { duelTransferAmount, rollBountyClaim, rollDuel, rollPvpContest } from '../pvp';
import { CharacterStats } from '../types';

function makeStats(overrides: Partial<CharacterStats> = {}): CharacterStats {
  return {
    id: 'char',
    name: 'Char',
    credits: 100,
    health: 100,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    wantedLevel: 0,
    strength: 5,
    agility: 5,
    intelligence: 5,
    charisma: 5,
    hacking: 5,
    combat: 5,
    stealth: 5,
    engineering: 5,
    reputation: 0,
    ...overrides,
  };
}

/** Deterministic RNG that yields the queued values in order. */
function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

describe('rollPvpContest', () => {
  it('adds stat modifiers of the given keys (stats / 10)', () => {
    const attacker = makeStats({ combat: 10, agility: 10 });
    const defender = makeStats({ combat: 5, agility: 5 });
    // both roll 10
    const result = rollPvpContest(
      attacker,
      defender,
      ['combat', 'agility'],
      ['combat', 'agility'],
      sequence([9.5 / 20, 9.5 / 20]),
    );
    expect(result.attacker.roll).toBe(10);
    expect(result.attacker.total).toBe(12);
    expect(result.defender.total).toBe(11);
    expect(result.attackerWins).toBe(true);
  });

  it('gives ties to the defender', () => {
    const stats = makeStats();
    const result = rollPvpContest(
      stats,
      stats,
      ['combat', 'agility'],
      ['combat', 'agility'],
      sequence([9.5 / 20, 9.5 / 20]),
    );
    expect(result.attacker.total).toBe(result.defender.total);
    expect(result.attackerWins).toBe(false);
  });
});

describe('rollDuel / rollBountyClaim stat profiles', () => {
  it('duels use combat + agility on both sides', () => {
    const brawler = makeStats({ combat: 20, agility: 20, stealth: 0 });
    const sneak = makeStats({ combat: 0, agility: 0, stealth: 20 });
    const result = rollDuel(brawler, sneak, sequence([9.5 / 20, 9.5 / 20]));
    expect(result.attacker.statModifier).toBe(4);
    expect(result.defender.statModifier).toBe(0);
    expect(result.attackerWins).toBe(true);
  });

  it('bounty targets defend with stealth + agility', () => {
    const hunter = makeStats({ combat: 10, agility: 0 });
    const ghost = makeStats({ stealth: 20, agility: 10, combat: 0 });
    const result = rollBountyClaim(hunter, ghost, sequence([9.5 / 20, 9.5 / 20]));
    expect(result.attacker.statModifier).toBe(1);
    expect(result.defender.statModifier).toBe(3);
    expect(result.attackerWins).toBe(false);
  });
});

describe('duelTransferAmount', () => {
  it('caps the transfer at what the loser is carrying', () => {
    expect(duelTransferAmount(100, 250)).toBe(100);
    expect(duelTransferAmount(100, 40.9)).toBe(40);
    expect(duelTransferAmount(100, 0)).toBe(0);
  });

  it('never goes negative', () => {
    expect(duelTransferAmount(100, -5)).toBe(0);
  });
});
