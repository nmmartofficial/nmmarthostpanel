import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Clock, Pause, RefreshCw, Trash2, BadgePercent, FileText, LayoutGrid,
  Activity, Radio
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils/helpers';
import { calcCartLineTotal, getCartUnitPrice } from '../utils/pos/calculations';
import { usePOS } from '../context';

const formatAmount = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const toOptionalNumber = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const CartRow = memo(({
  item,
  index,
  isSelected,
  isNew,
  isTouchMode,
  discountAmount,
  gstRate,
  onSelect,
  onRemove,
  onUpdateQty,
  onUpdatePrice,
  openKeypad
}) => {
  const [quantityInput, setQuantityInput] = useState(String(item.quantity ?? ''));
  const [priceInput, setPriceInput] = useState(String(getCartUnitPrice(item) ?? ''));
  const [editingPrice, setEditingPrice] = useState(false);
  const unitRate = getCartUnitPrice(item);
  const mrp = toOptionalNumber(item.mrp);
  const quantity = toOptionalNumber(item.quantity);
  const lineTotal = unitRate === null ? null : calcCartLineTotal(item);
  const gross = unitRate !== null && quantity !== null ? unitRate * quantity : null;
  const discountPercent = gross > 0 && discountAmount != null
    ? (Number(discountAmount) / gross) * 100
    : discountAmount == null ? null : 0;
  const name = item.itname || item.name || item.item_name || 'Unnamed item';

  useEffect(() => {
    setQuantityInput(String(item.quantity ?? ''));
  }, [item.quantity]);

  useEffect(() => {
    setPriceInput(String(getCartUnitPrice(item) ?? ''));
  }, [item.onlinerate, item.sale_rate]);

  const commitQuantity = () => {
    const next = toOptionalNumber(quantityInput);
    if (next === null || next < 0) {
      setQuantityInput(String(item.quantity ?? ''));
      return;
    }
    onUpdateQty(item.id, next);
  };

  const commitPrice = () => {
    const next = toOptionalNumber(priceInput);
    setEditingPrice(false);
    if (next === null || next < 0) {
      setPriceInput(String(unitRate ?? ''));
      toast.error('Enter a valid non-negative price');
      return;
    }
    if (next !== unitRate) onUpdatePrice(item.id, next);
  };

  return (
    <tr
      onClick={() => onSelect(item.id)}
      className={cn(
        'border-b border-slate-100 text-[11px] transition-colors',
        'min-h-[var(--pos-cart-row-min-height,42px)]',
        isSelected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50',
        isNew && 'bg-emerald-50'
      )}
    >
      <td className="px-2 py-1.5 text-center font-semibold text-slate-500">{index + 1}</td>
      <td className="min-w-[160px] max-w-[260px] px-2 py-1.5">
        <span className="block truncate font-bold text-slate-800" title={name}>{name}</span>
        {(item.barcode || item.sku || item.item_code) && (
          <span className="block truncate text-[9px] text-slate-400">{item.barcode || item.sku || item.item_code}</span>
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{mrp === null ? '—' : formatAmount(mrp)}</td>
      <td className="px-2 py-1 text-center" onClick={(event) => event.stopPropagation()}>
        <input
          aria-label={`Quantity for ${name}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={quantityInput}
          onChange={(event) => setQuantityInput(event.target.value)}
          onBlur={commitQuantity}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              setQuantityInput(String(item.quantity ?? ''));
              event.currentTarget.blur();
            }
          }}
          onClick={() => {
            if (isTouchMode) openKeypad(`Quantity for ${name}`, quantityInput, (value) => {
              setQuantityInput(String(value));
              onUpdateQty(item.id, Number(value));
            });
          }}
          className="h-9 w-14 rounded border border-slate-200 bg-white text-center font-bold outline-none focus:border-blue-500"
        />
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-center tabular-nums">
        {discountPercent === null ? '—' : `${discountPercent.toFixed(2)}%`}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-center tabular-nums">
        {gstRate === null ? '—' : `${gstRate.toFixed(2)}%`}
      </td>
      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums" onClick={(event) => event.stopPropagation()}>
        {editingPrice ? (
          <input
            aria-label={`Sale rate for ${name}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            autoFocus
            value={priceInput}
            onChange={(event) => setPriceInput(event.target.value)}
            onBlur={commitPrice}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setPriceInput(String(unitRate ?? ''));
                setEditingPrice(false);
              }
            }}
            className="h-9 w-20 rounded border border-blue-300 bg-white px-1 text-right font-bold outline-none focus:border-blue-600"
          />
        ) : (
          <button
            type="button"
            aria-label={`Edit sale rate for ${name}`}
            title="Price change requires the existing manager approval flow"
            onClick={() => {
              if (unitRate === null) {
                toast.error('Price is unavailable for this item');
              } else if (isTouchMode) {
                openKeypad(`Sale rate for ${name}`, unitRate, (value) => onUpdatePrice(item.id, Number(value)));
              } else {
                setEditingPrice(true);
              }
            }}
            className="min-h-9 min-w-14 rounded px-1 font-bold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {unitRate === null ? '—' : formatAmount(unitRate)}
          </button>
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-right font-bold tabular-nums">
        {lineTotal === null ? '—' : formatAmount(lineTotal)}
      </td>
      <td className="px-2 py-1.5 text-center" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={() => onRemove(item.id)}
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
});

CartRow.displayName = 'CartRow';

const CartPanel = memo(() => {
  const {
    cart = [],
    selectedCartId,
    setSelectedCartId,
    removeFromCart,
    updateQty,
    handlePriceChangeAttempt,
    lastAddedId,
    isTouchMode,
    openKeypad,
    cartContainerRef,
    holdSuccessMsg,
    heldBills = [],
    setShowHoldQueue,
    cartSummary,
    subTotal,
    totalGst,
    taxBreakdown,
    gstPricingMode,
    taxError,
    billingError,
    activePromotion,
    couponError,
    promotionDiscount,
    deliveryChargeAmount,
    totalDiscount,
    pointsDiscountVal,
    roundOff,
    finalTotal,
    isProcessing,
    setShowDiscountPanel,
    setPaymentAmounts,
    setShowPaymentModal,
    handleClearCartAttempt,
    handleHoldBill,
    isSplitPayment,
    setIsSplitPayment,
    setActiveTab,
    setShowShiftPanel,
    setShowTimeline,
    setShowHardwareDashboard
  } = usePOS();

  const mrpTotal = useMemo(() => {
    const values = cart.map((item) => toOptionalNumber(item.mrp));
    return values.length > 0 && values.every((value) => value !== null)
      ? values.reduce((total, value) => total + Number(value), 0)
      : null;
  }, [cart]);
  const taxComponents = ['cgst', 'sgst', 'igst', 'cess'].filter((key) => (
    taxBreakdown?.[key] !== null && taxBreakdown?.[key] !== undefined
  ));

  const openOrdersReturns = () => {
    if (cart.length > 0) {
      toast.error('Hold or clear the current bill before opening Orders & Returns.');
      return;
    }
    setActiveTab?.('Orders');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
          <span className="uppercase tracking-wide">Bill items</span>
          <span>{cart.length} lines</span>
          <span>{cartSummary?.totalQuantity ?? 0} units</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
          <span>MRP total</span>
          <span className="text-slate-900">{mrpTotal === null ? '—' : `₹${formatAmount(mrpTotal)}`}</span>
        </div>
      </div>

      <div
        ref={cartContainerRef}
        className={cn(
          'overflow-auto bg-white custom-scrollbar',
          cart.length > 0 ? 'min-h-[120px] flex-1' : 'shrink-0'
        )}
      >
        {cart.length === 0 ? (
          <div className="flex min-h-28 items-center justify-center px-4 py-5 text-center">
            <div>
              <p className="text-sm font-bold text-slate-500">Bill is empty</p>
              <p className="mt-1 text-xs text-slate-400">Scan a barcode or select an item to begin.</p>
            </div>
          </div>
        ) : (
          <table className="w-full min-w-[820px] border-collapse">
            <thead className="sticky top-0 z-10 bg-blue-700 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
              <tr>
                <th className="w-12 px-2 py-2 text-center">Sr. No.</th>
                <th className="min-w-[160px] px-2 py-2 text-left">Item Name</th>
                <th className="w-20 px-2 py-2 text-right">MRP</th>
                <th className="w-20 px-2 py-2 text-center">Qty</th>
                <th className="w-20 px-2 py-2 text-center">Disc %</th>
                <th className="w-20 px-2 py-2 text-center">GST %</th>
                <th className="w-24 px-2 py-2 text-right">Sale Rate</th>
                <th className="w-24 px-2 py-2 text-right">Total</th>
                <th className="w-12 px-2 py-2 text-center">Del</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, index) => {
                const taxItem = taxBreakdown?.items?.[String(item.id)];
                const rate = toOptionalNumber(item.gst_percent ?? item.gst);
                return (
                  <CartRow
                    key={`bill-${item.id}`}
                    item={item}
                    index={index}
                    isSelected={selectedCartId === item.id}
                    isNew={lastAddedId === item.id}
                    isTouchMode={isTouchMode}
                    discountAmount={taxItem?.discountAmount}
                    gstRate={rate}
                    onSelect={setSelectedCartId}
                    onRemove={removeFromCart}
                    onUpdateQty={updateQty}
                    onUpdatePrice={handlePriceChangeAttempt}
                    openKeypad={openKeypad}
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-slate-50">
        {holdSuccessMsg && (
          <p role="status" className="bg-emerald-600 px-3 py-1.5 text-center text-[10px] font-bold text-white">
            Bill held successfully
          </p>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 pt-2 text-[11px] sm:grid-cols-4">
          <SummaryLine label="Subtotal" value={`₹${formatAmount(subTotal)}`} />
          <SummaryLine
            label="GST included"
            value={gstPricingMode && totalGst !== null ? `₹${formatAmount(totalGst)}` : 'Setup required'}
          />
          {taxComponents.map((key) => (
            <SummaryLine key={key} label={key.toUpperCase()} value={`₹${formatAmount(taxBreakdown[key])}`} />
          ))}
          <SummaryLine label="Discounts & offers" value={`−₹${formatAmount(totalDiscount)}`} />
          {activePromotion && promotionDiscount > 0 && (
            <SummaryLine label={activePromotion.title} value={`−₹${formatAmount(promotionDiscount)}`} />
          )}
          {deliveryChargeAmount > 0 && (
            <SummaryLine label="Service / delivery" value={`₹${formatAmount(deliveryChargeAmount)}`} />
          )}
          {pointsDiscountVal > 0 && (
            <SummaryLine label="Points discount" value={`−₹${formatAmount(pointsDiscountVal)}`} />
          )}
          <SummaryLine label="Round off" value={`₹${formatAmount(roundOff)}`} />
        </div>
        {taxBreakdown && taxComponents.length === 0 && (
          <p className="px-3 pt-1 text-[9px] text-slate-500">
            Current tax calculation provides GST included, but not a configured CGST/SGST/IGST/CESS split.
          </p>
        )}
        {taxError && (
          <p role="alert" className="mx-3 mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">
            {taxError === 'POS_GST_CONFIGURATION_REQUIRED'
              ? 'Store GST-inclusive configuration is unavailable.'
              : 'A valid GST rate is required for each item.'}
          </p>
        )}
        {billingError && (
          <p role="alert" className="mx-3 mt-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-800">
            Discounts cannot exceed the bill subtotal.
          </p>
        )}
        {couponError && (
          <p role="alert" className="mx-3 mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">
            {couponError}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-600">Net payable</span>
            <span className="text-2xl font-black leading-none text-blue-900">₹{formatAmount(finalTotal)}</span>
          </div>
          <button
            type="button"
            disabled={cart.length === 0 || isProcessing || Boolean(taxError)}
            onClick={() => {
              setPaymentAmounts({ Cash: finalTotal, UPI: 0, Card: 0 });
              setShowPaymentModal(true);
            }}
            className="min-h-11 rounded-lg bg-blue-700 px-5 text-sm font-black uppercase text-white shadow hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Complete bill · F12
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 p-2 sm:grid-cols-3 xl:grid-cols-6">
          <button
            type="button"
            disabled={!selectedCartId}
            onClick={() => removeFromCart(selectedCartId)}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 text-[10px] font-bold uppercase text-red-700 disabled:opacity-40"
          >
            <Trash2 size={13} /> Delete selected
          </button>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setShowDiscountPanel(true)}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-[10px] font-bold uppercase text-blue-800 disabled:opacity-40"
          >
            <BadgePercent size={13} /> Discount / coupon
          </button>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleHoldBill}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 text-[10px] font-bold uppercase text-amber-800 disabled:opacity-40"
          >
            <Pause size={13} /> Hold bill · F3
          </button>
          <button
            type="button"
            onClick={() => setShowHoldQueue(true)}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold uppercase text-slate-700"
          >
            <Clock size={13} /> Held ({heldBills.length}) · F4
          </button>
          <button
            type="button"
            onClick={openOrdersReturns}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 text-[10px] font-bold uppercase text-purple-800"
          >
            <FileText size={13} /> Orders / returns
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSplitPayment(!isSplitPayment);
              setPaymentAmounts({ Cash: finalTotal, UPI: 0, Card: 0 });
            }}
            className={cn(
              'inline-flex min-h-10 items-center justify-center gap-1 rounded-md border px-2 text-[10px] font-bold uppercase',
              isSplitPayment
                ? 'border-blue-700 bg-blue-700 text-white'
                : 'border-blue-200 bg-blue-50 text-blue-800'
            )}
          >
            <LayoutGrid size={13} /> {isSplitPayment ? 'Split tender on' : 'Split tender'}
          </button>
          <button
            type="button"
            onClick={() => setShowShiftPanel(true)}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold uppercase text-slate-700"
          >
            <Activity size={13} /> Shift · F7
          </button>
          <button
            type="button"
            onClick={() => setShowTimeline(true)}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold uppercase text-slate-700"
          >
            <Clock size={13} /> Activity · F9
          </button>
          <button
            type="button"
            onClick={() => setShowHardwareDashboard(true)}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-bold uppercase text-slate-700"
          >
            <Radio size={13} /> Devices · F10
          </button>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleClearCartAttempt}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 text-[10px] font-bold uppercase text-slate-700 disabled:opacity-40 sm:col-span-3 xl:col-span-6"
          >
            <RefreshCw size={13} /> Clear bill · confirmation required
          </button>
        </div>
      </div>
    </div>
  );
});

const SummaryLine = ({ label, value }) => (
  <div className="flex min-w-0 items-center justify-between gap-2 text-slate-500">
    <span className="truncate">{label}</span>
    <strong className="shrink-0 tabular-nums text-slate-800">{value}</strong>
  </div>
);

CartPanel.displayName = 'CartPanel';

export default CartPanel;
