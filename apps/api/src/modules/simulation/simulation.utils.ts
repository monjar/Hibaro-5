import { CorporationStatus } from '@prisma/client';

export function clampWorldMetric(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function deriveCorporationStatus(riskOfBankruptcy: number, cash: number, debt: number) {
  if (cash <= 0 || riskOfBankruptcy >= 0.8) {
    return CorporationStatus.BANKRUPT;
  }
  if (debt > cash || riskOfBankruptcy >= 0.55) {
    return CorporationStatus.DECLINING;
  }
  if (cash > debt * 1.4 && riskOfBankruptcy <= 0.25) {
    return CorporationStatus.GROWING;
  }
  return CorporationStatus.STABLE;
}
