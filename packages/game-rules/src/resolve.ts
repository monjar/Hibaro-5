import { CharacterStats, OpportunityDefinition, OpportunityOutcome } from './types';
import { rollOpportunityOutcome } from './outcome';
import { applyRewards, RewardApplicationResult } from './rewards';
import { applyRisks, RiskApplicationResult } from './risks';

export interface ResolvedOpportunity {
  outcome: OpportunityOutcome;
  rewardResult: RewardApplicationResult | null;
  riskResult: RiskApplicationResult | null;
  characterUpdates: Partial<CharacterStats>;
}

export function resolveOpportunity(
  character: CharacterStats,
  opportunity: OpportunityDefinition,
  randomSeed?: number,
): ResolvedOpportunity {
  const outcome = rollOpportunityOutcome(character, opportunity, randomSeed);

  let rewardResult: RewardApplicationResult | null = null;
  let riskResult: RiskApplicationResult | null = null;
  const characterUpdates: Partial<CharacterStats> = {};

  if (outcome.success) {
    rewardResult = applyRewards(character, outcome.appliedRewards);

    // Apply character-level changes from rewards
    if (rewardResult.creditsDelta) {
      characterUpdates.credits = character.credits + rewardResult.creditsDelta;
    }
    for (const [stat, delta] of Object.entries(rewardResult.statChanges)) {
      if (delta !== 0) {
        (characterUpdates as any)[stat] = ((character as any)[stat] ?? 0) + delta;
      }
    }
  } else {
    // Apply triggered risk consequences
    const triggeredConsequences = outcome.triggeredRisks.flatMap((tr) => tr.consequences);

    // Build risk-application result from triggered consequences
    riskResult = {
      wantedLevelDelta: 0,
      healthDelta: 0,
      creditsDelta: 0,
      factionReputationChanges: {},
      corporationReputationChanges: {},
    };

    for (const consequence of triggeredConsequences) {
      if (consequence.type === 'MODIFY_WANTED_LEVEL') {
        riskResult.wantedLevelDelta += consequence.value ?? 1;
      } else if (consequence.type === 'MODIFY_STAT' && consequence.key === 'health') {
        riskResult.healthDelta += consequence.value ?? -10;
      } else if (consequence.type === 'MODIFY_CREDITS') {
        riskResult.creditsDelta += consequence.value ?? 0;
      }
    }

    if (riskResult.wantedLevelDelta !== 0) {
      characterUpdates.wantedLevel = Math.max(0, character.wantedLevel + riskResult.wantedLevelDelta);
    }
    if (riskResult.healthDelta !== 0) {
      characterUpdates.health = Math.max(0, Math.min(character.maxHealth, character.health + riskResult.healthDelta));
    }
    if (riskResult.creditsDelta !== 0) {
      characterUpdates.credits = character.credits + riskResult.creditsDelta;
    }
  }

  return { outcome, rewardResult, riskResult, characterUpdates };
}
