'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readPlayer, readToken, clearSession, writeSession, SessionPlayer } from './session';

interface SessionContextValue {
  token: string | null;
  player: SessionPlayer | null;
  characterId: string | null;
  login: (token: string, player: SessionPlayer) => void;
  logout: () => void;
  refreshPlayer: (player: SessionPlayer) => void;
  ready: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [player, setPlayer] = useState<SessionPlayer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(readToken());
    setPlayer(readPlayer());
    setReady(true);
    function onSession() {
      setToken(readToken());
      setPlayer(readPlayer());
    }
    window.addEventListener('heliora:session', onSession);
    window.addEventListener('storage', onSession);
    return () => {
      window.removeEventListener('heliora:session', onSession);
      window.removeEventListener('storage', onSession);
    };
  }, []);

  const login = useCallback((newToken: string, newPlayer: SessionPlayer) => {
    writeSession(newToken, newPlayer);
    setToken(newToken);
    setPlayer(newPlayer);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setPlayer(null);
  }, []);

  const refreshPlayer = useCallback((updated: SessionPlayer) => {
    const t = readToken();
    if (!t) return;
    writeSession(t, updated);
    setPlayer(updated);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        token,
        player,
        characterId: player?.character?.id ?? null,
        login,
        logout,
        refreshPlayer,
        ready,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}

export function useAuthGuard() {
  const router = useRouter();
  const session = useSession();
  useEffect(() => {
    if (session.ready && !session.token) {
      router.replace('/login');
    }
  }, [session.ready, session.token, router]);
  return session;
}
