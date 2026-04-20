// Re-export types from game-rules for convenience
export * from '../../game-rules/src/types';

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
