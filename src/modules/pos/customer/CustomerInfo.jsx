
import React from 'react';
import { User, Phone } from 'lucide-react';

export default function CustomerInfo({ customer }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
        <User size={28} />
      </div>
      <div>
        <h4 className="font-bold text-gray-800">{customer?.name || 'Walk-in Customer'}</h4>
        {customer?.phone && (
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Phone size={14} />
            {customer.phone}
          </p>
        )}
      </div>
    </div>
  );
}
