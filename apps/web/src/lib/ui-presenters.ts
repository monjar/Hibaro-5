import type { OpportunityDefinition } from '@heliora/platform-sdk';

type RecordLike = Record<string, unknown>;

export type RewardReferenceLookup = {
  factionNames?: Record<string, string>;
  corporationNames?: Record<string, string>;
};

function asRecord(value: unknown): RecordLike | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as RecordLike;
}

function formatSignedNumber(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function resolveRewardTargetName(
  reward: RecordLike,
  lookup: RewardReferenceLookup,
): string | null {
  if (typeof reward.factionId === 'string') {
    return lookup.factionNames?.[reward.factionId] ?? reward.factionId;
  }

  if (typeof reward.corporationId === 'string') {
    return lookup.corporationNames?.[reward.corporationId] ?? reward.corporationId;
  }

  return null;
}

function formatPercent(value: number): string {
  return `${Math.round(Math.abs(value) * 100)}%`;
}

export function formatUiError(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error) {
    return error.message.replace(/^API error \d+: /, '').trim() || fallback;
  }

  if (typeof error === 'string') {
    return error.trim() || fallback;
  }

  return fallback;
}

export function getOpportunityCheckLabel(type: string): string {
  switch (type) {
    case 'HACKING':
      return 'Hacking + Intelligence';
    case 'SMUGGLING':
      return 'Stealth + Charisma';
    case 'BOUNTY':
    case 'ASSASSINATION':
      return 'Combat + Agility';
    case 'REPAIR':
      return 'Engineering + Intelligence';
    case 'DELIVERY':
    case 'ESCORT':
      return 'Agility';
    case 'DIPLOMACY':
      return 'Charisma';
    case 'MINING':
      return 'Strength + Engineering';
    case 'INVESTIGATION':
      return 'Intelligence + Charisma';
    case 'SECURITY':
      return 'Combat + Intelligence';
    case 'TRADING':
      return 'Charisma + Intelligence';
    case 'STORY':
    case 'WORLD':
      return 'Intelligence + Charisma';
    default:
      return 'Relevant stats';
  }
}

export function formatOpportunityCheckHint(
  opportunity: Pick<OpportunityDefinition, 'type' | 'difficulty'>,
): string {
  return `${getOpportunityCheckLabel(opportunity.type)} / 10 + d20 vs DC ${opportunity.difficulty}`;
}

export function describeRewardTooltip(
  reward: RecordLike,
  lookup: RewardReferenceLookup = {},
): string {
  switch (reward.type) {
    case 'CREDITS':
      return `Pays ${formatSignedNumber(Number(reward.value ?? 0))} credits on success.`;
    case 'FACTION_REPUTATION': {
      const targetName = resolveRewardTargetName(reward, lookup);
      return `Changes faction standing${targetName ? ` with ${targetName}` : ''} by ${formatSignedNumber(Number(reward.value ?? 0))}.`;
    }
    case 'CORPORATION_REPUTATION': {
      const targetName = resolveRewardTargetName(reward, lookup);
      return `Changes corporation standing${targetName ? ` with ${targetName}` : ''} by ${formatSignedNumber(Number(reward.value ?? 0))}.`;
    }
    case 'STAT_XP':
      return `Can improve ${String(reward.key ?? 'a stat')} after a successful run.`;
    case 'ITEM':
      return 'Awards a concrete inventory item on success.';
    case 'UNLOCK_QUEST':
      return 'Unlocks a follow-up quest step on success.';
    case 'UNLOCK_BUILDING':
      return 'Unlocks access to an additional building on success.';
    default:
      return 'Reward granted on success.';
  }
}

export function formatRewardBadgeLabel(
  reward: RecordLike,
  lookup: RewardReferenceLookup = {},
): string {
  switch (reward.type) {
    case 'CREDITS':
      return `${formatSignedNumber(Number(reward.value ?? 0))}$`;
    case 'FACTION_REPUTATION': {
      const targetName = resolveRewardTargetName(reward, lookup);
      return `${formatSignedNumber(Number(reward.value ?? 0))} REP${targetName ? ` (${targetName})` : ''}`;
    }
    case 'CORPORATION_REPUTATION': {
      const targetName = resolveRewardTargetName(reward, lookup);
      return `${formatSignedNumber(Number(reward.value ?? 0))} CORP${targetName ? ` (${targetName})` : ''}`;
    }
    case 'STAT_XP':
      return `${formatSignedNumber(Number(reward.value ?? 0))} XP ${String(reward.key ?? '')}`.trim();
    case 'ITEM':
      return 'ITEM';
    default:
      return String(reward.type ?? 'REWARD');
  }
}

