import React, { memo } from 'react';
import { cn } from '../utils/helpers';

const ProductCard = memo(({ product, addToCart }) => (
  <button 
    onClick={() => addToCart(product)}
    className={cn(
      "bg-white p-2.5 rounded-xl border transition-all flex flex-col justify-between h-28 relative group shadow-enterprise hover:shadow-card hover:translate-y-[-2px]",
      product.stock <= 5 ? "border-warning-200 bg-warning-50" : "border-neutral-100",
      product.stock <= 0 && "opacity-50 grayscale cursor-not-allowed shadow-none hover:translate-y-0"
    )}
  >
    <div className="flex flex-col items-center">
      <span className="text-[11px] font-black text-neutral-800 uppercase leading-tight text-center w-full px-1 line-clamp-2">
        {product.name}
      </span>
      {product.stock <= 10 && product.stock > 0 && (
        <span className="text-[8px] font-black text-warning-600 uppercase mt-1 bg-warning-100 px-1.5 py-0.5 rounded shadow-sm">
          {product.stock} LEFT
        </span>
      )}
      {product.stock <= 0 && (
        <span className="text-[8px] font-black text-error-600 uppercase mt-1 bg-error-100 px-1.5 py-0.5 rounded shadow-sm">
          OUT OF STOCK
        </span>
      )}
    </div>
    <div className="flex justify-between items-end w-full mt-auto">
      <span className="text-[8px] font-black text-neutral-400 uppercase">{product.unit || 'PCS'}</span>
      <span className="text-[12px] font-black text-primary-600">
        ₹{product.sale_rate}
      </span>
    </div>
  </button>
));

export default ProductCard;
