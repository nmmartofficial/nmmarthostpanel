import React from 'react';
import { Package, Hash, Tag, Check } from 'lucide-react';
import { cn } from '../../../../utils/helpers';
import { useCart } from '../../cart/hooks/useCart';
import type { Product } from '../../types';

interface ProductCardProps {
  className?: string;
  isHovered?: boolean;
  isSelected?: boolean;
  isFocused?: boolean;
  isDisabled?: boolean;
  product?: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  className, 
  isHovered = false, 
  isSelected = false, 
  isFocused = false, 
  isDisabled = false,
  product
}) => {
  const { addItem } = useCart();
  const productName = product?.productName || "Product Name";

  const handleClick = () => {
    if (product && !isDisabled) {
      addItem(product);
    }
  };

  return (
    <div
      onClick={handleClick}
      tabIndex={!isDisabled ? 0 : -1}
      className={cn(
        "bg-white rounded-xl border flex flex-col h-auto relative overflow-hidden shadow-sm transition-all duration-200 cursor-pointer",
        isSelected ? "ring-2 ring-primary-500 border-primary-500 bg-primary-50/30" : "border-slate-200",
        isHovered && !isSelected && !isDisabled ? "border-primary-300 shadow-md hover:shadow-lg" : "",
        isFocused ? "outline-none ring-4 ring-primary-200" : "",
        isDisabled ? "bg-slate-50 cursor-not-allowed opacity-60" : "",
        className
      )}
    >
      {/* Product Image Section */}
      <div className="relative aspect-square w-full bg-slate-100 flex items-center justify-center border-b border-slate-100 overflow-hidden p-2">
        <div className="flex flex-col items-center gap-1 opacity-20">
          <Package size={32} />
          <span className="text-[8px] font-black uppercase">Product Image</span>
        </div>

        {/* Badges (Stock, Offer) */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <div className="bg-emerald-50 text-emerald-600 font-black rounded border border-emerald-100 uppercase text-[8px] px-2 py-0.5">
            In Stock
          </div>
        </div>

        {/* Unit Badge */}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md text-slate-800 font-black rounded border border-slate-200 shadow-sm uppercase text-[8px] px-2 py-0.5">
          PCS
        </div>

        {/* Selected Badge Placeholder */}
        {isSelected && (
          <div className="absolute top-2 left-2 bg-primary-600 text-white rounded-full p-1 shadow-md">
            <Check size={12} />
          </div>
        )}

        {/* Disabled Overlay */}
        {isDisabled && (
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-red-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Unavailable</span>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="space-y-1 flex-1 flex flex-col justify-between p-3">
        <div className="space-y-1">
          <h4 className="font-black text-slate-800 uppercase leading-tight line-clamp-2 text-[11px]">
            {productName}
          </h4>

          <div className="space-y-0.5">
            {product?.sku && (
              <div className="flex items-center gap-1 font-bold text-slate-400 uppercase tracking-widest text-[8px]">
                <Hash size={8} /> {product.sku}
              </div>
            )}
            {product?.barcode && (
              <div className="flex items-center gap-1 font-bold text-slate-400 uppercase tracking-widest text-[8px]">
                <Hash size={8} /> {product.barcode}
              </div>
            )}
            {product?.brand && (
              <div className="flex items-center gap-1 font-bold text-slate-400 uppercase tracking-widest text-[8px]">
                <Tag size={8} /> {product.brand}
              </div>
            )}
            {product?.category && (
              <div className="flex items-center gap-1 font-bold text-slate-400 uppercase tracking-widest text-[8px]">
                <Tag size={8} /> {product.category}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between pt-1">
          <div className="flex flex-col">
            {product?.mrp && (
              <span className="line-through text-xs text-slate-400 font-medium">₹{product.mrp.toFixed(2)}</span>
            )}
            <span className="font-black text-primary-600 tracking-tighter text-xs">
              ₹{(product?.price || 0).toFixed(2)}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="bg-primary-600 text-white rounded font-black uppercase text-[8px] px-3 py-1.5 hover:bg-primary-700 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
