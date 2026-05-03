import { createApiClient } from '@heliora/platform-sdk';
import { clearSession, readToken } from './session';

export * from '@heliora/platform-sdk';

const baseUrl =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:3000';

export const api = createApiClient({
  baseUrl,
  getToken: readToken,
  onUnauthorized: clearSession,
});

export const apiFetch = api.request;
