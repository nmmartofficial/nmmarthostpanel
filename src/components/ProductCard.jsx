import React, { memo } from 'react';
import { Package, Hash, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '../utils/helpers';

const ProductCard = memo(({ product, addToCart, isSelected, isTouchMode }) => {
  const name = product.itname || product.name || 'Unknown Item';
  const stock = parseFloat(product.opstock ?? product.stock ?? 0);
  const saleRate = parseFloat(product.onlinerate || product.sale_rate || 0);
  const unit = product.unitcode || product.unit_name || product.unit || 'PCS';
  const barcode = product.barcode || '';
  const imageUrl = product.picture || product.image_url || null;

  return (
    <button
      onClick={() => addToCart(product)}
      className={cn(
        "bg-white rounded-xl border transition-all flex flex-col h-auto relative group overflow-hidden shadow-sm hover:shadow-md hover:translate-y-[-1px] active:scale-95",
        isSelected ? "ring-2 ring-primary-500 border-primary-500 bg-primary-50/30" : "border-slate-200",
        stock <= 0 ? "bg-slate-50 cursor-not-allowed" : "",
        isTouchMode ? "p-1" : ""
      )}
    >
      {/* Product Image Section */}
      <div className={cn(
        "relative aspect-square w-full bg-slate-100 flex items-center justify-center border-b border-slate-100 overflow-hidden",
        isTouchMode ? "p-3" : "p-2"
      )}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-20">
            <Package size={isTouchMode ? 48 : 32} />
            <span className="text-[8px] font-black uppercase">No Image</span>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {stock <= 0 && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className={cn("bg-red-600 text-white font-black uppercase tracking-[0.2em] rounded-full shadow-lg flex items-center gap-1", isTouchMode ? "text-xs px-5 py-2" : "text-[9px] px-3 py-1")}>
              <XCircle size={isTouchMode ? 14 : 10} /> Out of Stock
            </div>
          </div>
        )}

        {/* Unit Badge */}
        <div className={cn("absolute top-2 right-2 bg-white/90 backdrop-blur-md text-slate-800 font-black rounded border border-slate-200 shadow-sm uppercase", isTouchMode ? "text-[10px] px-2.5 py-1" : "text-[8px] px-2 py-0.5")}>
          {unit}
        </div>
      </div>

      {/* Info Section */}
      <div className={cn("space-y-2 flex-1 flex flex-col justify-between", isTouchMode ? "p-4" : "p-3")}>
        <div className="space-y-1">
          <h4 className={cn("font-black text-slate-800 uppercase leading-tight line-clamp-2", isTouchMode ? "text-sm min-h-[40px]" : "text-[11px] min-h-[22px]")}>
            {name}
          </h4>

          <div className={cn("flex items-center gap-1 font-bold text-slate-400 uppercase tracking-widest", isTouchMode ? "text-[10px]" : "text-[8px]")}>
            <Hash size={isTouchMode ? 10 : 8} /> {barcode || 'No Barcode'}
          </div>
        </div>

        <div className="flex items-end justify-between pt-1">
          <div className="flex flex-col">
            <span className={cn("font-black text-primary-600 tracking-tighter", isTouchMode ? "text-base" : "text-xs")}>
              ₹{saleRate.toFixed(2)}
            </span>
          </div>

          {/* Stock Badges */}
          {stock > 10 ? (
            <div className={cn("flex items-center gap-1 text-emerald-600 bg-emerald-50 rounded font-black uppercase tracking-tighter border border-emerald-100", isTouchMode ? "px-2 py-1 text-[10px]" : "px-1.5 py-0.5 text-[8px]")}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              In Stock
            </div>
          ) : stock > 0 ? (
            <div className={cn("flex items-center gap-1 text-orange-600 bg-orange-50 rounded font-black uppercase tracking-tighter border border-orange-100 animate-pulse", isTouchMode ? "px-2 py-1 text-[10px]" : "px-1.5 py-0.5 text-[8px]")}>
              <AlertTriangle size={isTouchMode ? 12 : 10} />
              Low: {stock}
            </div>
          ) : (
            <div className={cn("text-red-600 font-black uppercase tracking-tighter opacity-50", isTouchMode ? "text-[10px]" : "text-[8px]")}>
              Unavailable
            </div>
          )}
        </div>
      </div>
    </button>
  );
});

export default ProductCard;
