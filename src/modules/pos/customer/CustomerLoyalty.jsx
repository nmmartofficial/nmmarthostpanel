
import React from 'react';
import { Star } from 'lucide-react';

export default function CustomerLoyalty({ points = 0 }) {
  return (
    <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
      <Star className="w-6 h-6 mx-auto text-amber-500 mb-1" />
      <p className="text-xs text-gray-500">Loyalty</p>
      <h5 className="font-bold text-gray-800">{points.toLocaleString()}</h5>
    </div>
  );
}
