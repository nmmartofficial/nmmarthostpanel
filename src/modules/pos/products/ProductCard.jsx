
import React from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import ProductImage from './ProductImage';
import ProductPrice from './ProductPrice';
import ProductStock from './ProductStock';
import { usePOS } from '../context/POSContext';

export default function ProductCard({ product }) {
  const { addToCart, openQuantityDialog } = usePOS();

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(product, 1);
  };

  const handleOpenQuantity = (e) => {
    e.stopPropagation();
    openQuantityDialog(product);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-emerald-400 hover:shadow-lg transition-all overflow-hidden flex flex-col">
      <div className="relative">
        <ProductImage image={product.image} name={product.name} />
        <button
          onClick={handleOpenQuantity}
          className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100 transition-colors"
        >
          <Plus size={16} className="text-gray-700" />
        </button>
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-semibold">
            {product.category}
          </span>
          <span className="text-xs text-gray-400 font-mono">{product.sku}</span>
        </div>
        <ProductStock stock={product.stock} />
        <div className="flex items-center justify-between mt-auto pt-2">
          <ProductPrice price={product.price} mrp={product.mrp} />
          <button
            onClick={handleAddToCart}
            className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg p-2 shadow-md hover:from-emerald-700 hover:to-emerald-600 transition-all"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
