import { CharacterStats } from './types';

/**
 * Crafting v1: fixed recipes that turn materials + credits + energy into
 * gear and consumables. Crafting happens at a workshop — any WAREHOUSE
 * building, or your own rented safehouse (housing synergy).
 */

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  output: { itemName: string; quantity: number };
  inputs: Array<{ itemName: string; quantity: number }>;
  creditsCost: number;
  energyCost: number;
  statRequirement: { key: keyof CharacterStats; min: number };
  xpReward: number;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'field-patch',
    name: 'Field Patch',
    description: 'Press scrap alloy into a crude but functional medical patch.',
    output: { itemName: 'Medical Patch', quantity: 1 },
    inputs: [{ itemName: 'Scrap Alloy', quantity: 2 }],
    creditsCost: 15,
    energyCost: 5,
    statRequirement: { key: 'engineering', min: 4 },
    xpReward: 10,
  },
  {
    id: 'shock-baton',
    name: 'Shock Baton',
    description: 'Wire a drone capacitor into an alloy shaft. Convincing at short range.',
    output: { itemName: 'Shock Baton', quantity: 1 },
    inputs: [
      { itemName: 'Scrap Alloy', quantity: 3 },
      { itemName: 'Broken Drone Part', quantity: 1 },
    ],
    creditsCost: 40,
    energyCost: 8,
    statRequirement: { key: 'engineering', min: 6 },
    xpReward: 20,
  },
  {
    id: 'deck-upgrade',
    name: 'Deck Upgrade',
    description: 'Rebuild a cheap hacking deck with shielded alloy and better ICE headroom.',
    output: { itemName: 'Mid-grade Hacking Deck', quantity: 1 },
    inputs: [
      { itemName: 'Cheap Hacking Deck', quantity: 1 },
      { itemName: 'Scrap Alloy', quantity: 2 },
    ],
    creditsCost: 120,
    energyCost: 10,
    statRequirement: { key: 'engineering', min: 7 },
    xpReward: 30,
  },
  {
    id: 'stim-brew',
    name: 'Stim Brew',
    description: 'Split a bio-sample into a pair of clean stimulant doses.',
    output: { itemName: 'Stim Shot', quantity: 2 },
    inputs: [{ itemName: 'Orchard Bio-Sample', quantity: 1 }],
    creditsCost: 30,
    energyCost: 6,
    statRequirement: { key: 'intelligence', min: 6 },
    xpReward: 15,
  },
  {
    id: 'combat-cocktail-brew',
    name: 'Combat Cocktail Brew',
    description: 'Refine a bio-sample into battlefield trauma foam.',
    output: { itemName: 'Combat Cocktail', quantity: 2 },
    inputs: [{ itemName: 'Orchard Bio-Sample', quantity: 1 }],
    creditsCost: 50,
    energyCost: 8,
    statRequirement: { key: 'intelligence', min: 7 },
    xpReward: 20,
  },
];

export interface CraftContext {
  credits: number;
  energy: number;
  /** Effective stats (base + gear). */
  stats: CharacterStats;
  /** Unequipped inventory counts keyed by item definition name. */
  materialCounts: Record<string, number>;
  /** Inside a WAREHOUSE building or your own rented safehouse. */
  atWorkshop: boolean;
}

export interface CraftEvaluation {
  canCraft: boolean;
  reasons: string[];
}

export function evaluateCraft(recipe: CraftingRecipe, context: CraftContext): CraftEvaluation {
  const reasons: string[] = [];

  if (!context.atWorkshop) {
    reasons.push('You need a workshop: any warehouse, or your own rented safehouse');
  }

  const statValue = Number(context.stats[recipe.statRequirement.key] ?? 0);
  if (statValue < recipe.statRequirement.min) {
    reasons.push(
      `Requires ${String(recipe.statRequirement.key)} ≥ ${recipe.statRequirement.min} (current: ${statValue})`,
    );
  }

  for (const input of recipe.inputs) {
    const owned = context.materialCounts[input.itemName] ?? 0;
    if (owned < input.quantity) {
      reasons.push(`Needs ${input.quantity}× ${input.itemName} (you have ${owned})`);
    }
  }

  if (context.credits < recipe.creditsCost) {
    reasons.push(`Costs ${recipe.creditsCost} credits (you have ${Math.floor(context.credits)})`);
  }
  if (context.energy < recipe.energyCost) {
    reasons.push(`Costs ${recipe.energyCost} energy (you have ${context.energy})`);
  }

  return { canCraft: reasons.length === 0, reasons };
}
