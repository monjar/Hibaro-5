'use client';

const TOKEN_KEY = 'heliora.token';
const PLAYER_KEY = 'heliora.player';

export interface SessionPlayer {
  id: string;
  username: string;
  email?: string | null;
  character?: { id: string; name: string; [k: string]: unknown } | null;
}

export function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function readPlayer(): SessionPlayer | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PLAYER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionPlayer;
  } catch {
    return null;
  }
}

export function writeSession(token: string, player: SessionPlayer) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
  window.dispatchEvent(new Event('heliora:session'));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(PLAYER_KEY);
  window.dispatchEvent(new Event('heliora:session'));
}
