/**
 * Customer Module Actions
 * Phase 5 - Step 1
 * Basic state setters implementation
 */

import type { Customer, CustomerState, CustomerActions } from '../types/customer.types';
import { initialCustomerState } from './customer.state';

export const createCustomerActions = (state: CustomerState, setState: (state: CustomerState) => void): CustomerActions => {
  return {
    search: (query: string): void => {
      const filtered = state.customers.filter(customer =>
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.email?.toLowerCase().includes(query.toLowerCase()) ||
        customer.phone?.includes(query) ||
        customer.mobile?.includes(query)
      );
      setState({
        ...state,
        searchQuery: query,
        customers: filtered,
      });
    },
    create: (customer: Partial<Customer>): void => {
      const newCustomer: Customer = {
        id: `CUST-${Date.now()}`,
        customerCode: customer.customerCode || `CUST-${Date.now()}`,
        type: customer.type || 'REGULAR',
        status: customer.status || 'ACTIVE',
        name: customer.name || '',
        email: customer.email,
        phone: customer.phone,
        mobile: customer.mobile,
        walletBalance: customer.walletBalance || 0,
        creditBalance: customer.creditBalance || 0,
        loyaltyPoints: customer.loyaltyPoints || 0,
        addresses: customer.addresses || [],
        wallet: customer.wallet,
        credit: customer.credit,
        loyalty: customer.loyalty,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setState({
        ...state,
        customers: [...state.customers, newCustomer],
      });
    },
    update: (id: string, customer: Partial<Customer>): void => {
      const updatedCustomers = state.customers.map(c =>
        c.id === id ? { ...c, ...customer, updatedAt: new Date().toISOString() } : c
      );
      setState({
        ...state,
        customers: updatedCustomers,
        selectedCustomer: state.selectedCustomer?.id === id
          ? { ...state.selectedCustomer, ...customer, updatedAt: new Date().toISOString() }
          : state.selectedCustomer,
      });
    },
    remove: (id: string): void => {
      const updatedCustomers = state.customers.filter(c => c.id !== id);
      setState({
        ...state,
        customers: updatedCustomers,
        selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer,
      });
    },
    select: (customer: Customer): void => {
      setState({
        ...state,
        selectedCustomer: customer,
        walletBalance: customer.walletBalance,
        creditBalance: customer.creditBalance,
        loyaltyPoints: customer.loyaltyPoints,
      });
    },
    clear: (): void => {
      setState({
        ...state,
        selectedCustomer: null,
        walletBalance: 0,
        creditBalance: 0,
        loyaltyPoints: 0,
      });
    },
    setCustomers: (customers: Customer[]): void => {
      setState({ ...state, customers });
    },
    setSelectedCustomer: (customer: Customer | null): void => {
      setState({
        ...state,
        selectedCustomer: customer,
        walletBalance: customer?.walletBalance || 0,
        creditBalance: customer?.creditBalance || 0,
        loyaltyPoints: customer?.loyaltyPoints || 0,
      });
    },
    setSearchQuery: (query: string): void => {
      setState({ ...state, searchQuery: query });
    },
    setWalletBalance: (balance: number): void => {
      setState({ ...state, walletBalance: balance });
    },
    setCreditBalance: (balance: number): void => {
      setState({ ...state, creditBalance: balance });
    },
    setLoyaltyPoints: (points: number): void => {
      setState({ ...state, loyaltyPoints: points });
    },
    setLoading: (loading: boolean): void => {
      setState({ ...state, loading });
    },
    setError: (error: string): void => {
      setState({ ...state, error });
    },
    resetCustomer: (): void => {
      setState(initialCustomerState);
    },
  };
};
