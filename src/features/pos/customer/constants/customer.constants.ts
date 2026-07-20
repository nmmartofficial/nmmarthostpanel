/**
 * Customer Module Constants
 * Phase 5 - Step 1
 */

export const CUSTOMER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED'
} as const;

export const CUSTOMER_TYPES = {
  REGULAR: 'REGULAR',
  GUEST: 'GUEST',
  WHOLESALE: 'WHOLESALE'
} as const;

export const LOYALTY_TYPES = {
  POINTS: 'POINTS',
  TIER: 'TIER',
  CASHBACK: 'CASHBACK'
} as const;
