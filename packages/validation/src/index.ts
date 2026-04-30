import { z } from 'zod';

export const AcceptOpportunitySchema = z.object({
  characterId: z.string().uuid('characterId must be a valid UUID'),
});

export const TravelSchema = z.object({
  planetId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  buildingId: z.string().uuid().optional(),
});

export const RequirementSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('STAT_MIN'), key: z.string(), value: z.number() }),
  z.object({ type: z.literal('CREDITS_MIN'), value: z.number() }),
  z.object({ type: z.literal('FACTION_REPUTATION_MIN'), id: z.string(), value: z.number() }),
  z.object({ type: z.literal('CORPORATION_REPUTATION_MIN'), id: z.string(), value: z.number() }),
  z.object({ type: z.literal('ITEM_REQUIRED'), id: z.string() }),
  z.object({ type: z.literal('QUEST_COMPLETED'), id: z.string() }),
  z.object({ type: z.literal('DISTRICT_ACCESS'), id: z.string() }),
  z.object({ type: z.literal('PLANET_ACCESS'), id: z.string() }),
  z.object({ type: z.literal('RANK_REQUIRED'), id: z.string(), name: z.string() }),
]);

export const RewardSchema = z.object({
  type: z.enum([
    'CREDITS',
    'ITEM',
    'FACTION_REPUTATION',
    'CORPORATION_REPUTATION',
    'CHARACTER_RELATIONSHIP',
    'UNLOCK_BUILDING',
    'UNLOCK_QUEST',
    'STOCK_SHARES',
    'RANK_UP',
    'STAT_XP',
  ]),
  value: z.number().optional(),
  key: z.string().optional(),
  factionId: z.string().optional(),
  corporationId: z.string().optional(),
  itemDefinitionId: z.string().optional(),
  buildingId: z.string().optional(),
  questId: z.string().optional(),
});

export type AcceptOpportunityInput = z.infer<typeof AcceptOpportunitySchema>;
export type TravelInput = z.infer<typeof TravelSchema>;
