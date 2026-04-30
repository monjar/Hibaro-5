export const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export type SimulationStepName =
  | 'opportunity_resolution'
  | 'world_events'
  | 'economy'
  | 'corporations'
  | 'district_control'
  | 'npc_activity'
  | 'job_shifts';

export interface RealtimeEventContract {
  type: string;
  version: number;
  description: string;
  payloadKeys: string[];
}

export interface RealtimeStreamEvent<TPayload = unknown> {
  type: string;
  sentAt: string;
  payload: TPayload;
}

export interface WorldEvent {
  id: string;
  title: string;
  description?: string;
  scope: string;
  status: string;
  startsAt?: string;
  endsAt?: string;
  effects: unknown[];
}

export interface Character {
  id: string;
  name: string;
  type: string;
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
  playerId?: string;
  currentPlanet?: { id: string; name: string; planetType: string };
  currentDistrict?: { id: string; name: string; dangerLevel: number };
  currentBuilding?: { id: string; name: string; functionality: string[]; status: string };
  createdAt: string;
}

export interface Player {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
  lastLoginAt: string;
  character?: Character;
}

export interface OpportunityDefinition {
  id: string;
  title: string;
  description?: string;
  kind: 'GIG' | 'JOB' | 'QUEST';
  type: string;
  difficulty: number;
  durationMinutes?: number;
  requirements: Record<string, unknown>[];
  rewards: Record<string, unknown>[];
  risks: Record<string, unknown>[];
  repeatability?: unknown;
  questData?: {
    chainId?: string;
    stepNumber?: number;
    totalSteps?: number;
    isOneOff?: boolean;
    hint?: string;
    objectives?: Array<Record<string, unknown>>;
  } | null;
}

export interface AdminOpportunityInput {
  title: string;
  description?: string | null;
  kind: 'GIG' | 'JOB' | 'QUEST';
  type: string;
  difficulty?: number;
  durationMinutes?: number;
  requirements?: unknown[];
  rewards?: unknown[];
  risks?: unknown[];
  repeatability?: unknown;
}

export type PlanetType =
  | 'TERRESTRIAL'
  | 'GAS_GIANT'
  | 'ICE'
  | 'DESERT'
  | 'OCEAN'
  | 'ASTEROID_BELT'
  | 'STATION';

export interface AdminPlanetInput {
  solarSystemId: string;
  name: string;
  description?: string | null;
  planetType?: PlanetType;
  dangerLevel?: number;
  lawLevel?: number;
  economyLevel?: number;
}

export interface AdminDistrictInput {
  planetId: string;
  name: string;
  description?: string | null;
  controllingFactionId?: string | null;
  dangerLevel?: number;
  lawLevel?: number;
  economyLevel?: number;
}

export type BuildingFunction =
  | 'SHOP'
  | 'SAFEHOUSE'
  | 'OFFICE'
  | 'HUB'
  | 'DOCK'
  | 'BAR'
  | 'CLINIC'
  | 'WAREHOUSE'
  | 'BLACK_MARKET'
  | 'MISSION_BOARD';

export type BuildingStatus = 'OPEN' | 'CLOSED' | 'DAMAGED' | 'ABANDONED' | 'LOCKED_DOWN';

export type BuildingOwnerType = 'CHARACTER' | 'FACTION' | 'CORPORATION' | 'SYSTEM';

export interface AdminBuildingInput {
  districtId: string;
  name: string;
  description?: string | null;
  ownerType?: BuildingOwnerType;
  ownerId?: string | null;
  functionality?: BuildingFunction[];
  status?: BuildingStatus;
}

export interface AdminFactionInput {
  name: string;
  description?: string | null;
  ideology?: string | null;
  headquartersBuildingId?: string | null;
  treasury?: number;
  influence?: number;
}

export type CorporationIndustry =
  | 'MINING'
  | 'WEAPONS'
  | 'TRANSPORT'
  | 'CYBERNETICS'
  | 'FOOD'
  | 'SECURITY'
  | 'MEDIA'
  | 'ENERGY'
  | 'MEDICAL'
  | 'LOGISTICS'
  | 'BLACK_MARKET';

export type CorporationStatus = 'GROWING' | 'STABLE' | 'DECLINING' | 'BANKRUPT';

