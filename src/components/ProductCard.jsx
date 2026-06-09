import React, { memo } from 'react';
import { cn } from '../utils/helpers';

const ProductCard = memo(({ product, addToCart }) => (
  <button 
    onClick={() => addToCart(product)}
    className={cn(
      "bg-white p-2 rounded border shadow-sm transition-all flex flex-col justify-between h-24 relative group",
      product.stock <= 5 ? "border-amber-400 bg-amber-50/30" : "border-slate-300",
      product.stock <= 0 && "opacity-50 grayscale cursor-not-allowed"
    )}
  >
    <div className="flex flex-col items-center">
      <span className="text-[10px] font-black text-slate-800 uppercase leading-tight text-center w-full px-1">
        {product.name}
      </span>
      {product.stock <= 10 && (
        <span className="text-[7px] font-black text-amber-600 uppercase mt-0.5">
          Stock: {product.stock}
        </span>
      )}
    </div>
    <span className="text-[10px] font-black text-[#E11D48] self-end mt-auto">
      ₹{product.sale_rate}
    </span>
  </button>
));

export default ProductCard;
