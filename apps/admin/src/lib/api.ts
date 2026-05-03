'use client';

import { AuthResponse, createApiClient } from '@heliora/platform-sdk';

const ADMIN_TOKEN_KEY = 'heliora.admin.token';
const ADMIN_PLAYER_KEY = 'heliora.admin.player';

export type AdminSessionPlayer = AuthResponse['player'];

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function getStoredAdminPlayer(): AdminSessionPlayer | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ADMIN_PLAYER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSessionPlayer;
  } catch {
    return null;
  }
}

export function writeAdminSession(token: string, player: AdminSessionPlayer) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  window.localStorage.setItem(ADMIN_PLAYER_KEY, JSON.stringify(player));
  window.dispatchEvent(new Event('heliora:admin-session'));
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_PLAYER_KEY);
  window.dispatchEvent(new Event('heliora:admin-session'));
}

export const adminApi = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  getToken: () => getStoredAdminToken(),
  onUnauthorized: clearAdminSession,
});
