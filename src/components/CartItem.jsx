import React, { memo, useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Minus, Hash, Edit3 } from 'lucide-react';
import { cn } from '../utils/helpers';
import { toast } from 'sonner';
import { calcCartLineTotal, getCartUnitPrice } from '../utils/pos/calculations';

const CartItem = memo(({ item, removeFromCart, updateQty, updatePrice, onIncrement, onDecrement, isSelected, onSelect, lastAddedId, isTouchMode, onOpenKeypad }) => {
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editQtyValue, setEditQtyValue] = useState(item.quantity);
  const [editPriceValue, setEditPriceValue] = useState(getCartUnitPrice(item) ?? '');

  const qtyInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const isNew = lastAddedId === item.id;

  const name = item.itname || item.name || 'Unknown Item';
  const saleRate = getCartUnitPrice(item);
  const hasSaleRate = saleRate !== null;
  const mrpValue = item.mrp;
  const parsedMrp = mrpValue === null || mrpValue === undefined || mrpValue === '' ? null : Number(mrpValue);
  const mrp = Number.isFinite(parsedMrp) ? parsedMrp : null;
  const rawStock = item.stock ?? item.available_stock ?? item.availstock;
  const stock = rawStock == null || rawStock === '' ? null : Number(rawStock);
  const qty = parseFloat(item.quantity || 0);
  const lineTotal = hasSaleRate ? calcCartLineTotal(item) : null;
  const barcode = item.barcode || '';
  const unit = item.unitcode || item.unit_name || item.unit || 'PCS';

  useEffect(() => {
    if (isEditingQty && qtyInputRef.current) {
      qtyInputRef.current.focus();
      qtyInputRef.current.select();
    }
  }, [isEditingQty]);

  useEffect(() => {
    if (isEditingPrice && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [isEditingPrice]);

  const handleQtySubmit = (valInput) => {
    const val = parseFloat(valInput ?? editQtyValue);
    if (!isNaN(val) && val >= 0) {
      updateQty(item.id, val);
    }
    setIsEditingQty(false);
  };

  const handlePriceSubmit = (valInput) => {
    const val = getCartUnitPrice({ sale_rate: valInput ?? editPriceValue });
    if (val === null || val < 0) {
      toast.error('Enter a valid non-negative price');
      return;
    }
    if (val !== saleRate) updatePrice(item.id, val);
    setIsEditingPrice(false);
  };

  const handleQtyKeyDown = (e) => {
    if (e.key === 'Enter') handleQtySubmit();
    if (e.key === 'Escape') {
      setEditQtyValue(item.quantity);
      setIsEditingQty(false);
    }
  };

  const handlePriceKeyDown = (e) => {
    if (e.key === 'Enter') handlePriceSubmit();
    if (e.key === 'Escape') {
      setEditPriceValue(saleRate);
      setIsEditingPrice(false);
    }
  };

  return (
    <div
      onClick={() => onSelect(item.id)}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-b border-slate-50 font-semibold transition-all duration-300 items-center cursor-pointer",
        isSelected ? "bg-primary-50/50 border-primary-100" : "hover:bg-slate-50/50",
        isNew && "bg-emerald-50 border-emerald-100 animate-pulse",
        isTouchMode ? "px-3 py-4 sm:px-4" : "px-3 py-3"
      )}
    >
      <div className="min-w-0 flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
          className={cn(
            "shrink-0 text-slate-300 hover:text-red-600 transition-colors hover:bg-red-50 rounded-xl flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
            isTouchMode ? "min-h-11 min-w-11" : "min-h-9 min-w-9"
          )}
          title="Remove Item"
          aria-label={`Remove ${name}`}
          type="button"
        >
          <Trash2 size={isTouchMode ? 20 : 16} />
        </button>
        <div className="flex flex-col min-w-0">
          <span className={cn("text-slate-900 font-black uppercase leading-tight line-clamp-2 w-full break-words", isTouchMode ? "text-sm" : "text-[11px]")} title={name}>{name}</span>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={cn("text-slate-400 font-bold flex items-center gap-0.5 min-w-0", isTouchMode ? "text-xs" : "text-[10px]")}>
              <Hash size={isTouchMode ? 10 : 8} /> {barcode || item.sku || item.item_code || 'No SKU'}
            </span>
            {mrp !== null && (
              <span className="text-[10px] font-medium text-slate-400">
                MRP <span className={hasSaleRate && mrp > saleRate ? 'line-through' : ''}>₹{mrp.toFixed(2)}</span>
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[10px] text-slate-500">
              Unit price: {hasSaleRate ? `₹${saleRate.toFixed(2)}` : 'Unavailable'}
            </span>
            {isEditingPrice ? (
              <div className="flex items-center gap-1 bg-white border border-blue-200 rounded px-1 shadow-sm">
                <span className="text-[10px] text-blue-600">₹</span>
                <input
                  ref={priceInputRef}
                  type="number"
                  step="any"
                  value={editPriceValue}
                  onChange={(e) => setEditPriceValue(e.target.value)}
                  onBlur={() => !isTouchMode && handlePriceSubmit()}
                  onKeyDown={handlePriceKeyDown}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isTouchMode) {
                      onOpenKeypad(`Price for ${name}`, editPriceValue, (v) => handlePriceSubmit(v));
                    }
                  }}
                  className="w-16 border-none p-0 text-[10px] font-black text-blue-700 focus:ring-0 bg-transparent"
                />
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isTouchMode) {
                    onOpenKeypad(`Price for ${name}`, saleRate, (v) => handlePriceSubmit(v));
                  } else {
                    setIsEditingPrice(true);
                    setEditPriceValue(saleRate);
                  }
                }}
                className={cn("min-h-8 flex items-center gap-1 font-black hover:bg-primary-100 px-1 rounded transition-colors text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400", isTouchMode ? "text-xs" : "text-[10px]")}
                title="Override Price"
                type="button"
              >
                {hasSaleRate ? 'Edit price' : 'Price unavailable'}
                <Edit3 size={10} className="opacity-40" />
              </button>
            )}
            {(item.brand || item.brand_name) && <span className="text-[10px] font-bold text-slate-400">{item.brand || item.brand_name}</span>}
            {(item.variant || item.variant_name) && <span className="text-[10px] font-bold text-slate-400">{item.variant || item.variant_name}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1">
        <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm">
          <button
            type="button"
            aria-label={`Decrease ${name} quantity`}
            onClick={(e) => { e.stopPropagation(); onDecrement(item.id); }}
            className={cn("flex items-center justify-center rounded-l-xl hover:bg-slate-100 text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400", isTouchMode ? "min-h-11 min-w-11" : "min-h-9 min-w-9")}
          >
            <Minus size={isTouchMode ? 16 : 14} strokeWidth={3} />
          </button>

          {isEditingQty ? (
            <input
              ref={qtyInputRef}
              type="number"
              step="any"
              value={editQtyValue}
              onChange={(e) => setEditQtyValue(e.target.value)}
              onBlur={() => !isTouchMode && handleQtySubmit()}
              onKeyDown={handleQtyKeyDown}
              onClick={(e) => {
                e.stopPropagation();
                if (isTouchMode) {
                  onOpenKeypad(`Qty for ${name}`, editQtyValue, (v) => handleQtySubmit(v));
                }
              }}
              className={cn("text-center bg-slate-50 border-none p-1 font-black text-slate-900 focus:ring-0", isTouchMode ? "w-12 text-sm" : "w-10 text-[11px]")}
            />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isTouchMode) {
                  onOpenKeypad(`Qty for ${name}`, qty, (v) => handleQtySubmit(v));
                } else {
                  setIsEditingQty(true);
                  setEditQtyValue(item.quantity);
                }
              }}
              aria-label={`Edit ${name} quantity, currently ${qty}`}
              className={cn("text-center py-1 font-black text-slate-900 cursor-text min-h-9", isTouchMode ? "w-12 text-sm" : "w-10 text-[11px]")}
            >
              {qty}
            </button>
          )}

          <button
            type="button"
            aria-label={`Increase ${name} quantity`}
            onClick={(e) => { e.stopPropagation(); onIncrement(item.id); }}
            className={cn("flex items-center justify-center rounded-r-xl hover:bg-slate-100 text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400", isTouchMode ? "min-h-11 min-w-11" : "min-h-9 min-w-9")}
          >
            <Plus size={isTouchMode ? 16 : 14} strokeWidth={3} />
          </button>
        </div>
        <span className={cn("font-black text-slate-400 uppercase", isTouchMode ? "text-[11px]" : "text-[9px]")}>{unit}</span>
      </div>

      <div className="min-w-[4.5rem] text-right flex flex-col">
        <span className={cn("text-slate-900 font-bold tracking-tight", isTouchMode ? "text-sm" : "text-[12px]")}>
          {lineTotal !== null ? `₹${lineTotal.toFixed(2)}` : '—'}
        </span>
        {stock !== null && Number.isFinite(stock) && (
          <span className={cn("font-bold text-slate-400", isTouchMode ? "text-[10px]" : "text-[8px]")}>
            {stock <= 0 ? 'Out of stock' : `${stock} in stock`}
          </span>
        )}
      </div>
    </div>
  );
});

export default CartItem;
