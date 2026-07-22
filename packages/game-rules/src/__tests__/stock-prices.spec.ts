import {
  computeNextStockPrice,
  MAX_TICK_PERCENT_MOVE,
  PRICE_FLOOR,
} from '../stock-prices';

describe('computeNextStockPrice', () => {
  it('respects the price floor', () => {
    const result = computeNextStockPrice({
      currentPrice: 1.5,
      volatility: 1,
      drift: -100,
      randomSeed: 0.01,
    });
    expect(result.nextPrice).toBeGreaterThanOrEqual(PRICE_FLOOR);
  });

  it('clamps single-tick moves to MAX_TICK_PERCENT_MOVE', () => {
    const start = 100;
    // Try to push the price up by 1000 — clamp should hold it to +25%.
    const result = computeNextStockPrice({
      currentPrice: start,
      volatility: 0,
      drift: 1000,
      randomSeed: 0.5,
    });
    expect(result.nextPrice).toBeLessThanOrEqual(start * (1 + MAX_TICK_PERCENT_MOVE) + 0.01);
  });

  it('is deterministic for the same seed', () => {
    const a = computeNextStockPrice({
      currentPrice: 100,
      volatility: 0.3,
      drift: 0,
      randomSeed: 0.4242,
    });
    const b = computeNextStockPrice({
      currentPrice: 100,
      volatility: 0.3,
      drift: 0,
      randomSeed: 0.4242,
    });
    expect(a.nextPrice).toBe(b.nextPrice);
  });

  it('produces different prices for different seeds', () => {
    const seeds = [0.1, 0.3, 0.5, 0.7, 0.9];
    const prices = seeds.map(
      (s) =>
        computeNextStockPrice({
          currentPrice: 100,
          volatility: 0.5,
          drift: 0,
          randomSeed: s,
        }).nextPrice,
    );
    const unique = new Set(prices);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('reports correct delta and percentChange', () => {
    const result = computeNextStockPrice({
      currentPrice: 100,
      volatility: 0,
      drift: 5,
      randomSeed: 0.5,
    });
    // With volatility 0 and seed 0.5: jitter is 0, so next = 100 + 5 = 105.
    expect(result.nextPrice).toBeCloseTo(105, 1);
    expect(result.delta).toBeCloseTo(5, 1);
    expect(result.percentChange).toBeCloseTo(5, 1);
  });

  it('handles zero current price gracefully', () => {
    const result = computeNextStockPrice({
      currentPrice: 0,
      volatility: 0.3,
      drift: 0,
      randomSeed: 0.5,
    });
    expect(result.percentChange).toBe(0);
    expect(result.nextPrice).toBeGreaterThanOrEqual(PRICE_FLOOR);
  });
});

describe('deriveSubSeed', () => {
  const { deriveSubSeed } = require('../stock-prices');

  it('is deterministic for the same seed and key', () => {
    expect(deriveSubSeed(0.42, 'corp-a')).toBe(deriveSubSeed(0.42, 'corp-a'));
  });

  it('differs across keys and seeds', () => {
    expect(deriveSubSeed(0.42, 'corp-a')).not.toBe(deriveSubSeed(0.42, 'corp-b'));
    expect(deriveSubSeed(0.42, 'corp-a')).not.toBe(deriveSubSeed(0.43, 'corp-a'));
  });

  it('stays in [0, 1)', () => {
    for (const seed of [0, 0.1, 0.99, 123.456]) {
      const value = deriveSubSeed(seed, 'corp-xyz');
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
