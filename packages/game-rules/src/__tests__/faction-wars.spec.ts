import {
  FACTION_WAR_HYSTERESIS,
  FACTION_WAR_NEUTRAL_THRESHOLD,
  factionPresenceScore,
  resolveDistrictContest,
} from '../faction-wars';

describe('factionPresenceScore', () => {
  it('scales with influence share and local assets', () => {
    const bare = factionPresenceScore({
      factionId: 'f1',
      influenceShare: 0.5,
      buildingsInDistrict: 0,
      buildingsOnPlanet: 0,
      jitter: 0.5,
    });
    const withAssets = factionPresenceScore({
      factionId: 'f1',
      influenceShare: 0.5,
      buildingsInDistrict: 1,
      buildingsOnPlanet: 2,
      jitter: 0.5,
    });
    expect(withAssets).toBeGreaterThan(bare);
    expect(bare).toBe(50);
  });

  it('jitter shifts the score within ±15%', () => {
    const low = factionPresenceScore({
      factionId: 'f1',
      influenceShare: 0.5,
      buildingsInDistrict: 0,
      buildingsOnPlanet: 0,
      jitter: 0,
    });
    const high = factionPresenceScore({
      factionId: 'f1',
      influenceShare: 0.5,
      buildingsInDistrict: 0,
      buildingsOnPlanet: 0,
      jitter: 1,
    });
    expect(low).toBe(42.5);
    expect(high).toBe(57.5);
  });

  it('clamps negative influence to zero', () => {
    expect(
      factionPresenceScore({
        factionId: 'f1',
        influenceShare: -1,
        buildingsInDistrict: 3,
        buildingsOnPlanet: 3,
        jitter: 1,
      }),
    ).toBe(0);
  });
});

describe('resolveDistrictContest', () => {
  it('keeps the incumbent unless clearly out-mustered', () => {
    const result = resolveDistrictContest('incumbent', [
      { factionId: 'incumbent', score: 40 },
      { factionId: 'challenger', score: 40 * FACTION_WAR_HYSTERESIS - 1 },
    ]);
    expect(result.flipped).toBe(false);
    expect(result.controllingFactionId).toBe('incumbent');
  });

  it('flips control when the challenger exceeds the hysteresis bar', () => {
    const result = resolveDistrictContest('incumbent', [
      { factionId: 'incumbent', score: 40 },
      { factionId: 'challenger', score: 40 * FACTION_WAR_HYSTERESIS + 1 },
    ]);
    expect(result.flipped).toBe(true);
    expect(result.controllingFactionId).toBe('challenger');
  });

  it('lets the strongest faction claim a neutral district past the threshold', () => {
    const claimed = resolveDistrictContest(null, [
      { factionId: 'f1', score: FACTION_WAR_NEUTRAL_THRESHOLD + 1 },
      { factionId: 'f2', score: 5 },
    ]);
    expect(claimed.flipped).toBe(true);
    expect(claimed.controllingFactionId).toBe('f1');

    const unclaimed = resolveDistrictContest(null, [
      { factionId: 'f1', score: FACTION_WAR_NEUTRAL_THRESHOLD - 1 },
    ]);
    expect(unclaimed.flipped).toBe(false);
    expect(unclaimed.controllingFactionId).toBeNull();
  });

  it('handles empty presence lists', () => {
    const result = resolveDistrictContest('incumbent', []);
    expect(result.flipped).toBe(false);
    expect(result.controllingFactionId).toBe('incumbent');
  });
});
