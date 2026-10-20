import React, { useMemo, useState } from 'react';
import { ClipboardList, PackageSearch, ShoppingCart } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import { usePOS } from '../../../context';
import CenterPanel from '../components/CenterPanel';
import RightSidebar from '../components/RightSidebar';

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

export const POS_LAYOUT_DEFAULTS = Object.freeze({
  billingRatio: 1.55,
  productButtonMinWidth: 124,
  productButtonMinHeight: 64,
  cartRowMinHeight: 42,
  gridGap: 8
});

export const resolvePOSLayoutConfig = (overrides: Partial<typeof POS_LAYOUT_DEFAULTS> = {}) => ({
  billingRatio: clamp(overrides.billingRatio ?? POS_LAYOUT_DEFAULTS.billingRatio, 1, 2.2),
  productButtonMinWidth: clamp(overrides.productButtonMinWidth ?? POS_LAYOUT_DEFAULTS.productButtonMinWidth, 96, 220),
  productButtonMinHeight: clamp(overrides.productButtonMinHeight ?? POS_LAYOUT_DEFAULTS.productButtonMinHeight, 48, 112),
  cartRowMinHeight: clamp(overrides.cartRowMinHeight ?? POS_LAYOUT_DEFAULTS.cartRowMinHeight, 36, 72),
  gridGap: clamp(overrides.gridGap ?? POS_LAYOUT_DEFAULTS.gridGap, 4, 20)
});

const formatMoney = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

const POSLayout: React.FC = () => {
  const [mobileItemsVisible, setMobileItemsVisible] = useState(false);
  const {
    cart = [],
    cartSummary,
    finalTotal = 0,
    paidTotal = 0,
    changeReturn = 0,
    paymentAmounts = {},
    orders = [],
    currentUser,
    cashierShift,
    isShiftLoading,
    shiftError,
    scanStatus
  } = usePOS();
  const layout = useMemo(() => resolvePOSLayoutConfig(), []);
  const lastBill = useMemo(() => (
    [...(Array.isArray(orders) ? orders : [])]
      .filter((order) => order?.created_at)
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0]
  ), [orders]);
  const now = new Date();
  const formatShort = (amount: unknown) => (
    amount == null || amount === '' ? '—' : formatMoney(Number(amount))
  );
  const paymentSummary = [
    ['Cash', paymentAmounts.Cash],
    ['UPI', paymentAmounts.UPI],
    ['Card', paymentAmounts.Card]
  ].filter(([, amount]) => Number(amount) > 0);
  const billNumber = lastBill?.order_number || lastBill?.invoice_number || lastBill?.id;

  return (
    <div
      className="relative -m-4 flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100 text-slate-800"
      style={{
        '--pos-billing-ratio': `${layout.billingRatio}fr`,
        '--pos-product-min-width': `${layout.productButtonMinWidth}px`,
        '--pos-product-min-height': `${layout.productButtonMinHeight}px`,
        '--pos-cart-row-min-height': `${layout.cartRowMinHeight}px`,
        '--pos-grid-gap': `${layout.gridGap}px`
      } as React.CSSProperties}
    >
      <header className="grid shrink-0 grid-cols-1 gap-2 border-b border-blue-900/10 bg-white px-3 py-2 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold">
          <span className="inline-flex items-center gap-2 text-blue-900">
            <ClipboardList size={15} />
            <span className="font-black uppercase tracking-wider">Touch Sale</span>
          </span>
          <span className="text-slate-500">Last bill <strong className="text-slate-800">{billNumber ?? '—'}</strong></span>
          <span className="text-slate-500">Last amount <strong className="text-slate-800">{lastBill ? formatShort(lastBill.total_amount) : '—'}</strong></span>
          <span className="text-slate-500">Current bill <strong className="text-blue-800">{formatMoney(finalTotal)}</strong></span>
          {paymentSummary.length > 0 && paymentSummary.map(([method, amount]) => (
            <span key={method} className="text-slate-500">{method} <strong className="text-slate-800">{formatShort(amount)}</strong></span>
          ))}
          {paidTotal > 0 && changeReturn > 0 && (
            <span className="text-emerald-700">Change <strong>{formatMoney(changeReturn)}</strong></span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-[11px] font-semibold text-slate-500">
            {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="max-w-[220px] truncate text-[11px] font-semibold text-slate-600" title={currentUser?.company_code || ''}>
            {currentUser?.name || currentUser?.full_name || currentUser?.username || currentUser?.company_code || 'Store'}
            {currentUser?.company_code ? ` · ${currentUser.company_code}` : ''}
          </span>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-slate-200 bg-white p-2 lg:hidden">
        <button
          type="button"
          aria-pressed={!mobileItemsVisible}
          onClick={() => setMobileItemsVisible(false)}
          className={cn(
            'min-h-11 rounded-lg px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            !mobileItemsVisible ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
          )}
        >
          <span className="inline-flex items-center gap-2"><ShoppingCart size={17} /> Bill ({cartSummary?.totalQuantity ?? 0})</span>
        </button>
        <button
          type="button"
          aria-pressed={mobileItemsVisible}
          onClick={() => setMobileItemsVisible(true)}
          className={cn(
            'min-h-11 rounded-lg px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            mobileItemsVisible ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
          )}
        >
          <span className="inline-flex items-center gap-2"><PackageSearch size={17} /> Products</span>
        </button>
      </div>

      <main
        className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,var(--pos-billing-ratio))_minmax(20rem,1fr)]"
        aria-label="Point of sale"
      >
        <CenterPanel className={cn('min-h-0', mobileItemsVisible ? 'hidden lg:flex' : 'flex')} />
        <RightSidebar className={cn('min-h-0', mobileItemsVisible ? 'flex' : 'hidden lg:flex')} />
      </main>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-blue-950 bg-[#073b70] px-3 py-2 text-[10px] font-semibold text-white sm:px-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', scanStatus?.type === 'error' ? 'bg-red-400' : scanStatus?.type === 'success' ? 'bg-emerald-400' : 'bg-slate-300')} />
            Scanner {scanStatus?.message || 'Ready'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', shiftError ? 'bg-red-400' : isShiftLoading ? 'bg-amber-300' : cashierShift ? 'bg-emerald-400' : 'bg-amber-300')} />
            {shiftError ? 'Shift unavailable' : isShiftLoading ? 'Checking cashier shift' : cashierShift ? 'Cashier shift open' : 'Cashier shift required'}
          </span>
          <span>F1 Search · F2 Customer · F3 Hold · F4 Held bills · F6 Payment · F12 Sale</span>
        </div>
        <span className="text-white/80">Items in bill: {cart.length}</span>
      </footer>
    </div>
  );
};

export default POSLayout;
