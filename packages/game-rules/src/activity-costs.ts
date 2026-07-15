import { OpportunityDefinition } from './types';

export const MIN_OPPORTUNITY_ENERGY_COST = 5;
export const MAX_OPPORTUNITY_ENERGY_COST = 25;

/**
 * Energy spent when accepting a gig/job/quest. Scales with the difficulty
 * class so harder work is more draining: DC 8 → 8, DC 10 → 9, DC 14 → 11,
 * DC 20 → 14, DC 30 → 19.
 */
export function calculateOpportunityEnergyCost(
  definition: Pick<OpportunityDefinition, 'difficulty'>,
): number {
  const difficulty = Number.isFinite(definition.difficulty) ? definition.difficulty : 10;
  const raw = 4 + Math.round(difficulty / 2);
  return Math.min(
    MAX_OPPORTUNITY_ENERGY_COST,
    Math.max(MIN_OPPORTUNITY_ENERGY_COST, raw),
  );
}
