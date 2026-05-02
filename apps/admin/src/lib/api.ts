'use client';

import { createApiClient } from '@heliora/platform-sdk';

const ADMIN_TOKEN_KEY = 'heliora.admin.token';

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setStoredAdminToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (!token) {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  } else {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
}

export const adminApi = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  getAdminToken: () => getStoredAdminToken(),
});
