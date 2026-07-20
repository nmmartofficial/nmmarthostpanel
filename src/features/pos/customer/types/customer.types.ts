/**
 * Customer Module Types
 * Phase 5 - Step 1
 */

import { CUSTOMER_STATUS, CUSTOMER_TYPES, LOYALTY_TYPES } from '../constants/customer.constants';

export interface CustomerAddress {
  id: string;
  type: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

export interface CustomerWallet {
  id: string;
  balance: number;
  currency: string;
  transactions: any[];
}

export interface CustomerCredit {
  id: string;
  limit: number;
  used: number;
  remaining: number;
  dueDate: string | null;
  transactions: any[];
}

export interface CustomerLoyalty {
  id: string;
  type: keyof typeof LOYALTY_TYPES;
  points: number;
  tier: string;
  history: any[];
}

export interface Customer {
  id: string;
  type: keyof typeof CUSTOMER_TYPES;
  status: keyof typeof CUSTOMER_STATUS;
  name: string;
  email?: string;
  phone?: string;
  addresses: CustomerAddress[];
  wallet?: CustomerWallet;
  credit?: CustomerCredit;
  loyalty?: CustomerLoyalty;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerState {
  selectedCustomer: Customer | null;
  customers: Customer[];
  loading: boolean;
  error: string;
}

export interface CustomerActions {
  search: (query: string) => void;
  create: (customer: Partial<Customer>) => void;
  update: (id: string, customer: Partial<Customer>) => void;
  remove: (id: string) => void;
  select: (customer: Customer) => void;
  clear: () => void;
}
