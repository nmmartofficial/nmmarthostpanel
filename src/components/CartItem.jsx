import React, { memo, useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Minus, Hash, Edit3 } from 'lucide-react';
import { cn } from '../utils/helpers';

const CartItem = memo(({ item, removeFromCart, updateQty, updatePrice, isSelected, onSelect, lastAddedId, isTouchMode, onOpenKeypad }) => {
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editQtyValue, setEditQtyValue] = useState(item.quantity);
  const [editPriceValue, setEditPriceValue] = useState(parseFloat(item.onlinerate || item.sale_rate || 0));

  const qtyInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const isNew = lastAddedId === item.id;

  const name = item.itname || item.name || 'Unknown Item';
  const saleRate = parseFloat(item.onlinerate || item.sale_rate || 0);
  const stock = parseFloat(item.opstock ?? item.stock ?? 0);
  const qty = parseFloat(item.quantity || 0);
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
    const val = parseFloat(valInput ?? editPriceValue);
    if (!isNaN(val) && val >= 0 && val !== saleRate) {
      updatePrice(item.id, val);
    }
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
        "flex justify-between border-b border-slate-50 font-semibold transition-all duration-300 items-center cursor-pointer",
        isSelected ? "bg-primary-50/50 border-primary-100" : "hover:bg-slate-50/50",
        isNew && "bg-emerald-50 border-emerald-100 animate-pulse",
        isTouchMode ? "px-6 py-6" : "px-4 py-3"
      )}
    >
      <div className="w-[45%] flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
          className={cn(
            "text-slate-300 hover:text-red-600 transition-colors hover:bg-red-50 rounded-xl flex items-center justify-center",
            isTouchMode ? "w-12 h-12" : "p-1.5"
          )}
          title="Remove Item"
        >
          <Trash2 size={isTouchMode ? 20 : 16} />
        </button>
        <div className="flex flex-col min-w-0">
          <span className={cn("text-slate-900 font-black uppercase leading-tight truncate w-full", isTouchMode ? "text-sm" : "text-[11px]")} title={name}>{name}</span>
          <div className="flex items-center gap-2">
            <span className={cn("text-slate-400 font-bold flex items-center gap-0.5", isTouchMode ? "text-xs" : "text-[10px]")}>
              <Hash size={isTouchMode ? 10 : 8} /> {barcode || 'No SKU'}
            </span>
            {isEditingPrice ? (
              <div className="flex items-center gap-1 bg-white border border-blue-200 rounded px-1 shadow-sm">
                <span className="text-[10px] text-blue-600">₹</span>
                <input
                  ref={priceInputRef}
                  type="number"
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
                className={cn("flex items-center gap-1 font-black hover:bg-primary-100 px-1 rounded transition-colors text-primary-600", isTouchMode ? "text-xs" : "text-[10px]")}
                title="Override Price"
              >
                ₹{saleRate.toFixed(2)}
                <Edit3 size={10} className="opacity-40" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="w-[30%] flex items-center justify-center">
        <div className={cn("flex items-center bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm", isTouchMode ? "scale-110" : "")}>
          <button
            onClick={(e) => { e.stopPropagation(); updateQty(item.id, qty - 1); }}
            className={cn("hover:bg-slate-100 text-slate-600 transition-colors", isTouchMode ? "p-3" : "p-1.5")}
          >
            <Minus size={isTouchMode ? 16 : 14} strokeWidth={3} />
          </button>

          {isEditingQty ? (
            <input
              ref={qtyInputRef}
              type="number"
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
              className={cn("text-center bg-slate-50 border-none p-1 font-black text-slate-900 focus:ring-0", isTouchMode ? "w-16 text-sm" : "w-12 text-[11px]")}
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (isTouchMode) {
                  onOpenKeypad(`Qty for ${name}`, qty, (v) => handleQtySubmit(v));
                } else {
                  setIsEditingQty(true);
                  setEditQtyValue(item.quantity);
                }
              }}
              className={cn("text-center py-1 font-black text-slate-900 cursor-text", isTouchMode ? "w-16 text-sm" : "w-12 text-[11px]")}
            >
              {qty}
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); updateQty(item.id, qty + 1); }}
            className={cn("hover:bg-slate-100 text-slate-600 transition-colors", isTouchMode ? "p-3" : "p-1.5")}
          >
            <Plus size={isTouchMode ? 16 : 14} strokeWidth={3} />
          </button>
        </div>
        <span className={cn("ml-2 font-black text-slate-400 uppercase", isTouchMode ? "text-[11px]" : "text-[9px]")}>{unit}</span>
      </div>

      <div className="w-[25%] text-right flex flex-col">
        <span className={cn("text-slate-900 font-black tracking-tight", isTouchMode ? "text-base" : "text-[12px]")}>₹{(saleRate * qty).toFixed(2)}</span>
        {stock <= 10 && (
          <span className={cn(
            "font-black uppercase",
            stock <= 0 ? "text-red-600" : "text-orange-600",
            isTouchMode ? "text-[10px]" : "text-[8px]"
          )}>
            {stock <= 0 ? 'Out of Stock' : `${stock} left`}
          </span>
        )}
      </div>
    </div>
  );
});

export default CartItem;