export function describeWorldEventEffects(effects: unknown): string[] {
  if (!Array.isArray(effects)) {
    return [];
  }

  return effects
    .map((effect) => {
      const record = asRecord(effect);
      if (!record) {
        return '';
      }

      const modifier = Number(record.modifier ?? 0);

      switch (record.type) {
        case 'MODIFY_RISK':
          return `${String(record.target ?? 'Target')} risks are ${modifier >= 0 ? 'increased' : 'reduced'} by ${formatPercent(modifier)}.`;
        case 'MODIFY_REWARD':
          return `${String(record.target ?? 'Target')} payouts are ${modifier >= 0 ? 'increased' : 'reduced'} by ${formatPercent(modifier)}.`;
        case 'MODIFY_DANGER':
          return `Danger changes by ${formatSignedNumber(modifier)} in the affected area.`;
        case 'MODIFY_ECONOMY':
          return `Economy shifts by ${formatSignedNumber(Math.round(modifier * 100))}% in the affected area.`;
        case 'SPAWN_EVENT':
          return `Can trigger follow-up event ${String(record.eventId ?? 'unknown')}.`;
        default:
          return JSON.stringify(record);
      }
    })
    .filter((entry) => entry.length > 0);
}

export function describeItemFeatures(item: {
  category?: string;
  effects?: unknown;
  requirements?: unknown;
  weaponData?: unknown;
  clothingData?: unknown;
  toolData?: unknown;
  vehicleData?: unknown;
}): string[] {
  const details: string[] = [];

  if (Array.isArray(item.effects)) {
    for (const effect of item.effects) {
      const record = asRecord(effect);
      if (!record || record.type !== 'MODIFY_STAT') continue;
      const key = String(record.key ?? 'stat');
      const value = Number(record.value ?? 0);
      if (key === 'health') {
        details.push(`${value >= 0 ? 'Restores' : 'Costs'} ${Math.abs(value)} health.`);
      } else if (key === 'energy') {
        details.push(`${value >= 0 ? 'Restores' : 'Costs'} ${Math.abs(value)} energy.`);
      } else if (key === 'wantedLevel') {
        details.push(`${value >= 0 ? 'Raises' : 'Reduces'} wanted level by ${Math.abs(value)}.`);
      } else {
        details.push(`${value >= 0 ? 'Boosts' : 'Reduces'} ${key} by ${Math.abs(value)}.`);
      }
    }
  }

  const toolData = asRecord(item.toolData);
  if (toolData) {
    if (typeof toolData.hackingBonus === 'number') {
      details.push(`Tool bonus: +${toolData.hackingBonus} hacking.`);
    }
    if (typeof toolData.stealthBonus === 'number') {
      details.push(`Tool bonus: +${toolData.stealthBonus} stealth.`);
    }
    if (typeof toolData.concealmentCapacity === 'number') {
      details.push(`Conceals up to ${toolData.concealmentCapacity} cargo units.`);
    }
    if (typeof toolData.tier === 'number') {
      details.push(`Tool tier ${toolData.tier}.`);
    }
  }

  const weaponData = asRecord(item.weaponData);
  if (weaponData) {
    if (typeof weaponData.damage === 'number') {
      details.push(`Weapon damage ${weaponData.damage}.`);
    }
    if (typeof weaponData.range === 'string') {
      details.push(`Effective range: ${weaponData.range.toLowerCase()}.`);
    }
  }

  const clothingData = asRecord(item.clothingData);
  if (clothingData) {
    if (typeof clothingData.armor === 'number') {
      details.push(`Armor rating ${clothingData.armor}.`);
    }
    if (typeof clothingData.slot === 'string') {
      details.push(`Worn on the ${clothingData.slot.toLowerCase()}.`);
    }
  }

  const vehicleData = asRecord(item.vehicleData);
  if (vehicleData) {
    if (typeof vehicleData.capacity === 'number') {
      details.push(`Vehicle capacity ${vehicleData.capacity}.`);
    }
    if (typeof vehicleData.range === 'number') {
      details.push(`Travel range ${vehicleData.range}.`);
    }
  }

  if (details.length === 0) {
    if (item.category === 'TOOL') {
      details.push('Passive tool used by gigs, jobs, quests, or trade systems.');
    } else {
      details.push('No direct active effect. This item is mainly useful for trade, quests, or world interactions.');
    }
  }

  return details;
}