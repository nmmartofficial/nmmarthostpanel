/**
 * Customer Module Service
 * Phase 5 - Step 3 & Step 7
 */

import type { Customer } from '../types/customer.types';
import { MOCK_CUSTOMERS } from '../constants/customer.constants';
import { normalizeCustomerSearch, safeCustomerCompare, normalizeMobile, validateCustomer } from '../utils/customer.utils';

export class CustomerService {
  static search(query: string): Customer[] {
    const normalizedQuery = normalizeCustomerSearch(query);

    if (!normalizedQuery) {
      return MOCK_CUSTOMERS.slice().sort((a, b) => a.name.localeCompare(b.name));
    }

    const results = MOCK_CUSTOMERS.filter(customer => 
      safeCustomerCompare(customer.name, normalizedQuery) || 
      safeCustomerCompare(customer.customerCode, normalizedQuery) || 
      safeCustomerCompare(normalizeMobile(customer.mobile), normalizedQuery) || 
      safeCustomerCompare(customer.phone, normalizedQuery)
    );

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  static validate(customer: {
    customerCode: string;
    name: string;
    mobile: string;
    email?: string;
  }): { isValid: boolean; errors: Record<string, string> } {
    return validateCustomer(customer);
  }

  static getCustomerId(customer: Customer): string | number {
    return customer.id;
  }

  static async create(customer: Partial<Customer>): Promise<Customer> {
    throw new Error('Not Implemented');
  }

  static async update(id: string, customer: Partial<Customer>): Promise<Customer> {
    throw new Error('Not Implemented');
  }

  static async remove(id: string): Promise<void> {
    throw new Error('Not Implemented');
  }

  static selectCustomer(customer: Customer): Customer {
    return { ...customer };
  }

  static clearSelectedCustomer(): null {
    return null;
  }
}
