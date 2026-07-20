/**
 * Customer Module Context
 * Phase 5 - Step 1
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialCustomerState } from '../store/customer.state';
import type { CustomerState, Customer, CustomerActions } from '../types/customer.types';

// Create CustomerContext
const CustomerContext = createContext<{
  customerState: CustomerState;
  actions: CustomerActions;
  selectedCustomer: Customer | null;
  customers: Customer[];
  loading: boolean;
  error: string;
  setSelectedCustomer: (customer: Customer | null) => void;
  setCustomers: (customers: Customer[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  search: (query: string) => void;
  create: (customer: Partial<Customer>) => void;
  update: (id: string, customer: Partial<Customer>) => void;
  remove: (id: string) => void;
  select: (customer: Customer) => void;
  clear: () => void;
} | null>(null);

// CustomerProvider Component
export const CustomerProvider = ({ children }) => {
  const [customerState, setCustomerState] = useState<CustomerState>(initialCustomerState);

  // Simple state setters
  const setSelectedCustomer = (customer: Customer | null) => {
    setCustomerState(prev => ({ ...prev, selectedCustomer: customer }));
  };

  const setCustomers = (customers: Customer[]) => {
    setCustomerState(prev => ({ ...prev, customers }));
  };

  const setLoading = (loading: boolean) => {
    setCustomerState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string) => {
    setCustomerState(prev => ({ ...prev, error }));
  };

  // Placeholder actions
  const search = (query: string) => {
    throw new Error('Not Implemented');
  };

  const create = (customer: Partial<Customer>) => {
    throw new Error('Not Implemented');
  };

  const update = (id: string, customer: Partial<Customer>) => {
    throw new Error('Not Implemented');
  };

  const remove = (id: string) => {
    throw new Error('Not Implemented');
  };

  const select = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const clear = () => {
    setCustomerState(initialCustomerState);
  };

  const actions = useMemo(() => ({
    search,
    create,
    update,
    remove,
    select,
    clear
  }), []);

  const value = useMemo(() => ({
    customerState,
    actions,
    selectedCustomer: customerState.selectedCustomer,
    customers: customerState.customers,
    loading: customerState.loading,
    error: customerState.error,
    setSelectedCustomer,
    setCustomers,
    setLoading,
    setError,
    search,
    create,
    update,
    remove,
    select,
    clear
  }), [customerState]);

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
};

// Custom hook to access CustomerContext
export const useCustomerContext = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomerContext must be used within a CustomerProvider');
  }
  return context;
};

export default CustomerContext;
