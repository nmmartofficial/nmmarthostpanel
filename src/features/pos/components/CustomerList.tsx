
import React from 'react';
import { useCustomer } from '../hooks/useCustomer';
import { CustomerCard } from './CustomerCard';

interface CustomerListProps {
  className?: string;
}

export const CustomerList = ({ className = '' }: CustomerListProps) => {
  const { customers } = useCustomer();

  return (
    <div className={`space-y-2 ${className}`}>
      {customers.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
};
