import { checkRequirement, checkRequirements } from '../requirements';
import { CharacterStats, Requirement, RequirementContext } from '../types';

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

describe('checkRequirement', () => {
  describe('STAT_MIN', () => {
    it('passes when stat is exactly at minimum', () => {
      const req: Requirement = { type: 'STAT_MIN', key: 'hacking', value: 5 };
      expect(checkRequirement(baseCharacter, req)).toBe(true);
    });

    it('passes when stat is above minimum', () => {
      const req: Requirement = { type: 'STAT_MIN', key: 'stealth', value: 3 };
      expect(checkRequirement(baseCharacter, req)).toBe(true);
    });

    it('fails when stat is below minimum', () => {
      const req: Requirement = { type: 'STAT_MIN', key: 'hacking', value: 10 };
      expect(checkRequirement(baseCharacter, req)).toBe(false);
    });

    it('fails when stat key does not exist', () => {
      const req: Requirement = { type: 'STAT_MIN', key: 'nonexistent', value: 1 };
      expect(checkRequirement(baseCharacter, req)).toBe(false);
    });
  });

  describe('CREDITS_MIN', () => {
    it('passes when credits meet minimum', () => {
      const req: Requirement = { type: 'CREDITS_MIN', value: 100 };
      expect(checkRequirement(baseCharacter, req)).toBe(true);
    });

    it('passes when credits exactly equal minimum', () => {
      const req: Requirement = { type: 'CREDITS_MIN', value: 250 };
      expect(checkRequirement(baseCharacter, req)).toBe(true);
    });

    it('fails when credits are below minimum', () => {
      const req: Requirement = { type: 'CREDITS_MIN', value: 500 };
      expect(checkRequirement(baseCharacter, req)).toBe(false);
    });
  });

  describe('FACTION_REPUTATION_MIN', () => {
    const context: RequirementContext = {
      factionReputations: { 'faction-red-market': 20 },
    };

    it('passes when faction reputation meets minimum', () => {
      const req: Requirement = { type: 'FACTION_REPUTATION_MIN', id: 'faction-red-market', value: 10 };
      expect(checkRequirement(baseCharacter, req, context)).toBe(true);
    });

    it('fails when faction reputation is below minimum', () => {
      const req: Requirement = { type: 'FACTION_REPUTATION_MIN', id: 'faction-red-market', value: 50 };
      expect(checkRequirement(baseCharacter, req, context)).toBe(false);
    });

    it('fails when faction not in context (defaults to 0)', () => {
      const req: Requirement = { type: 'FACTION_REPUTATION_MIN', id: 'unknown-faction', value: 5 };
      expect(checkRequirement(baseCharacter, req, context)).toBe(false);
    });
  });

  describe('ITEM_REQUIRED', () => {
    const context: RequirementContext = {
      inventoryItemIds: ['item-badge-123'],
    };

    it('passes when item is in inventory', () => {
      const req: Requirement = { type: 'ITEM_REQUIRED', id: 'item-badge-123' };
      expect(checkRequirement(baseCharacter, req, context)).toBe(true);
    });

    it('fails when item is not in inventory', () => {
      const req: Requirement = { type: 'ITEM_REQUIRED', id: 'item-not-there' };
      expect(checkRequirement(baseCharacter, req, context)).toBe(false);
    });
  });
});

describe('checkRequirements', () => {
  it('returns passed=true when all requirements are met', () => {
    const reqs: Requirement[] = [
      { type: 'STAT_MIN', key: 'stealth', value: 3 },
      { type: 'CREDITS_MIN', value: 100 },
    ];
    const result = checkRequirements(baseCharacter, reqs);
    expect(result.passed).toBe(true);
    expect(result.failedRequirements).toHaveLength(0);
  });

  it('returns passed=false when any requirement fails', () => {
    const reqs: Requirement[] = [
      { type: 'STAT_MIN', key: 'stealth', value: 3 },
      { type: 'STAT_MIN', key: 'hacking', value: 20 }, // fails
    ];
    const result = checkRequirements(baseCharacter, reqs);
    expect(result.passed).toBe(false);
    expect(result.failedRequirements).toHaveLength(1);
    expect(result.failedRequirements[0].key).toBe('hacking');
  });

  it('returns all failed requirements', () => {
    const reqs: Requirement[] = [
      { type: 'STAT_MIN', key: 'hacking', value: 20 },
      { type: 'CREDITS_MIN', value: 1000 },
    ];
    const result = checkRequirements(baseCharacter, reqs);
    expect(result.passed).toBe(false);
    expect(result.failedRequirements).toHaveLength(2);
  });

  it('returns passed=true when requirements array is empty', () => {
    const result = checkRequirements(baseCharacter, []);
    expect(result.passed).toBe(true);
    expect(result.failedRequirements).toHaveLength(0);
  });
});
