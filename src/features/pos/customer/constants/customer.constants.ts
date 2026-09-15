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

import type { Customer } from '../types/customer.types';

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
    customerCode: 'CUST001',
    type: 'REGULAR',
    status: 'ACTIVE',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    mobile: '1234567890',
    walletBalance: 1000,
    creditBalance: 5000,
    loyaltyPoints: 250,
    addresses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    customerCode: 'CUST002',
    type: 'REGULAR',
    status: 'ACTIVE',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '0987654321',
    mobile: '0987654321',
    walletBalance: 2500,
    creditBalance: 10000,
    loyaltyPoints: 750,
    addresses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    customerCode: 'CUST003',
    type: 'WHOLESALE',
    status: 'ACTIVE',
    name: 'Bob Builder',
    email: 'bob@example.com',
    phone: '5551234567',
    mobile: '5551234567',
    walletBalance: 5000,
    creditBalance: 20000,
    loyaltyPoints: 1500,
    addresses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