export interface AdminCorporationInput {
  name: string;
  description?: string | null;
  industry: CorporationIndustry;
  headquartersBuildingId?: string | null;
  cash?: number;
  debt?: number;
  revenue?: number;
  riskOfBankruptcy?: number;
  politicalInfluence?: number;
  status?: CorporationStatus;
  stockTicker?: string | null;
  stockPrice?: number | null;
  stockVolatility?: number | null;
}

export type WorldEventScope =
  | 'CHARACTER'
  | 'BUILDING'
  | 'DISTRICT'
  | 'PLANET'
  | 'FACTION'
  | 'CORPORATION'
  | 'WORLD';

export type WorldEventStatus = 'SCHEDULED' | 'ACTIVE' | 'RESOLVED' | 'CANCELLED';

export interface AdminWorldEventInput {
  title: string;
  description?: string | null;
  scope: WorldEventScope;
  triggeredByType?: string | null;
  triggeredById?: string | null;
  affectedEntities?: unknown[];
  requirements?: unknown[];
  effects?: unknown[];
  startsAt?: string | null;
  endsAt?: string | null;
  status?: WorldEventStatus;
}

export type ItemCategory =
  | 'TOOL'
  | 'WEAPON'
  | 'CLOTHING'
  | 'VEHICLE'
  | 'CONSUMABLE'
  | 'MATERIAL'
  | 'QUEST_ITEM';

export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'ILLEGAL';

export interface AdminItemDefinitionInput {
  name: string;
  description?: string | null;
  category: ItemCategory;
  rarity?: ItemRarity;
  baseValue?: number;
  weight?: number;
  effects?: unknown;
  requirements?: unknown;
  weaponData?: unknown;
  clothingData?: unknown;
  toolData?: unknown;
  vehicleData?: unknown;
}

export interface AdminPlanet {
  id: string;
  solarSystemId: string;
  name: string;
  description?: string | null;
  planetType: PlanetType;
  dangerLevel: number;
  lawLevel: number;
  economyLevel: number;
}

export interface AdminDistrict {
  id: string;
  planetId: string;
  name: string;
  description?: string | null;
  controllingFactionId?: string | null;
  dangerLevel: number;
  lawLevel: number;
  economyLevel: number;
  planet?: { id: string; name: string };
  controllingFaction?: { id: string; name: string } | null;
}

export interface AdminBuilding {
  id: string;
  districtId: string;
  name: string;
  description?: string | null;
  ownerType: BuildingOwnerType;
  ownerId?: string | null;
  functionality: BuildingFunction[];
  status: BuildingStatus;
  district?: { id: string; name: string; planet?: { id: string; name: string } };
}

export interface AdminFaction {
  id: string;
  name: string;
  description?: string | null;
  ideology?: string | null;
  headquartersBuildingId?: string | null;
  treasury: number;
  influence: number;
}

export interface AdminCorporation {
  id: string;
  name: string;
  description?: string | null;
  industry: CorporationIndustry;
  headquartersBuildingId?: string | null;
  cash: number;
  debt: number;
  revenue: number;
  riskOfBankruptcy: number;
  politicalInfluence: number;
  status: CorporationStatus;
  stockTicker?: string | null;
  stockPrice?: number | null;
  stockVolatility?: number | null;
}

export interface AdminWorldEvent {
  id: string;
  title: string;
  description?: string | null;
  scope: WorldEventScope;
  triggeredByType?: string | null;
  triggeredById?: string | null;
  affectedEntities: unknown[];
  requirements: unknown[];
  effects: unknown[];
  startsAt?: string | null;
  endsAt?: string | null;
  status: WorldEventStatus;
}

export interface AdminItemDefinition {
  id: string;
  name: string;
  description?: string | null;
  category: ItemCategory;
  rarity: ItemRarity;
  baseValue: number;
  weight: number;
  effects?: unknown;
  requirements?: unknown;
  weaponData?: unknown;
  clothingData?: unknown;
  toolData?: unknown;
  vehicleData?: unknown;
}

export interface SolarSystem {
  id: string;
  name: string;
  description?: string | null;
  planets?: AdminPlanet[];
}

export interface JobEmployment {
  id: string;
  characterId: string;
  opportunityId: string;
  hiredAt: string;
  lastShiftAt: string;
  strikes: number;
  status: 'ACTIVE' | 'FIRED' | 'QUIT';
  cadenceHours: number;
  totalShiftsCompleted: number;
  totalCreditsEarned: number;
  opportunity: OpportunityDefinition;
}

