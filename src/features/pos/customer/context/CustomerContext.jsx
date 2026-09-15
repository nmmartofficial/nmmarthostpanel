/**
 * Customer Module Context
 * Phase 5 - Step 1 & Step 7
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialCustomerState } from '../store/customer.state';
import { CustomerService } from '../services/customer.service';

// Create CustomerContext
const CustomerContext = createContext(null);

// CustomerProvider Component
export const CustomerProvider = ({ children }) => {
  const [customerState, setCustomerState] = useState(initialCustomerState);

  // Simple state setters
  const setSelectedCustomer = (customer) => {
    setCustomerState(prev => ({ ...prev, selectedCustomer: customer }));
  };

  const setCustomers = (customers) => {
    setCustomerState(prev => ({ ...prev, customers }));
  };

  const setSearchQuery = (query) => {
    setCustomerState(prev => ({ ...prev, searchQuery: query }));
  };

  const setWalletBalance = (balance) => {
    setCustomerState(prev => ({ ...prev, walletBalance: balance }));
  };

  const setCreditBalance = (balance) => {
    setCustomerState(prev => ({ ...prev, creditBalance: balance }));
  };

  const setLoyaltyPoints = (points) => {
    setCustomerState(prev => ({ ...prev, loyaltyPoints: points }));
  };

  const setLoading = (loading) => {
    setCustomerState(prev => ({ ...prev, loading }));
  };

  const setError = (error) => {
    setCustomerState(prev => ({ ...prev, error }));
  };

  const resetCustomer = () => {
    setCustomerState(initialCustomerState);
  };

  // Placeholder actions
  const search = (query) => {
    setSearchQuery(query);
    const results = CustomerService.search(query);
    setCustomers(results);
  };

  const create = (customer) => {
    throw new Error('Not Implemented');
  };

  const update = (id, customer) => {
    throw new Error('Not Implemented');
  };

  const remove = (id) => {
    throw new Error('Not Implemented');
  };

  const selectCustomer = (customer) => {
    const selected = CustomerService.selectCustomer(customer);
    setSelectedCustomer(selected);
  };

  const clearSelectedCustomer = () => {
    const cleared = CustomerService.clearSelectedCustomer();
    setSelectedCustomer(cleared);
  };

  const validateCustomer = (customer) => {
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
