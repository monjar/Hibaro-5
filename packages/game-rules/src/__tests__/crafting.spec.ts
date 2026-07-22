import { CRAFTING_RECIPES, CraftContext, evaluateCraft } from '../crafting';
import { CharacterStats } from '../types';

const stats: CharacterStats = {
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
  intelligence: 8,
  charisma: 5,
  hacking: 5,
  combat: 5,
  stealth: 5,
  engineering: 8,
  reputation: 0,
};

const richContext: CraftContext = {
  credits: 1000,
  energy: 100,
  stats,
  materialCounts: {
    'Scrap Alloy': 5,
    'Broken Drone Part': 1,
    'Cheap Hacking Deck': 1,
    'Orchard Bio-Sample': 2,
  },
  atWorkshop: true,
};

describe('CRAFTING_RECIPES', () => {
  it('has unique ids and positive costs', () => {
    const ids = CRAFTING_RECIPES.map((recipe) => recipe.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const recipe of CRAFTING_RECIPES) {
      expect(recipe.output.quantity).toBeGreaterThan(0);
      expect(recipe.inputs.length).toBeGreaterThan(0);
      expect(recipe.energyCost).toBeGreaterThan(0);
    }
  });
});

describe('evaluateCraft', () => {
  const shockBaton = CRAFTING_RECIPES.find((recipe) => recipe.id === 'shock-baton')!;

  it('allows crafting when everything is satisfied', () => {
    const result = evaluateCraft(shockBaton, richContext);
    expect(result.canCraft).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('requires a workshop', () => {
    const result = evaluateCraft(shockBaton, { ...richContext, atWorkshop: false });
    expect(result.canCraft).toBe(false);
    expect(result.reasons[0]).toMatch(/workshop/);
  });

  it('enforces the stat gate', () => {
    const result = evaluateCraft(shockBaton, {
      ...richContext,
      stats: { ...stats, engineering: 5 },
    });
    expect(result.canCraft).toBe(false);
    expect(result.reasons[0]).toMatch(/engineering ≥ 6/);
  });

  it('checks material quantities per input', () => {
    const result = evaluateCraft(shockBaton, {
      ...richContext,
      materialCounts: { 'Scrap Alloy': 2, 'Broken Drone Part': 0 },
    });
    expect(result.canCraft).toBe(false);
    expect(result.reasons).toHaveLength(2);
  });

  it('checks credits and energy', () => {
    const broke = evaluateCraft(shockBaton, { ...richContext, credits: 10 });
    expect(broke.reasons[0]).toMatch(/credits/);
    const tired = evaluateCraft(shockBaton, { ...richContext, energy: 3 });
    expect(tired.reasons[0]).toMatch(/energy/);
  });

  it('collects multiple reasons at once', () => {
    const result = evaluateCraft(shockBaton, {
      credits: 0,
      energy: 0,
      stats: { ...stats, engineering: 1 },
      materialCounts: {},
      atWorkshop: false,
    });
    expect(result.canCraft).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(4);
  });
});