export interface OpportunityInstance {
  id: string;
  definitionId: string;
  characterId: string;
  status: string;
  startedAt: string;
  completesAt: string;
  completedAt?: string;
  outcome?: Record<string, unknown>;
  definition: OpportunityDefinition;
}

export interface ActivityLog {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  relatedEntities?: unknown;
}

export interface RelationshipEntry {
  id: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationshipType: string;
  value: number;
  metadata?: unknown;
  updatedAt: string;
}

export interface StockQuote {
  corporationId: string;
  name: string;
  industry: string;
  status: string;
  stockTicker: string | null;
  stockPrice: number | null;
  stockVolatility: number | null;
  riskOfBankruptcy: number;
  previousPrice?: number | null;
  delta?: number | null;
  percentChange?: number | null;
  sparkline?: number[];
}

export interface StockHistory {
  corporationId: string;
  corporationName: string;
  stockTicker: string | null;
  points: Array<{ price: number; recordedAt: string }>;
}

export interface StockHolding {
  id: string;
  corporationId: string;
  corporationName: string;
  stockTicker: string | null;
  shares: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
}

export interface ShopItem {
  id: string;
  itemDefinitionId: string;
  name: string;
  description?: string | null;
  category: string;
  rarity: string;
  condition: number;
  weight: number;
  contraband: boolean;
  priceCredits: number;
  effects?: unknown;
  weaponData?: unknown;
  clothingData?: unknown;
  toolData?: unknown;
}

export interface ShopListing {
  building: {
    id: string;
    name: string;
    description?: string | null;
    functionality: string[];
    ownerType: string;
    ownerId: string | null;
  };
  stock: ShopItem[];
}

export interface InventoryItem {
  id: string;
  itemDefinitionId: string;
  ownerType: string;
  ownerId: string;
  condition: number;
  customName?: string | null;
  modifiers?: unknown;
  itemDefinition: {
    id: string;
    name: string;
    description?: string | null;
    category: string;
    rarity: string;
    baseValue: number;
    weight: number;
    effects?: unknown;
  };
}

export type StatKey =
  | 'strength'
  | 'agility'
  | 'intelligence'
  | 'charisma'
  | 'hacking'
  | 'combat'
  | 'stealth'
  | 'engineering';

export interface BackstoryOption {
  id: string;
  label: string;
  blurb: string;
  bonuses: Partial<Record<StatKey, number>>;
  startingCredits: number;
}

export interface CharacterOptions {
  backstories: BackstoryOption[];
  statAllocation: {
    budget: number;
    baseValue: number;
    maxPerKey: number;
  };
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  characterName: string;
  backstory?: string;
  motivation?: string;
  statAllocation?: Partial<Record<StatKey, number>>;
}

export interface AuthResponse {
  accessToken: string;
  player: {
    id: string;
    username: string;
    email?: string | null;
    character?: {
      id: string;
      name: string;
      [key: string]: unknown;
    } | null;
  };
}

export interface TravelQuote {
  travelCost: number;
  travelSurcharge: number;
  travelRiskScore: number;
  travelEnergyDelta: number;
  wantedDelta: number;
  blocked: boolean;
  affordable: boolean;
  currentCredits: number;
  controllingFactionName?: string | null;
  reputationScore: number;
  reputationModifier: 'NEUTRAL' | 'SURCHARGE' | 'LOCKED' | 'PRIVILEGED';
  warnings: string[];
  destination: {
    planetId: string;
    planetName: string;
    districtId: string;
    districtName: string;
    buildingId: string | null;
  };
}

export interface PlanetWorldEntry {
  id: string;
  name: string;
  planetType: string;
  dangerLevel: number;
  lawLevel: number;
  economyLevel: number;
}

export interface FactionWorldEntry {
  id: string;
  name: string;
  influence: number;
  treasury: number;
}

export interface CorporationWorldEntry {
  id: string;
  name: string;
  industry: string;
  status: string;
  cash: number;
  debt: number;
  revenue: number;
  riskOfBankruptcy: number;
  stockTicker?: string | null;
  stockPrice?: number | null;
  stockVolatility?: number | null;
}

