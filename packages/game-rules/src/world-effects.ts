/**
 * World-event effects engine.
 *
 * Admins author `WorldEvent.effects` JSON; this module turns those entries
 * into live gameplay modifiers:
 *
 *  - MODIFY_REWARD  { target: <OpportunityType|'ALL'>, modifier: ±fraction }
 *      scales credit payouts for matching opportunity types
 *  - MODIFY_RISK    { target: <OpportunityType|'ALL'>, modifier: ±fraction }
 *      shifts failure-risk probabilities for matching opportunity types
 *  - MODIFY_DANGER  { target: <districtId?>, modifier: ±levels }
 *      raises/lowers effective district danger for travel
 *  - MODIFY_ECONOMY { target: <planetId?>, modifier: ±fraction }
 *      pushes the planetary economy drift up or down
 *  - SPAWN_EVENT    { eventId } — activates a follow-up event (handled by
 *      the simulation when the carrying event activates)
 *
 * An event's effects only apply where the event applies: WORLD scope is
 * global; otherwise the event must list the planet/district in
 * `affectedEntities` (or match via its scope target).
 */

export interface WorldEventEffect {
  type: 'MODIFY_REWARD' | 'MODIFY_RISK' | 'MODIFY_DANGER' | 'MODIFY_ECONOMY' | 'SPAWN_EVENT';
  target?: string;
  modifier?: number;
  eventId?: string;
}

export interface ActiveWorldEventLike {
  scope: string;
  affectedEntities: unknown;
  effects: unknown;
}

export interface EffectLocation {
  planetId?: string | null;
  districtId?: string | null;
}

export const REWARD_MULTIPLIER_MIN = 0.25;
export const REWARD_MULTIPLIER_MAX = 3;

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? (value.filter((entry) => entry && typeof entry === 'object') as Array<
        Record<string, unknown>
      >)
    : [];
}

function eventAppliesAt(event: ActiveWorldEventLike, location: EffectLocation): boolean {
  if (event.scope === 'WORLD') return true;
  const entities = asArray(event.affectedEntities);
  if (entities.length === 0) return false;
  return entities.some((entity) => {
    const id = typeof entity.id === 'string' ? entity.id : null;
    if (!id) return false;
    return id === location.planetId || id === location.districtId;
  });
}

/** All effects from active events that apply at the given location. */
export function collectActiveEffects(
  events: ActiveWorldEventLike[],
  location: EffectLocation,
): WorldEventEffect[] {
  const collected: WorldEventEffect[] = [];
  for (const event of events) {
    if (!eventAppliesAt(event, location)) continue;
    for (const raw of asArray(event.effects)) {
      if (typeof raw.type !== 'string') continue;
      collected.push(raw as unknown as WorldEventEffect);
    }
  }
  return collected;
}

function matchesType(target: string | undefined, opportunityType: string): boolean {
  return target === undefined || target === 'ALL' || target === opportunityType;
}

/** Credit payout multiplier for an opportunity type, clamped to sane bounds. */
export function rewardMultiplierFor(
  effects: WorldEventEffect[],
  opportunityType: string,
): number {
  const total = effects
    .filter(
      (effect) => effect.type === 'MODIFY_REWARD' && matchesType(effect.target, opportunityType),
    )
    .reduce((sum, effect) => sum + (Number(effect.modifier) || 0), 0);
  const multiplier = 1 + total;
  return Math.min(REWARD_MULTIPLIER_MAX, Math.max(REWARD_MULTIPLIER_MIN, multiplier));
}

/** Additive shift to failure-risk probabilities for an opportunity type. */
export function riskDeltaFor(effects: WorldEventEffect[], opportunityType: string): number {
  return effects
    .filter(
      (effect) => effect.type === 'MODIFY_RISK' && matchesType(effect.target, opportunityType),
    )
    .reduce((sum, effect) => sum + (Number(effect.modifier) || 0), 0);
}

/**
 * Effective danger-level shift for a district. Effects with an explicit
 * `target` only hit that district; untargeted MODIFY_DANGER hits wherever
 * the carrying event applies.
 */
export function dangerDeltaFor(effects: WorldEventEffect[], districtId: string): number {
  return effects
    .filter(
      (effect) =>
        effect.type === 'MODIFY_DANGER' &&
        (effect.target === undefined || effect.target === districtId),
    )
    .reduce((sum, effect) => sum + (Number(effect.modifier) || 0), 0);
}

/**
 * Economy drift contribution for a planet, in economy-level points
 * (a +0.15 authored modifier ≈ +1.5 points of pre-average pressure).
 */
export function economyDeltaFor(effects: WorldEventEffect[], planetId: string): number {
  return (
    effects
      .filter(
        (effect) =>
          effect.type === 'MODIFY_ECONOMY' &&
          (effect.target === undefined || effect.target === planetId),
      )
      .reduce((sum, effect) => sum + (Number(effect.modifier) || 0), 0) * 10
  );
}

/** Follow-up event ids an event wants to spawn when it activates. */
export function spawnEventIds(effects: unknown): string[] {
  return asArray(effects)
    .filter((effect) => effect.type === 'SPAWN_EVENT' && typeof effect.eventId === 'string')
    .map((effect) => effect.eventId as string);
}
