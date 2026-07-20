
import React from 'react';
import { useCustomer } from '../hooks/useCustomer';

interface CustomerSearchProps {
  className?: string;
}

export const CustomerSearch = ({ className = '' }: CustomerSearchProps) => {
  const { searchQuery, search } = useCustomer();

  return (
    <input
      type="text"
      placeholder="Search by Name, Code, or Mobile..."
      value={searchQuery}
      onChange={(e) => search(e.target.value)}
      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    />
  );
};
