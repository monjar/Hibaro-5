export * from '@heliora/game-rules';

// Additional shared types
export type Nullable<T> = T | null;
export type ID = string;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
