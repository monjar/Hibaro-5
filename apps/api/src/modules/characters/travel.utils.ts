export interface TravelFactors {
  samePlanet: boolean;
  sameDistrict: boolean;
  destinationPlanetDanger: number;
  destinationPlanetLaw: number;
  destinationDistrictDanger: number;
  destinationDistrictLaw: number;
  destinationDistrictEconomy: number;
  currentDistrictDanger?: number;
}

export interface TravelAssessment {
  travelCost: number;
  travelRiskScore: number;
  travelEnergyDelta: number;
  wantedDelta: number;
}

export function clampMetric(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function assessTravel(factors: TravelFactors): TravelAssessment {
  const interPlanetCost = factors.samePlanet ? 0 : 35 + factors.destinationPlanetDanger * 3;
  const districtCost = factors.sameDistrict
    ? 0
    : 8 + factors.destinationDistrictDanger + Math.max(0, 4 - factors.destinationDistrictEconomy);
  const lawModifier =
    Math.max(0, 5 - factors.destinationPlanetLaw) + Math.max(0, 5 - factors.destinationDistrictLaw);
  const riskScore = clampMetric(
    factors.destinationPlanetDanger + factors.destinationDistrictDanger + lawModifier,
    0,
    20,
  );
  const wantedDelta = riskScore >= 12 ? 1 : 0;
  const travelEnergyDelta = -clampMetric(4 + Math.ceil(riskScore / 3), 4, 12);

  return {
    travelCost: interPlanetCost + districtCost + lawModifier,
    travelRiskScore: riskScore,
    travelEnergyDelta,
    wantedDelta,
  };
}
