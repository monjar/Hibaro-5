import { createApiClient } from '@heliora/platform-sdk';

export * from '@heliora/platform-sdk';

const client = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

export const apiFetch = client.request;
