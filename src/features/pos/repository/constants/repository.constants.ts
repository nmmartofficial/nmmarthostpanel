/**
 * Repository Module Constants
 * Phase 16 - Step 1
 */

export const REPOSITORY_STATUS = {
  IDLE: 'IDLE',
  READY: 'READY',
  ERROR: 'ERROR',
} as const;

export const REPOSITORY_PROVIDER = {
  IN_MEMORY: 'IN_MEMORY',
  SUPABASE: 'SUPABASE',
} as const;
