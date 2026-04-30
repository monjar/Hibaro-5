import { assessTravel } from './travel.utils';

describe('assessTravel', () => {
  it('keeps local travel cheap and low risk', () => {
    expect(
      assessTravel({
        samePlanet: true,
        sameDistrict: true,
        destinationPlanetDanger: 2,
        destinationPlanetLaw: 6,
        destinationDistrictDanger: 2,
        destinationDistrictLaw: 6,
        destinationDistrictEconomy: 5,
      }),
    ).toEqual({
      travelCost: 0,
      travelRiskScore: 4,
      travelEnergyDelta: -6,
      wantedDelta: 0,
    });
  });

  it('raises cost and risk for unsafe interplanetary travel', () => {
    expect(
      assessTravel({
        samePlanet: false,
        sameDistrict: false,
        destinationPlanetDanger: 7,
        destinationPlanetLaw: 2,
        destinationDistrictDanger: 8,
        destinationDistrictLaw: 3,
        destinationDistrictEconomy: 2,
      }),
    ).toEqual({
      travelCost: 79,
      travelRiskScore: 20,
      travelEnergyDelta: -11,
      wantedDelta: 1,
    });
  });
});
