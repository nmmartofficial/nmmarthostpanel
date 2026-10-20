import React, { memo } from 'react';
import { cn } from '../utils/helpers';
import { getCartUnitPrice } from '../utils/pos/calculations';

const ProductCard = memo(({ product, addToCart, isSelected, isTouchMode }) => {
  const name = product.itname || product.name || product.item_name || 'Unnamed item';
  const packSize = product.pack_size
    || product.package_size
    || product.unitcode
    || product.unit_name
    || product.unit
    || product.net_weight
    || '';
  const stockValue = product.stock ?? product.available_stock ?? product.availstock;
  const stock = stockValue == null || stockValue === '' ? null : Number(stockValue);
  const unavailable = Number.isFinite(stock) && stock <= 0;
  const saleRate = getCartUnitPrice(product);
  const disabled = unavailable || saleRate === null;

  return (
    <button
      type="button"
      onClick={() => addToCart(product)}
      disabled={disabled}
      aria-label={`${name}${packSize ? ` ${packSize}` : ''}${unavailable ? ', out of stock' : ''}${saleRate === null ? ', price unavailable' : ''}`}
      className={cn(
        'flex min-h-[var(--pos-product-min-height,64px)] min-w-0 items-center justify-center rounded-lg border px-2 py-2 text-center font-bold leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        isTouchMode ? 'text-xs sm:text-sm' : 'text-xs',
        isSelected
          ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-300'
          : 'border-blue-100 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50',
        disabled && 'cursor-not-allowed opacity-50'
      )}
      title={saleRate === null ? 'Price unavailable' : unavailable ? 'Out of stock' : undefined}
    >
      <span className="line-clamp-3 break-words">
        {name}{packSize ? ` ${packSize}` : ''}
      </span>
    </button>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
