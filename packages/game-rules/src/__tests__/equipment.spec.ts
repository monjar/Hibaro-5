import {
  aggregateEquipmentBonuses,
  applyEquipmentBonuses,
  extractStatBonuses,
  slotForCategory,
} from '../equipment';
import { STAT_CAP } from '../progression';
import { CharacterStats } from '../types';

const baseStats: CharacterStats = {
  id: 'char-1',
  name: 'Nova',
  credits: 0,
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
};

describe('slotForCategory', () => {
  it('maps equippable categories to slots', () => {
    expect(slotForCategory('WEAPON')).toBe('WEAPON');
    expect(slotForCategory('CLOTHING')).toBe('OUTFIT');
    expect(slotForCategory('TOOL')).toBe('TOOL');
    expect(slotForCategory('VEHICLE')).toBe('VEHICLE');
  });

  it('rejects non-equippable categories', () => {
    expect(slotForCategory('CONSUMABLE')).toBeNull();
    expect(slotForCategory('QUEST_ITEM')).toBeNull();
    expect(slotForCategory('MATERIAL')).toBeNull();
  });
});

describe('extractStatBonuses', () => {
  it('reads statBonuses from the matching category data', () => {
    expect(
      extractStatBonuses({
        category: 'TOOL',
        toolData: { tier: 1, statBonuses: { hacking: 2 } },
      }),
    ).toEqual({ hacking: 2 });
  });

  it('honours legacy flat <stat>Bonus keys', () => {
    expect(
      extractStatBonuses({
        category: 'TOOL',
        toolData: { stealthBonus: 3, concealmentCapacity: 5 },
      }),
    ).toEqual({ stealth: 3 });
  });

  it('ignores data from the wrong category slot', () => {
    expect(
      extractStatBonuses({
        category: 'WEAPON',
        toolData: { statBonuses: { hacking: 5 } },
      }),
    ).toEqual({});
  });

  it('returns empty for malformed data', () => {
    expect(extractStatBonuses({ category: 'WEAPON', weaponData: 'not-an-object' })).toEqual({});
    expect(extractStatBonuses({ category: 'CONSUMABLE' })).toEqual({});
  });
});

describe('aggregateEquipmentBonuses', () => {
  it('sums bonuses across equipped items', () => {
    const total = aggregateEquipmentBonuses([
      { category: 'WEAPON', weaponData: { statBonuses: { combat: 1 } } },
      { category: 'TOOL', toolData: { statBonuses: { combat: 1, hacking: 2 } } },
    ]);
    expect(total).toEqual({ combat: 2, hacking: 2 });
  });
});

describe('applyEquipmentBonuses', () => {
  it('adds bonuses to base stats', () => {
    const boosted = applyEquipmentBonuses(baseStats, { hacking: 2, stealth: 3 });
    expect(boosted.hacking).toBe(7);
    expect(boosted.stealth).toBe(8);
    expect(boosted.combat).toBe(5);
  });

  it('respects the stat cap and floor', () => {
    const nearCap = { ...baseStats, hacking: STAT_CAP - 1 };
    expect(applyEquipmentBonuses(nearCap, { hacking: 5 }).hacking).toBe(STAT_CAP);
    expect(applyEquipmentBonuses(baseStats, { strength: -10 }).strength).toBe(0);
  });

  it('does not mutate the input', () => {
    applyEquipmentBonuses(baseStats, { hacking: 2 });
    expect(baseStats.hacking).toBe(5);
  });
});
