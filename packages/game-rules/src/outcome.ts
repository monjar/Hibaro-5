import {
  CharacterStats,
  OpportunityDefinition,
  OpportunityOutcome,
  Risk,
  RiskConsequence,
  Reward,
} from './types';
import { rollOpportunityCheck } from './success-chance';

export function rollOpportunityOutcome(
  character: CharacterStats,
  opportunity: OpportunityDefinition,
  randomSeed?: number,
): OpportunityOutcome {
  const check = rollOpportunityCheck(character, opportunity, randomSeed);
  const success = check.success;

  const appliedRewards: Reward[] = [];
  const triggeredRisks: { risk: Risk; consequences: RiskConsequence[] }[] = [];

  if (success) {
    // All rewards are applied on success
    appliedRewards.push(...opportunity.rewards);
  } else {
    // Roll for each risk on failure
    for (const risk of opportunity.risks) {
      const riskRoll = Math.random();
      if (riskRoll < risk.probability) {
        triggeredRisks.push({
          risk,
          consequences: risk.consequences,
        });
      }
    }
  }

  return {
    success,
    roll: check.d20Roll,
    successChance: Math.round(check.successChance * 1000) / 1000,
    checkTotal: check.checkTotal,
    difficultyClass: check.difficultyClass,
    statModifier: check.statModifier,
    relevantStatTotal: check.relevantStatTotal,
    checkLabel: check.label,
    appliedRewards,
    triggeredRisks,
  };
}
