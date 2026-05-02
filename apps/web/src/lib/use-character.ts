'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { useSession } from './session-context';

export interface CharacterFull {
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
  currentPlanetId?: string | null;
  currentDistrictId?: string | null;
  currentBuildingId?: string | null;
  currentPlanet?: { id: string; name: string; planetType: string } | null;
  currentDistrict?: {
    id: string;
    name: string;
    dangerLevel: number;
    lawLevel: number;
  } | null;
  currentBuilding?: {
    id: string;
    name: string;
    functionality: string[] | string;
    status: string;
  } | null;
}

export function useCharacter() {
  const session = useSession();
  const [character, setCharacter] = useState<CharacterFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session.characterId) return null;
    setLoading(true);
    setError(null);
    try {
      const data = (await api.getCharacter(session.characterId)) as CharacterFull;
      setCharacter(data);
      // mirror updates back to session for nav display
      session.refreshPlayer({
        ...(session.player as NonNullable<typeof session.player>),
        character: data as unknown as NonNullable<typeof session.player>['character'],
      });
      return data;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.characterId]);

  useEffect(() => {
    if (session.token && session.characterId) {
      refresh();
    }
  }, [session.token, session.characterId, refresh]);

  return { character, loading, error, refresh };
}

export function useAutoRefresh(refresh: () => void, intervalMs = 15_000) {
  useEffect(() => {
    const id = setInterval(() => refresh(), intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);
}

export function useNow(intervalMs = 1_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
