/**
 * Customer Module Context
 * Phase 5 - Step 1 & Step 7
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialCustomerState } from '../store/customer.state';
import type { CustomerState, Customer, CustomerActions } from '../types/customer.types';
import { CustomerService } from '../services/customer.service';

// Create CustomerContext
const CustomerContext = createContext<{
  customerState: CustomerState;
  actions: CustomerActions;
  selectedCustomer: Customer | null;
  customers: Customer[];
  loading: boolean;
  error: string;
  searchQuery: string;
  walletBalance: number;
  creditBalance: number;
  loyaltyPoints: number;
  setSelectedCustomer: (customer: Customer | null) => void;
  setCustomers: (customers: Customer[]) => void;
  setSearchQuery: (query: string) => void;
  setWalletBalance: (balance: number) => void;
  setCreditBalance: (balance: number) => void;
  setLoyaltyPoints: (points: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetCustomer: () => void;
  search: (query: string) => void;
  create: (customer: Partial<Customer>) => void;
  update: (id: string, customer: Partial<Customer>) => void;
  remove: (id: string) => void;
  selectCustomer: (customer: Customer) => void;
  clearSelectedCustomer: () => void;
  validateCustomer: (customer: {
    customerCode: string;
    name: string;
    mobile: string;
    email?: string;
  }) => { isValid: boolean; errors: Record<string, string> };
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

  const setSearchQuery = (query: string) => {
    setCustomerState(prev => ({ ...prev, searchQuery: query }));
  };

  const setWalletBalance = (balance: number) => {
    setCustomerState(prev => ({ ...prev, walletBalance: balance }));
  };

  const setCreditBalance = (balance: number) => {
    setCustomerState(prev => ({ ...prev, creditBalance: balance }));
  };

  const setLoyaltyPoints = (points: number) => {
    setCustomerState(prev => ({ ...prev, loyaltyPoints: points }));
  };

  const setLoading = (loading: boolean) => {
    setCustomerState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string) => {
    setCustomerState(prev => ({ ...prev, error }));
  };

  const resetCustomer = () => {
    setCustomerState(initialCustomerState);
  };

  // Placeholder actions
  const search = (query: string) => {
    setSearchQuery(query);
    const results = CustomerService.search(query);
    setCustomers(results);
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

  const selectCustomer = (customer: Customer) => {
    const selected = CustomerService.selectCustomer(customer);
    setSelectedCustomer(selected);
  };

  const clearSelectedCustomer = () => {
    const cleared = CustomerService.clearSelectedCustomer();
    setSelectedCustomer(cleared);
  };

  const validateCustomer = (customer: {
    customerCode: string;
    name: string;
    mobile: string;
    email?: string;
  }) => {
    return CustomerService.validate(customer);
  };

  const actions = useMemo(() => ({
    search,
    create,
    update,
    remove,
    selectCustomer,
    clearSelectedCustomer,
    setCustomers,
    setSelectedCustomer,
    setSearchQuery,
    setWalletBalance,
    setCreditBalance,
    setLoyaltyPoints,
    setLoading,
    setError,
    resetCustomer
  }), []);

  const value = useMemo(() => ({
    customerState,
    actions,
    selectedCustomer: customerState.selectedCustomer,
    customers: customerState.customers,
    loading: customerState.loading,
    error: customerState.error,
    searchQuery: customerState.searchQuery,
    walletBalance: customerState.walletBalance,
    creditBalance: customerState.creditBalance,
    loyaltyPoints: customerState.loyaltyPoints,
    setSelectedCustomer,
    setCustomers,
    setSearchQuery,
    setWalletBalance,
    setCreditBalance,
    setLoyaltyPoints,
    setLoading,
    setError,
    resetCustomer,
    search,
    create,
    update,
    remove,
    selectCustomer,
    clearSelectedCustomer,
    validateCustomer
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
