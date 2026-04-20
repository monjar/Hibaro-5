import { CharacterStats, OpportunityDefinition, OpportunityOutcome, Risk, RiskConsequence, Reward } from './types';
import { calculateOpportunitySuccessChance } from './success-chance';

export function rollOpportunityOutcome(
  character: CharacterStats,
  opportunity: OpportunityDefinition,
  randomSeed?: number,
): OpportunityOutcome {
  const successChance = calculateOpportunitySuccessChance(character, opportunity);
  const roll = randomSeed !== undefined ? randomSeed : Math.random();
  const success = roll <= successChance;

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
    roll: Math.round(roll * 1000) / 1000,
    successChance: Math.round(successChance * 1000) / 1000,
    appliedRewards,
    triggeredRisks,
  };
}
