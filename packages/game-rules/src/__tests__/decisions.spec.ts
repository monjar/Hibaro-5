import {
  DecisionRecord,
  computeFinalSuccess,
  getPendingDecisionEvents,
  resolveChoice,
  totalDecisionCreditsBonus,
  totalDecisionRollBonus,
} from '../decisions';
import { CharacterStats } from '../types';

const character: CharacterStats = {
  id: 'char-1',
  name: 'Nova',
  credits: 500,
  health: 100,
  maxHealth: 100,
  energy: 100,
  maxEnergy: 100,
  wantedLevel: 0,
  strength: 5,
  agility: 5,
  intelligence: 5,
  charisma: 5,
  hacking: 10,
  combat: 5,
  stealth: 5,
  engineering: 5,
  reputation: 0,
};

const MINUTE = 60_000;

describe('getPendingDecisionEvents', () => {
  const events = [
    { minute: 2, description: 'no choices here' },
    { minute: 4, description: 'patrol', choices: [{ id: 'a', label: 'A' }] },
    { minute: 9, description: 'later', choices: [{ id: 'b', label: 'B' }] },
  ];

  it('returns only due, unanswered events that have choices', () => {
    const start = 0;
    expect(getPendingDecisionEvents(events, start, 3 * MINUTE, [])).toEqual([]);
    expect(getPendingDecisionEvents(events, start, 5 * MINUTE, []).map((e) => e.minute)).toEqual([
      4,
    ]);
    expect(getPendingDecisionEvents(events, start, 10 * MINUTE, []).map((e) => e.minute)).toEqual([
      4, 9,
    ]);
  });

  it('excludes answered minutes', () => {
    const answered: DecisionRecord[] = [
      { minute: 4, choiceId: 'a', appliedEffects: {}, decidedAt: 'now' },
    ];
    expect(
      getPendingDecisionEvents(events, 0, 10 * MINUTE, answered).map((e) => e.minute),
    ).toEqual([9]);
  });

  it('handles missing timelines', () => {
    expect(getPendingDecisionEvents(null, 0, MINUTE, [])).toEqual([]);
    expect(getPendingDecisionEvents(undefined, 0, MINUTE, null)).toEqual([]);
  });
});

describe('resolveChoice', () => {
  it('applies effects directly when there is no stat check', () => {
    const result = resolveChoice(
      { id: 'bribe', label: 'Bribe', effects: { rollBonus: 3 } },
      character,
    );
    expect(result.appliedEffects).toEqual({ rollBonus: 3 });
    expect(result.checkRoll).toBeUndefined();
  });

  it('passes a stat check on a high roll and applies effects', () => {
    const result = resolveChoice(
      {
        id: 'hack',
        label: 'Hack',
        statCheck: { stat: 'hacking', dc: 13 },
        effects: { rollBonus: 5 },
        failEffects: { rollBonus: -2 },
      },
      character,
      () => 0.99, // d20 = 20
    );
    expect(result.checkPassed).toBe(true);
    expect(result.appliedEffects).toEqual({ rollBonus: 5 });
  });

  it('fails a stat check on a natural 1 and applies failEffects', () => {
    const result = resolveChoice(
      {
        id: 'hack',
        label: 'Hack',
        statCheck: { stat: 'hacking', dc: 2 },
        effects: { rollBonus: 5 },
        failEffects: { rollBonus: -2, wantedDelta: 1 },
      },
      character,
      () => 0, // d20 = 1
    );
    expect(result.checkPassed).toBe(false);
    expect(result.appliedEffects).toEqual({ rollBonus: -2, wantedDelta: 1 });
  });

  it('adds the stat modifier to the check total', () => {
    // roll 10, hacking 10 → modifier 1 → total 11 vs DC 11 = pass
    const result = resolveChoice(
      {
        id: 'hack',
        label: 'Hack',
        statCheck: { stat: 'hacking', dc: 11 },
        effects: { rollBonus: 1 },
        failEffects: { rollBonus: -1 },
      },
      character,
      () => 9.5 / 20, // d20 = 10
    );
    expect(result.checkTotal).toBe(11);
    expect(result.checkPassed).toBe(true);
  });
});

describe('decision totals and final success', () => {
  const decisions: DecisionRecord[] = [
    { minute: 4, choiceId: 'a', appliedEffects: { rollBonus: 3 }, decidedAt: 'now' },
    {
      minute: 9,
      choiceId: 'b',
      appliedEffects: { rollBonus: -1, creditsBonus: 50 },
      decidedAt: 'now',
    },
  ];

  it('sums roll and credit bonuses', () => {
    expect(totalDecisionRollBonus(decisions)).toBe(2);
    expect(totalDecisionCreditsBonus(decisions)).toBe(50);
    expect(totalDecisionRollBonus(null)).toBe(0);
  });

  it('can rescue a failed roll', () => {
    const planned = { roll: 9, checkTotal: 10, difficultyClass: 12 };
    expect(computeFinalSuccess(planned, 0).success).toBe(false);
    expect(computeFinalSuccess(planned, 2).success).toBe(true);
  });

  it('can sink a successful roll with penalties', () => {
    const planned = { roll: 13, checkTotal: 14, difficultyClass: 12 };
    expect(computeFinalSuccess(planned, 0).success).toBe(true);
    expect(computeFinalSuccess(planned, -3).success).toBe(false);
  });

  it('never overrides natural 1s and 20s', () => {
    expect(computeFinalSuccess({ roll: 20, checkTotal: 5, difficultyClass: 30 }, 0).success).toBe(
      true,
    );
    expect(
      computeFinalSuccess({ roll: 1, checkTotal: 25, difficultyClass: 10 }, 10).success,
    ).toBe(false);
  });
});
