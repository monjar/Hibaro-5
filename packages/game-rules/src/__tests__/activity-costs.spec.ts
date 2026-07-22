import {
  MAX_OPPORTUNITY_ENERGY_COST,
  MIN_OPPORTUNITY_ENERGY_COST,
  calculateOpportunityEnergyCost,
} from '../activity-costs';

describe('calculateOpportunityEnergyCost', () => {
  it('scales with difficulty', () => {
    expect(calculateOpportunityEnergyCost({ difficulty: 10 })).toBe(9);
    expect(calculateOpportunityEnergyCost({ difficulty: 14 })).toBe(11);
    expect(calculateOpportunityEnergyCost({ difficulty: 20 })).toBe(14);
  });

  it('never drops below the minimum cost', () => {
    expect(calculateOpportunityEnergyCost({ difficulty: 0 })).toBe(MIN_OPPORTUNITY_ENERGY_COST);
    expect(calculateOpportunityEnergyCost({ difficulty: 1 })).toBe(MIN_OPPORTUNITY_ENERGY_COST);
  });

  it('never exceeds the maximum cost', () => {
    expect(calculateOpportunityEnergyCost({ difficulty: 500 })).toBe(MAX_OPPORTUNITY_ENERGY_COST);
  });

  it('falls back to DC 10 pricing for invalid difficulty', () => {
    expect(calculateOpportunityEnergyCost({ difficulty: Number.NaN })).toBe(9);
  });
});
