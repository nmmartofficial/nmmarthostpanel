/**
 * Customer Module Service
 * Phase 5 - Step 3 & Step 7
 */

import type { Customer } from '../types/customer.types';
import { DB_SCHEMA } from '../../../../dbSchema';
import { dbSync } from '../../../../dbSync';
import { normalizeCustomerSearch, safeCustomerCompare, normalizeMobile, normalizeCustomerName } from '../utils/customer.utils';

const CUSTOMER_TABLE = DB_SCHEMA.DELIVERY_CUSTOMERS.table;

const toCustomer = (row: any): Customer => ({
  id: String(row.id),
  customerCode: String(row.customer_code || row.code || `CUSTOMER-${row.id}`),
  type: 'REGULAR',
  status: row.is_active === false ? 'INACTIVE' : 'ACTIVE',
  name: row.name || '',
  email: row.email || undefined,
  phone: row.phone || undefined,
  mobile: row.phone || undefined,
  walletBalance: 0,
  creditBalance: 0,
  loyaltyPoints: 0,
  addresses: row.address ? [{
    id: String(row.id),
    type: 'PRIMARY',
    line1: row.address,
    city: '',
    state: '',
    pincode: row.pincode || '',
    country: 'IN',
    isDefault: true,
  }] : [],
  createdAt: row.created_at || '',
  updatedAt: row.updated_at || '',
});

const normalizeError = (error: any, fallback: string) => {
  const normalized: any = new Error(error?.message || fallback);
  normalized.code = error?.code || 'CUSTOMER_OPERATION_FAILED';
  normalized.details = error?.details;
  normalized.hint = error?.hint;
  return normalized;
};

export class CustomerService {
  static async search(query: string): Promise<Customer[]> {
    const normalizedQuery = normalizeCustomerSearch(query);
    try {
      const rows = await dbSync.fetch(CUSTOMER_TABLE, { includeDeleted: true });
      const customers = rows.map(toCustomer).filter((customer) => customer.status === 'ACTIVE');
      if (!normalizedQuery) return customers.sort((a, b) => a.name.localeCompare(b.name));
      return customers.filter(customer =>
        safeCustomerCompare(customer.name, normalizedQuery) ||
        safeCustomerCompare(customer.customerCode, normalizedQuery) ||
        safeCustomerCompare(normalizeMobile(customer.mobile), normalizedQuery) ||
        safeCustomerCompare(customer.phone, normalizedQuery)
      ).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw normalizeError(error, 'Customer lookup failed');
    }
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
    if (!customer.name || !String(customer.name).trim()) {
      const error: any = new Error('Customer validation failed');
      error.code = 'INVALID_CUSTOMER';
      error.details = { name: 'Customer name is required' };
      throw error;
    }

    try {
      const row = await dbSync.insert(CUSTOMER_TABLE, {
        name: normalizeCustomerName(customer.name || ''),
        phone: customer.mobile || customer.phone,
        email: customer.email || null,
        address: customer.addresses?.find((address) => address.isDefault)?.line1 || null,
        pincode: customer.addresses?.find((address) => address.isDefault)?.pincode || null,
        is_active: true,
      });
      if (!row?.id) throw new Error('Customer insert returned no record');
      return toCustomer(row);
    } catch (error) {
      throw normalizeError(error, 'Customer creation failed');
    }
  }

  static async update(id: string, customer: Partial<Customer>): Promise<Customer> {
    if (!id) throw normalizeError(null, 'Customer id is required');
    try {
      const row = await dbSync.update(CUSTOMER_TABLE, id, {
        ...(customer.name !== undefined ? { name: normalizeCustomerName(customer.name) } : {}),
        ...(customer.mobile !== undefined || customer.phone !== undefined ? { phone: customer.mobile || customer.phone } : {}),
        ...(customer.email !== undefined ? { email: customer.email || null } : {}),
        ...(customer.addresses ? { address: customer.addresses.find((address) => address.isDefault)?.line1 || null } : {}),
        ...(customer.addresses ? { pincode: customer.addresses.find((address) => address.isDefault)?.pincode || null } : {}),
        ...(customer.status ? { is_active: customer.status === 'ACTIVE' } : {}),
      });
      if (!row?.id) throw new Error(`Customer ${id} not found`);
      return toCustomer(row);
    } catch (error) {
      throw normalizeError(error, 'Customer update failed');
    }
  }

  static async remove(id: string): Promise<void> {
    if (!id) throw normalizeError(null, 'Customer id is required');
    try {
      const row = await dbSync.update(CUSTOMER_TABLE, id, { is_active: false });
      if (!row?.id) throw new Error(`Customer ${id} not found`);
    } catch (error) {
      throw normalizeError(error, 'Customer deactivation failed');
    }
  }

  static selectCustomer(customer: Customer): Customer {
    return { ...customer };
  }

  static clearSelectedCustomer(): null {
    return null;
  }
}
