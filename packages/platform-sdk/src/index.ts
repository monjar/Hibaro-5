export const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export type SimulationStepName =
  | 'opportunity_resolution'
  | 'world_events'
  | 'economy'
  | 'corporations'
  | 'district_control'
  | 'npc_activity';

export interface RealtimeEventContract {
  type: string;
  version: number;
  description: string;
  payloadKeys: string[];
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

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  config: { baseUrl?: string; fetchImpl?: typeof fetch } = {},
): Promise<T> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const baseUrl = config.baseUrl ?? DEFAULT_API_URL;
  const response = await fetchImpl(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return response.json() as Promise<T>;
}

export function createApiClient(config?: { baseUrl?: string; fetchImpl?: typeof fetch }) {
  const request = <T>(path: string, options?: RequestInit) => apiFetch<T>(path, options, config);

  return {
    request,
    getWorldState: () => request<WorldState>('/simulation/world-state'),
    getSimulationHistory: (limit = 10) =>
      request<SimulationTickSummary[]>(`/simulation/history?limit=${limit}`),
    getRealtimeContracts: () => request<RealtimeEventContract[]>('/simulation/realtime-contracts'),
    getActiveWorldEvents: () => request<WorldEvent[]>('/world-events/active'),
    getOpportunities: () => request<OpportunityDefinition[]>('/opportunities'),
    runSimulationTick: () => request<SimulationTickSummary>('/simulation/tick', { method: 'POST' }),
  };
}
