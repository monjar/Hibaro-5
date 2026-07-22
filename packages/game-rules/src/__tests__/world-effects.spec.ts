import {
  REWARD_MULTIPLIER_MAX,
  REWARD_MULTIPLIER_MIN,
  collectActiveEffects,
  dangerDeltaFor,
  economyDeltaFor,
  rewardMultiplierFor,
  riskDeltaFor,
  spawnEventIds,
} from '../world-effects';

const planetEvent = {
  scope: 'PLANET',
  affectedEntities: [{ type: 'PLANET', id: 'planet-1' }],
  effects: [{ type: 'MODIFY_REWARD', target: 'DELIVERY', modifier: 0.2 }],
};

const districtEvent = {
  scope: 'DISTRICT',
  affectedEntities: [{ type: 'DISTRICT', id: 'district-1' }],
  effects: [
    { type: 'MODIFY_RISK', target: 'SMUGGLING', modifier: -0.15 },
    { type: 'MODIFY_DANGER', target: 'district-1', modifier: 2 },
  ],
};

const worldEvent = {
  scope: 'WORLD',
  affectedEntities: [],
  effects: [{ type: 'MODIFY_REWARD', target: 'ALL', modifier: 0.1 }],
};

describe('collectActiveEffects', () => {
  it('includes WORLD-scope events everywhere', () => {
    const effects = collectActiveEffects([worldEvent], { planetId: 'x', districtId: 'y' });
    expect(effects).toHaveLength(1);
  });

  it('scopes planet/district events to their affected entities', () => {
    expect(
      collectActiveEffects([planetEvent, districtEvent], {
        planetId: 'planet-1',
        districtId: 'other',
      }),
    ).toHaveLength(1);
    expect(
      collectActiveEffects([planetEvent, districtEvent], {
        planetId: 'other',
        districtId: 'district-1',
      }),
    ).toHaveLength(2);
    expect(
      collectActiveEffects([planetEvent, districtEvent], {
        planetId: 'other',
        districtId: 'elsewhere',
      }),
    ).toHaveLength(0);
  });

  it('tolerates malformed payloads', () => {
    expect(
      collectActiveEffects(
        [{ scope: 'PLANET', affectedEntities: 'garbage', effects: 'not-an-array' }],
        { planetId: 'planet-1' },
      ),
    ).toEqual([]);
  });
});

describe('rewardMultiplierFor', () => {
  it('applies matching and ALL-target modifiers additively', () => {
    const effects = collectActiveEffects([planetEvent, worldEvent], {
      planetId: 'planet-1',
    });
    expect(rewardMultiplierFor(effects, 'DELIVERY')).toBeCloseTo(1.3);
    expect(rewardMultiplierFor(effects, 'HACKING')).toBeCloseTo(1.1);
  });

  it('clamps to sane bounds', () => {
    const boom = [{ type: 'MODIFY_REWARD' as const, target: 'ALL', modifier: 99 }];
    const bust = [{ type: 'MODIFY_REWARD' as const, target: 'ALL', modifier: -99 }];
    expect(rewardMultiplierFor(boom, 'DELIVERY')).toBe(REWARD_MULTIPLIER_MAX);
    expect(rewardMultiplierFor(bust, 'DELIVERY')).toBe(REWARD_MULTIPLIER_MIN);
  });
});

describe('riskDeltaFor / dangerDeltaFor / economyDeltaFor', () => {
  it('sums risk shifts for the matching opportunity type', () => {
    const effects = collectActiveEffects([districtEvent], { districtId: 'district-1' });
    expect(riskDeltaFor(effects, 'SMUGGLING')).toBeCloseTo(-0.15);
    expect(riskDeltaFor(effects, 'DELIVERY')).toBe(0);
  });

  it('reads danger deltas for the targeted district', () => {
    const effects = collectActiveEffects([districtEvent], { districtId: 'district-1' });
    expect(dangerDeltaFor(effects, 'district-1')).toBe(2);
    expect(dangerDeltaFor(effects, 'district-2')).toBe(0);
  });

  it('converts economy modifiers to level points', () => {
    const rally = {
      scope: 'PLANET',
      affectedEntities: [{ type: 'PLANET', id: 'planet-1' }],
      effects: [{ type: 'MODIFY_ECONOMY', target: 'planet-1', modifier: 0.15 }],
    };
    const effects = collectActiveEffects([rally], { planetId: 'planet-1' });
    expect(economyDeltaFor(effects, 'planet-1')).toBeCloseTo(1.5);
  });
});

describe('spawnEventIds', () => {
  it('extracts spawn targets and ignores malformed entries', () => {
    expect(
      spawnEventIds([
        { type: 'SPAWN_EVENT', eventId: 'event-a' },
        { type: 'SPAWN_EVENT' },
        { type: 'MODIFY_RISK', modifier: 1 },
      ]),
    ).toEqual(['event-a']);
    expect(spawnEventIds(null)).toEqual([]);
  });
});
