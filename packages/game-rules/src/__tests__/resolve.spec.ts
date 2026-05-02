import { resolveOpportunity } from '../resolve';
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

const smugglingGig: OpportunityDefinition = {
  id: 'gig-medical-crates',
  title: 'Move the Medical Crates',
  kind: 'GIG',
  type: 'SMUGGLING',
  difficulty: 12,
  requirements: [{ type: 'STAT_MIN', key: 'stealth', value: 5 }],
  rewards: [
    { type: 'CREDITS', value: 300 },
    { type: 'FACTION_REPUTATION', factionId: 'faction-red-market', value: 5 },
    { type: 'CORPORATION_REPUTATION', corporationId: 'corp-helix', value: -2 },
  ],
  risks: [
    {
      level: 'MEDIUM',
      type: 'LEGAL',
      probability: 0.3,
      consequences: [{ type: 'MODIFY_WANTED_LEVEL', value: 1 }],
    },
  ],
};

describe('resolveOpportunity', () => {
  describe('on success (randomSeed = 0.75)', () => {
    it('applies credits reward', () => {
      const result = resolveOpportunity(baseCharacter, smugglingGig, 0.75);
      expect(result.outcome.success).toBe(true);
      expect(result.rewardResult).not.toBeNull();
      expect(result.rewardResult!.creditsDelta).toBe(300);
      expect(result.characterUpdates.credits).toBe(250 + 300);
    });

    it('applies faction reputation reward', () => {
      const result = resolveOpportunity(baseCharacter, smugglingGig, 0.75);
      expect(result.rewardResult!.factionReputationChanges['faction-red-market']).toBe(5);
    });

    it('applies negative corporation reputation reward', () => {
      const result = resolveOpportunity(baseCharacter, smugglingGig, 0.75);
      expect(result.rewardResult!.corporationReputationChanges['corp-helix']).toBe(-2);
    });

    it('does not apply risks on success', () => {
      const result = resolveOpportunity(baseCharacter, smugglingGig, 0.75);
      expect(result.riskResult).toBeNull();
    });
  });

  describe('on failure (randomSeed = 0.1)', () => {
    it('does not apply rewards on failure', () => {
      const result = resolveOpportunity(baseCharacter, smugglingGig, 0.1);
      expect(result.outcome.success).toBe(false);
      expect(result.rewardResult).toBeNull();
    });

    it('may increase wanted level from LEGAL risk', () => {
      // Force the risk to trigger by using a seeded outcome with probability 0.3
      // We use randomSeed 0.99 for the main roll (failure), and risks use Math.random()
      // We mock Math.random to control risk roll
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.1); // below 0.3, so risk triggers

      const result = resolveOpportunity(baseCharacter, smugglingGig, 0.1);
      expect(result.outcome.success).toBe(false);
      expect(result.riskResult).not.toBeNull();
      expect(result.riskResult!.wantedLevelDelta).toBe(1);
      expect(result.characterUpdates.wantedLevel).toBe(1);

      Math.random = originalRandom;
    });
  });

  describe('edge cases', () => {
    it('returns correct structure with empty rewards and risks', () => {
      const emptyOpp: OpportunityDefinition = {
        id: 'empty-opp',
        title: 'Empty',
        kind: 'JOB',
        type: 'DELIVERY',
        difficulty: 10,
        requirements: [],
        rewards: [],
        risks: [],
      };
      const result = resolveOpportunity(baseCharacter, emptyOpp, 0.75);
      expect(result.outcome).toBeDefined();
      expect(result.characterUpdates).toBeDefined();
    });

    it('health cannot go below 0 from risk damage', () => {
      const char = { ...baseCharacter, health: 5 };
      const injuryOpp: OpportunityDefinition = {
        id: 'injury-opp',
        title: 'Dangerous Gig',
        kind: 'GIG',
        type: 'BOUNTY',
        difficulty: 20,
        requirements: [],
        rewards: [],
        risks: [
          {
            level: 'HIGH',
            type: 'INJURY',
            probability: 1.0, // always triggers
            consequences: [{ type: 'MODIFY_STAT', key: 'health', value: -50 }],
          },
        ],
      };
      const result = resolveOpportunity(char, injuryOpp, 0.1); // force failure
      if (result.characterUpdates.health !== undefined) {
        expect(result.characterUpdates.health).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
