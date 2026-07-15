import { STAT_CAP } from './progression';
import { CharacterStats } from './types';

export type EquipmentSlot = 'WEAPON' | 'OUTFIT' | 'TOOL' | 'VEHICLE';

export type EquippableStatKey =
  | 'strength'
  | 'agility'
  | 'intelligence'
  | 'charisma'
  | 'hacking'
  | 'combat'
  | 'stealth'
  | 'engineering';

export const EQUIPPABLE_STAT_KEYS: EquippableStatKey[] = [
  'strength',
  'agility',
  'intelligence',
  'charisma',
  'hacking',
  'combat',
  'stealth',
  'engineering',
];

const CATEGORY_SLOTS: Record<string, EquipmentSlot> = {
  WEAPON: 'WEAPON',
  CLOTHING: 'OUTFIT',
  TOOL: 'TOOL',
  VEHICLE: 'VEHICLE',
};

/** Which slot an item category equips into, or null if not equippable. */
export function slotForCategory(category: string): EquipmentSlot | null {
  return CATEGORY_SLOTS[category] ?? null;
}

export interface EquippableItemDefinition {
  category: string;
  weaponData?: unknown;
  clothingData?: unknown;
  toolData?: unknown;
  vehicleData?: unknown;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Reads the stat bonuses an item grants while equipped.
 *
 * Preferred shape is `<categoryData>.statBonuses: { hacking: 2 }`. Legacy
 * seed data used flat `<stat>Bonus` keys (e.g. `toolData.stealthBonus: 3`)
 * — those are honoured too.
 */
export function extractStatBonuses(
  definition: EquippableItemDefinition,
): Partial<Record<EquippableStatKey, number>> {
  const slot = slotForCategory(definition.category);
  if (!slot) return {};

  const dataBySlot: Record<EquipmentSlot, unknown> = {
    WEAPON: definition.weaponData,
    OUTFIT: definition.clothingData,
    TOOL: definition.toolData,
    VEHICLE: definition.vehicleData,
  };
  const data = readRecord(dataBySlot[slot]);
  if (!data) return {};

  const bonuses: Partial<Record<EquippableStatKey, number>> = {};

  const statBonuses = readRecord(data.statBonuses);
  if (statBonuses) {
    for (const key of EQUIPPABLE_STAT_KEYS) {
      const value = statBonuses[key];
      if (typeof value === 'number' && Number.isFinite(value) && value !== 0) {
        bonuses[key] = (bonuses[key] ?? 0) + Math.trunc(value);
      }
    }
  }

  for (const key of EQUIPPABLE_STAT_KEYS) {
    const legacy = data[`${key}Bonus`];
    if (typeof legacy === 'number' && Number.isFinite(legacy) && legacy !== 0) {
      bonuses[key] = (bonuses[key] ?? 0) + Math.trunc(legacy);
    }
  }

  return bonuses;
}

/** Sum the bonuses of every equipped item definition. */
export function aggregateEquipmentBonuses(
  definitions: EquippableItemDefinition[],
): Partial<Record<EquippableStatKey, number>> {
  const total: Partial<Record<EquippableStatKey, number>> = {};
  for (const definition of definitions) {
    const bonuses = extractStatBonuses(definition);
    for (const key of EQUIPPABLE_STAT_KEYS) {
      const value = bonuses[key];
      if (value) total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}

/** Apply equipment bonuses to base stats, respecting the runtime stat cap. */
export function applyEquipmentBonuses(
  stats: CharacterStats,
  bonuses: Partial<Record<EquippableStatKey, number>>,
): CharacterStats {
  const boosted: CharacterStats = { ...stats };
  for (const key of EQUIPPABLE_STAT_KEYS) {
    const bonus = bonuses[key];
    if (bonus) {
      boosted[key] = Math.min(STAT_CAP, Math.max(0, stats[key] + bonus));
    }
  }
  return boosted;
}
