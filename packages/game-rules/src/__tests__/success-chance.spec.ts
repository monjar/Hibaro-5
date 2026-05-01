import { calculateOpportunitySuccessChance } from '../success-chance';
import { CharacterStats, OpportunityDefinition } from '../types';

const baseCharacter: CharacterStats = {
  id: 'char-1',
  name: 'Nova Rook',
  credits: 250,
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

const makeOpportunity = (
  type: OpportunityDefinition['type'],
  difficulty = 10,
): OpportunityDefinition => ({
  id: 'opp-1',
  title: 'Test Opportunity',
  kind: 'GIG',
  type,
  difficulty,
  requirements: [],
  rewards: [],
  risks: [],
});

describe('calculateOpportunitySuccessChance', () => {
  it('returns a value between 0.05 and 0.95', () => {
    const chance = calculateOpportunitySuccessChance(baseCharacter, makeOpportunity('DELIVERY'));
    expect(chance).toBeGreaterThanOrEqual(0.05);
    expect(chance).toBeLessThanOrEqual(0.95);
  });

  it('is lower for harder opportunities', () => {
    const easyChance = calculateOpportunitySuccessChance(
      baseCharacter,
      makeOpportunity('DELIVERY', 10),
    );
    const hardChance = calculateOpportunitySuccessChance(
      baseCharacter,
      makeOpportunity('DELIVERY', 18),
    );
    expect(easyChance).toBeGreaterThan(hardChance);
  });

  it('benefits from relevant stat for HACKING type', () => {
    const lowHackChar = { ...baseCharacter, hacking: 1, intelligence: 1 };
    const highHackChar = { ...baseCharacter, hacking: 20, intelligence: 20 };
    const lowChance = calculateOpportunitySuccessChance(lowHackChar, makeOpportunity('HACKING', 18));
    const highChance = calculateOpportunitySuccessChance(highHackChar, makeOpportunity('HACKING', 18));
    expect(highChance).toBeGreaterThan(lowChance);
  });

  it('benefits from stealth+charisma for SMUGGLING type', () => {
    const lowChar = { ...baseCharacter, stealth: 1, charisma: 1 };
    const highChar = { ...baseCharacter, stealth: 20, charisma: 20 };
    const lowChance = calculateOpportunitySuccessChance(lowChar, makeOpportunity('SMUGGLING', 18));
    const highChance = calculateOpportunitySuccessChance(highChar, makeOpportunity('SMUGGLING', 18));
    expect(highChance).toBeGreaterThan(lowChance);
  });

  it('clamps minimum success chance at 0.05 even with max difficulty', () => {
    const lowChar = {
      ...baseCharacter,
      hacking: 1,
      intelligence: 1,
      stealth: 1,
      combat: 1,
      agility: 1,
      strength: 1,
      engineering: 1,
      charisma: 1,
    };
    const chance = calculateOpportunitySuccessChance(lowChar, makeOpportunity('HACKING', 30));
    expect(chance).toBeGreaterThanOrEqual(0.05);
  });
});
