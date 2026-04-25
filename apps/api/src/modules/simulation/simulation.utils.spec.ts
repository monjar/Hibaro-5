import { CorporationStatus } from '@prisma/client';
import { clampWorldMetric, deriveCorporationStatus } from './simulation.utils';

describe('simulation.utils', () => {
  it('clamps world metrics inside the configured range', () => {
    expect(clampWorldMetric(12, 1, 10)).toBe(10);
    expect(clampWorldMetric(-5, 1, 10)).toBe(1);
    expect(clampWorldMetric(6, 1, 10)).toBe(6);
  });

  it('derives corporation status from cash, debt, and risk', () => {
    expect(deriveCorporationStatus(0.9, 0, 300)).toBe(CorporationStatus.BANKRUPT);
    expect(deriveCorporationStatus(0.6, 100, 200)).toBe(CorporationStatus.DECLINING);
    expect(deriveCorporationStatus(0.2, 500, 200)).toBe(CorporationStatus.GROWING);
    expect(deriveCorporationStatus(0.4, 300, 250)).toBe(CorporationStatus.STABLE);
  });
});
