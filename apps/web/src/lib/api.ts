const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }
  return res.json();
}

export interface Player {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
  lastLoginAt: string;
  character?: Character;
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

export interface ActivityLog {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  relatedEntities?: unknown;
}

export interface WorldState {
  timestamp: string;
  planets: Record<string, unknown>[];
  factions: Record<string, unknown>[];
  corporations: Record<string, unknown>[];
  activeWorldEvents: WorldEvent[];
}
