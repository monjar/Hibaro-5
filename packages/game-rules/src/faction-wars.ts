/**
 * Faction wars: factions contest district control each tick.
 *
 * Presence is scale-invariant (relative influence share, so runaway
 * absolute influence doesn't sweep the map), weighted by local assets
 * (faction-owned buildings in the district and on the planet) and stirred
 * with jitter. An incumbent is only unseated when a challenger clearly
 * out-musters them (hysteresis), so control doesn't thrash every tick.
 */

export const FACTION_WAR_HYSTERESIS = 1.35;
/** Minimum presence to claim a district nobody controls. */
export const FACTION_WAR_NEUTRAL_THRESHOLD = 15;
/** Chance a district is contested on any given tick. */
export const FACTION_WAR_CONTEST_CHANCE = 0.2;

export interface FactionPresenceInput {
  factionId: string;
  /** This faction's share of total influence, 0..1. */
  influenceShare: number;
  buildingsInDistrict: number;
  buildingsOnPlanet: number;
  /** Random 0..1; stirred into the score so stable standings still shift occasionally. */
  jitter: number;
}

export function factionPresenceScore(input: FactionPresenceInput): number {
  const base = Math.max(0, input.influenceShare) * 100;
  const localWeight = 1 + 0.6 * input.buildingsInDistrict + 0.2 * input.buildingsOnPlanet;
  const jitterFactor = 0.85 + 0.3 * Math.min(1, Math.max(0, input.jitter));
  return Math.round(base * localWeight * jitterFactor * 10) / 10;
}

export interface DistrictContestResult {
  /** The faction in control after the contest (null = stays/becomes neutral). */
  controllingFactionId: string | null;
  flipped: boolean;
  challengerScore: number;
  incumbentScore: number;
}

export function resolveDistrictContest(
  incumbentFactionId: string | null,
  presences: Array<{ factionId: string; score: number }>,
): DistrictContestResult {
  if (presences.length === 0) {
    return {
      controllingFactionId: incumbentFactionId,
      flipped: false,
      challengerScore: 0,
      incumbentScore: 0,
    };
  }

  const sorted = [...presences].sort((left, right) => right.score - left.score);
  const incumbent = presences.find((entry) => entry.factionId === incumbentFactionId);
  const incumbentScore = incumbent?.score ?? 0;
  const challenger = sorted.find((entry) => entry.factionId !== incumbentFactionId);

  if (!incumbentFactionId) {
    // Neutral district: strongest faction claims it past the threshold.
    const top = sorted[0];
    if (top.score >= FACTION_WAR_NEUTRAL_THRESHOLD) {
      return {
        controllingFactionId: top.factionId,
        flipped: true,
        challengerScore: top.score,
        incumbentScore: 0,
      };
    }
    return {
      controllingFactionId: null,
      flipped: false,
      challengerScore: top.score,
      incumbentScore: 0,
    };
  }

  if (challenger && challenger.score > incumbentScore * FACTION_WAR_HYSTERESIS) {
    return {
      controllingFactionId: challenger.factionId,
      flipped: true,
      challengerScore: challenger.score,
      incumbentScore,
    };
  }

  return {
    controllingFactionId: incumbentFactionId,
    flipped: false,
    challengerScore: challenger?.score ?? 0,
    incumbentScore,
  };
}
