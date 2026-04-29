/**
 * Deterministic-when-seeded price movement rules.
 *
 * Drift component:  pressure (planet economy, employment, events, bankruptcy)
 * Random walk:      driven by volatility, scaled to current price
 * Floor:            $1 (corporations cannot reach 0 from this rule)
 */

export interface PriceMovementInput {
  currentPrice: number;
  volatility: number; // 0..1
  drift: number; // can be positive or negative
  randomSeed?: number; // optional deterministic seed in [0, 1)
}

export interface PriceMovementResult {
  nextPrice: number;
  delta: number;
  percentChange: number;
}

/** Mulberry32 PRNG — deterministic, tiny, good enough for game RNG. */
function mulberry32(seed: number): () => number {
  let t = Math.floor((seed % 1) * 0xffffffff) || 1;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const PRICE_FLOOR = 1;
export const MAX_TICK_PERCENT_MOVE = 0.25;

export function computeNextStockPrice(input: PriceMovementInput): PriceMovementResult {
  const rand = input.randomSeed !== undefined ? mulberry32(input.randomSeed)() : Math.random();
  // Map [0,1) → [-1, 1] for symmetric jitter.
  const jitter = rand * 2 - 1;

  const volatilityMove = input.currentPrice * input.volatility * jitter * 0.6;
  const rawNext = input.currentPrice + input.drift + volatilityMove;

  // Clamp single-tick moves to ±25% so the chart doesn't go feral.
  const minNext = input.currentPrice * (1 - MAX_TICK_PERCENT_MOVE);
  const maxNext = input.currentPrice * (1 + MAX_TICK_PERCENT_MOVE);
  const clamped = Math.min(maxNext, Math.max(minNext, rawNext));
  const nextPrice = Math.max(PRICE_FLOOR, Number(clamped.toFixed(2)));

  const delta = Number((nextPrice - input.currentPrice).toFixed(2));
  const percentChange =
    input.currentPrice > 0
      ? Number(((delta / input.currentPrice) * 100).toFixed(2))
      : 0;

  return { nextPrice, delta, percentChange };
}