export interface MarketPlanetState {
  planetId: string;
  planetName: string;
  economyLevel: number;
  demandIndex: number;
  riskIndex: number;
  travelPressure: number;
}

export interface CorporationMarketState {
  corporationId: string;
  corporationName: string;
  industry: string;
  status: string;
  stockTicker?: string | null;
  stockPrice?: number | null;
  stockVolatility?: number | null;
  revenue: number;
  debt: number;
  cash: number;
  riskOfBankruptcy: number;
  marketMomentum: number;
}

export interface DistrictControlState {
  districtId: string;
  districtName: string;
  planetId: string;
  planetName: string;
  controllingFactionId?: string | null;
  controllingFactionName?: string | null;
  controlScore: number;
  travelSurcharge: number;
  dangerLevel: number;
  lawLevel: number;
  economyLevel: number;
}

export interface NpcActivityEntry {
  characterId: string;
  characterName: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  creditsDelta: number;
  influenceDelta: number;
  summary: string;
  createdAt: string;
}

export interface SimulationStepSummary {
  step: SimulationStepName;
  processed: number;
  changes: number;
  notes?: string[];
}

export interface SimulationTickSummary {
  id?: string;
  processedAt: string;
  totals: {
    opportunitiesResolved: number;
    worldEventsActivated: number;
    worldEventsResolved: number;
    marketUpdates: number;
    corporationUpdates: number;
    districtControlUpdates: number;
    npcActions: number;
  };
  stepSummaries: SimulationStepSummary[];
  results: Record<string, unknown>[];
}

export interface WorldState {
  timestamp: string;
  planets: PlanetWorldEntry[];
  factions: FactionWorldEntry[];
  corporations: CorporationWorldEntry[];
  activeWorldEvents: WorldEvent[];
  marketState: {
    planetaryMarkets: MarketPlanetState[];
    corporations: CorporationMarketState[];
    totalCorporateCash: number;
    totalCorporateDebt: number;
  };
  districtControl: DistrictControlState[];
  recentNpcActivity: NpcActivityEntry[];
  recentTicks: SimulationTickSummary[];
  realtimeContracts: RealtimeEventContract[];
}

export const REALTIME_EVENT_CONTRACTS: RealtimeEventContract[] = [
  {
    type: 'simulation.tick.completed',
    version: 1,
    description: 'Published after the world-state engine completes a deterministic tick.',
    payloadKeys: ['processedAt', 'totals', 'stepSummaries', 'results'],
  },
  {
    type: 'simulation.market.updated',
    version: 1,
    description: 'Published when market indexes and corporation prices are refreshed.',
    payloadKeys: ['planetaryMarkets', 'corporations', 'totalCorporateCash', 'totalCorporateDebt'],
  },
  {
    type: 'npc.activity.recorded',
    version: 1,
    description: 'Published when an NPC action changes the world-state.',
    payloadKeys: ['characterId', 'characterName', 'action', 'targetType', 'targetId', 'summary'],
  },
  {
    type: 'travel.completed',
    version: 1,
    description: 'Published after character travel cost and risk are resolved.',
    payloadKeys: ['characterId', 'travelCost', 'travelRiskScore', 'destination'],
  },
];

