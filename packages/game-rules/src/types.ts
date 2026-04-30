export interface CharacterStats {
  id: string;
  name: string;
  credits: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  wantedLevel: number;
  strength: number;
  agility: number;
  intelligence: number;
  charisma: number;
  hacking: number;
  combat: number;
  stealth: number;
  engineering: number;
  reputation: number;
}

export interface Requirement {
  type:
    | 'STAT_MIN'
    | 'STAT_MAX'
    | 'RELATIONSHIP_MIN'
    | 'RELATIONSHIP_MAX'
    | 'FACTION_REPUTATION_MIN'
    | 'FACTION_REPUTATION_MAX'
    | 'CORPORATION_REPUTATION_MIN'
    | 'CORPORATION_REPUTATION_MAX'
    | 'ITEM_REQUIRED'
    | 'RANK_REQUIRED'
    | 'QUEST_COMPLETED'
    | 'DISTRICT_ACCESS'
    | 'CREDITS_MIN'
    | 'PLANET_ACCESS';
  key?: string;
  value?: number;
  id?: string;
  name?: string;
  scope?: 'FACTION' | 'CORPORATION';
}

export interface Reward {
  type:
    | 'CREDITS'
    | 'ITEM'
    | 'FACTION_REPUTATION'
    | 'CORPORATION_REPUTATION'
    | 'CHARACTER_RELATIONSHIP'
    | 'UNLOCK_BUILDING'
    | 'UNLOCK_QUEST'
    | 'STOCK_SHARES'
    | 'RANK_UP'
    | 'STAT_XP';
  value?: number;
  key?: string;
  factionId?: string;
  corporationId?: string;
  itemDefinitionId?: string;
  buildingId?: string;
  questId?: string;
  characterId?: string;
}

export interface RiskConsequence {
  type:
    | 'MODIFY_STAT'
    | 'MODIFY_CREDITS'
    | 'MODIFY_WANTED_LEVEL'
    | 'MODIFY_FACTION_REPUTATION'
    | 'MODIFY_CORPORATION_REPUTATION'
    | 'SPAWN_EVENT'
    | 'UNLOCK_BUILDING'
    | 'ADD_ITEM'
    | 'REMOVE_ITEM';
  key?: string;
  value?: number;
  factionId?: string;
  corporationId?: string;
}

export interface Risk {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  type:
    | 'COMBAT'
    | 'LEGAL'
    | 'FACTION_HOSTILITY'
    | 'CORPORATE_RETALIATION'
    | 'INJURY'
    | 'DEATH'
    | 'BETRAYAL'
    | 'WORLD_EVENT_TRIGGER';
  probability: number;
  consequences: RiskConsequence[];
}

export interface OpportunityDefinition {
  id: string;
  title: string;
  kind: 'GIG' | 'JOB' | 'QUEST';
  type:
    | 'DELIVERY'
    | 'BOUNTY'
    | 'ESCORT'
    | 'HACKING'
    | 'SMUGGLING'
    | 'ASSASSINATION'
    | 'INVESTIGATION'
    | 'MINING'
    | 'TRADING'
    | 'DIPLOMACY'
    | 'SECURITY'
    | 'REPAIR'
    | 'STORY'
    | 'WORLD';
  difficulty: number;
  requirements: Requirement[];
  rewards: Reward[];
  risks: Risk[];
  durationMinutes?: number;
}

export interface RequirementContext {
  factionReputations?: Record<string, number>;
  corporationReputations?: Record<string, number>;
  completedQuestIds?: string[];
  inventoryItemIds?: string[];
  accessibleDistrictIds?: string[];
  accessiblePlanetIds?: string[];
  ranksByFaction?: Record<string, string>;
}

export interface OpportunityOutcome {
  success: boolean;
  roll: number;
  successChance: number;
  appliedRewards: Reward[];
  triggeredRisks: { risk: Risk; consequences: RiskConsequence[] }[];
}
