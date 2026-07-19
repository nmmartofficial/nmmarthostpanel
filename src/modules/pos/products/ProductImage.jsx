
import React from 'react';
import { Package } from 'lucide-react';

export default function ProductImage({ image, name }) {
  return (
    <div className="w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-xl flex items-center justify-center overflow-hidden">
      {image ? (
        <img
          src={image}
          alt={name}
          className="w-full h-full object-contain p-2"
        />
      ) : (
        <Package size={48} className="text-gray-300" />
      )}
    </div>
  );
}