export interface ApiClientConfig {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  getToken?: () => string | null | undefined;
  getAdminToken?: () => string | null | undefined;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  config: ApiClientConfig = {},
): Promise<T> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const baseUrl = config.baseUrl ?? DEFAULT_API_URL;
  const token = config.getToken?.() ?? null;
  const adminToken = config.getAdminToken?.() ?? null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (adminToken) {
    headers['x-admin-token'] = adminToken;
  }
  const response = await fetchImpl(`${baseUrl}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return response.json() as Promise<T>;
}

export function createApiClient(config?: ApiClientConfig) {
  const request = <T>(path: string, options?: RequestInit) => apiFetch<T>(path, options, config);
  const post = <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  return {
    request,
    post,
    // public
    getWorldState: () => request<WorldState>('/simulation/world-state'),
    getSimulationHistory: (limit = 10) =>
      request<SimulationTickSummary[]>(`/simulation/history?limit=${limit}`),
    getRealtimeContracts: () => request<RealtimeEventContract[]>('/simulation/realtime-contracts'),
    getActiveWorldEvents: () => request<WorldEvent[]>('/world-events/active'),
    getOpportunities: () => request<OpportunityDefinition[]>('/opportunities'),
    getOpportunityById: (id: string) => request<OpportunityDefinition>(`/opportunities/${id}`),
    createOpportunity: (input: AdminOpportunityInput) =>
      post<OpportunityDefinition>('/opportunities', input),
    updateOpportunity: (id: string, input: Partial<AdminOpportunityInput>) =>
      request<OpportunityDefinition>(`/opportunities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteOpportunity: (id: string) =>
      request<{ deleted: boolean; id: string }>(`/opportunities/${id}`, { method: 'DELETE' }),
    runSimulationTick: () => post<SimulationTickSummary>('/simulation/tick'),
    getSolarSystems: () => request<SolarSystem[]>('/locations/solar-systems'),
    getPlanets: () => request<AdminPlanet[]>('/locations/planets'),
    getPlanet: (id: string) => request<AdminPlanet>(`/locations/planets/${id}`),
    getDistricts: () => request<AdminDistrict[]>('/locations/districts'),
    getDistrict: (id: string) => request<AdminDistrict>(`/locations/districts/${id}`),
    getBuildings: () => request<AdminBuilding[]>('/locations/buildings'),
    getBuilding: (id: string) => request<AdminBuilding>(`/locations/buildings/${id}`),
    createPlanet: (input: AdminPlanetInput) => post<AdminPlanet>('/locations/planets', input),
    updatePlanet: (id: string, input: Partial<AdminPlanetInput>) =>
      request<AdminPlanet>(`/locations/planets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deletePlanet: (id: string) =>
      request<{ deleted: boolean; id: string }>(`/locations/planets/${id}`, { method: 'DELETE' }),
    createDistrict: (input: AdminDistrictInput) =>
      post<AdminDistrict>('/locations/districts', input),
    updateDistrict: (id: string, input: Partial<AdminDistrictInput>) =>
      request<AdminDistrict>(`/locations/districts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteDistrict: (id: string) =>
      request<{ deleted: boolean; id: string }>(`/locations/districts/${id}`, {
        method: 'DELETE',
      }),
    createBuilding: (input: AdminBuildingInput) =>
      post<AdminBuilding>('/locations/buildings', input),
    updateBuilding: (id: string, input: Partial<AdminBuildingInput>) =>
      request<AdminBuilding>(`/locations/buildings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteBuilding: (id: string) =>
      request<{ deleted: boolean; id: string }>(`/locations/buildings/${id}`, {
        method: 'DELETE',
      }),
    // factions
    getFactions: () => request<AdminFaction[]>('/factions'),
    getFaction: (id: string) => request<AdminFaction>(`/factions/${id}`),
    createFaction: (input: AdminFactionInput) => post<AdminFaction>('/factions', input),
    updateFaction: (id: string, input: Partial<AdminFactionInput>) =>
      request<AdminFaction>(`/factions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteFaction: (id: string) =>
      request<{ deleted: boolean; id: string }>(`/factions/${id}`, { method: 'DELETE' }),
    // corporations
    getCorporations: () => request<AdminCorporation[]>('/corporations'),
    getCorporation: (id: string) => request<AdminCorporation>(`/corporations/${id}`),
    createCorporation: (input: AdminCorporationInput) =>
      post<AdminCorporation>('/corporations', input),
    updateCorporation: (id: string, input: Partial<AdminCorporationInput>) =>
      request<AdminCorporation>(`/corporations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteCorporation: (id: string) =>
      request<{ deleted: boolean; id: string }>(`/corporations/${id}`, { method: 'DELETE' }),
    // world events
    getWorldEvents: () => request<AdminWorldEvent[]>('/world-events'),
    getWorldEvent: (id: string) => request<AdminWorldEvent>(`/world-events/${id}`),
    createWorldEvent: (input: AdminWorldEventInput) =>
      post<AdminWorldEvent>('/world-events', input),
    updateWorldEvent: (id: string, input: Partial<AdminWorldEventInput>) =>
      request<AdminWorldEvent>(`/world-events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteWorldEvent: (id: string) =>
      request<{ deleted: boolean; id: string }>(`/world-events/${id}`, { method: 'DELETE' }),
    // item definitions
    getItemDefinitions: () => request<AdminItemDefinition[]>('/items/definitions'),
    getItemDefinition: (id: string) => request<AdminItemDefinition>(`/items/definitions/${id}`),
    createItemDefinition: (input: AdminItemDefinitionInput) =>
      post<AdminItemDefinition>('/items/definitions', input),
    updateItemDefinition: (id: string, input: Partial<AdminItemDefinitionInput>) =>
      request<AdminItemDefinition>(`/items/definitions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteItemDefinition: (id: string) =>
      request<{ deleted: boolean; id: string }>(`/items/definitions/${id}`, { method: 'DELETE' }),
    getStockMarket: () => request<StockQuote[]>('/stocks/market'),
    getStockHistory: (corporationId: string, limit = 30) =>
      request<StockHistory>(`/stocks/history/${corporationId}?limit=${limit}`),
    getShop: (buildingId: string) => request<ShopListing>(`/shops/${buildingId}`),
    // auth
    login: (identifier: string, password: string) =>
      post<AuthResponse>('/auth/login', { identifier, password }),
    register: (input: RegisterInput) => post<AuthResponse>('/auth/register', input),
    getCharacterOptions: () => request<CharacterOptions>('/auth/character-options'),
    me: () => request<AuthResponse['player']>('/auth/me'),
    // authenticated
    getCharacter: (id: string) => request<unknown>(`/characters/${id}`),
    getCharacterSummary: (id: string) => request<unknown>(`/characters/${id}/summary`),
    getCharacterInventory: (id: string) => request<InventoryItem[]>(`/characters/${id}/inventory`),
    getCharacterRelationships: (id: string) =>
      request<RelationshipEntry[]>(`/characters/${id}/relationships`),
    travel: (id: string, body: { planetId?: string; districtId?: string; buildingId?: string }) =>
      post<unknown>(`/characters/${id}/travel`, body),
    travelQuote: (
      id: string,
      body: { planetId?: string; districtId?: string; buildingId?: string },
    ) => post<TravelQuote>(`/characters/${id}/travel/quote`, body),
    rest: (id: string) => post<unknown>(`/characters/${id}/rest`),
    useItem: (id: string, itemInstanceId: string) =>
      post<unknown>(`/characters/${id}/items/${itemInstanceId}/use`),
    getActivity: (playerId: string, page = 1, limit = 30) =>
      request<{ logs: ActivityLog[]; total: number; page: number; limit: number }>(
        `/players/${playerId}/activity?page=${page}&limit=${limit}`,
      ),
    getAvailableOpportunities: (characterId: string) =>
      request<OpportunityDefinition[]>(`/opportunities/available/${characterId}`),
    getOpportunityInstances: (characterId: string) =>
      request<OpportunityInstance[]>(`/opportunities/instances/${characterId}`),
    acceptOpportunity: (opportunityId: string, characterId: string) =>
      post<OpportunityInstance>(`/opportunities/${opportunityId}/accept`, { characterId }),
    resolveOpportunity: (instanceId: string) =>
      post<OpportunityInstance>(`/opportunities/instances/${instanceId}/resolve`),
    getStockHoldings: (characterId: string) =>
      request<StockHolding[]>(`/stocks/holdings/${characterId}`),
    buyStock: (characterId: string, corporationId: string, shares: number) =>
      post<unknown>('/stocks/buy', { characterId, corporationId, shares }),
    sellStock: (characterId: string, corporationId: string, shares: number) =>
      post<unknown>('/stocks/sell', { characterId, corporationId, shares }),
    shopBuy: (buildingId: string, itemInstanceId: string, characterId: string) =>
      post<unknown>(`/shops/${buildingId}/buy`, { itemInstanceId, characterId }),
    shopSell: (buildingId: string, itemInstanceId: string, characterId: string) =>
      post<unknown>(`/shops/${buildingId}/sell`, { itemInstanceId, characterId }),
    // jobs
    listJobs: (characterId: string) =>
      request<JobEmployment[]>(`/jobs/employments/${characterId}`),
    hireForJob: (opportunityId: string, characterId: string) =>
      post<JobEmployment>(`/jobs/${opportunityId}/hire`, { characterId }),
    quitJob: (employmentId: string) =>
      post<JobEmployment>(`/jobs/employments/${employmentId}/quit`),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
