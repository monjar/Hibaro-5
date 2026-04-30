import { CharacterStats, Risk, RiskConsequence } from './types';

export interface RiskApplicationResult {
  wantedLevelDelta: number;
  healthDelta: number;
  creditsDelta: number;
  factionReputationChanges: Record<string, number>;
  corporationReputationChanges: Record<string, number>;
}

export function applyRisk(
  character: CharacterStats,
  consequence: RiskConsequence,
): Partial<RiskApplicationResult> {
  switch (consequence.type) {
    case 'MODIFY_WANTED_LEVEL':
      return { wantedLevelDelta: consequence.value ?? 1 };

    case 'MODIFY_STAT': {
      if (consequence.key === 'health') {
        return { healthDelta: consequence.value ?? -10 };
      }
      return {};
    }

    case 'MODIFY_CREDITS':
      return { creditsDelta: consequence.value ?? 0 };

    case 'MODIFY_FACTION_REPUTATION': {
      if (!consequence.factionId) return {};
      return { factionReputationChanges: { [consequence.factionId]: consequence.value ?? -5 } };
    }

    case 'MODIFY_CORPORATION_REPUTATION': {
      if (!consequence.corporationId) return {};
      return {
        corporationReputationChanges: { [consequence.corporationId]: consequence.value ?? -5 },
      };
    }

    default:
      return {};
  }
}

export function applyRisks(character: CharacterStats, risks: Risk[]): RiskApplicationResult {
  const result: RiskApplicationResult = {
    wantedLevelDelta: 0,
    healthDelta: 0,
    creditsDelta: 0,
    factionReputationChanges: {},
    corporationReputationChanges: {},
  };

  for (const risk of risks) {
    // Roll to see if this risk is triggered
    if (Math.random() < risk.probability) {
      for (const consequence of risk.consequences) {
        const partial = applyRisk(character, consequence);
        if (partial.wantedLevelDelta) result.wantedLevelDelta += partial.wantedLevelDelta;
        if (partial.healthDelta) result.healthDelta += partial.healthDelta;
        if (partial.creditsDelta) result.creditsDelta += partial.creditsDelta;
        if (partial.factionReputationChanges) {
          for (const [id, val] of Object.entries(partial.factionReputationChanges)) {
            result.factionReputationChanges[id] = (result.factionReputationChanges[id] ?? 0) + val;
          }
        }
        if (partial.corporationReputationChanges) {
          for (const [id, val] of Object.entries(partial.corporationReputationChanges)) {
            result.corporationReputationChanges[id] =
              (result.corporationReputationChanges[id] ?? 0) + val;
          }
        }
      }
    }
  }

  return result;
}
