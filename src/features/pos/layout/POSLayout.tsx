import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, PackageSearch, Settings2, ShoppingCart } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import { usePOS } from '../../../context';
import { toast } from 'sonner';
import CenterPanel from '../components/CenterPanel';
import RightSidebar from '../components/RightSidebar';
import POSSettingsDialog from '../settings/POSSettingsDialog';
import {
  canManagePOSLayoutSettings,
  normalizePOSLayoutSettings
} from '../settings/posLayoutSettings';

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

export const POS_LAYOUT_DEFAULTS = Object.freeze({
  billingRatio: 1.7,
  productButtonMinWidth: 124,
  productButtonMinHeight: 64,
  cartItemColumnMinWidth: 180,
  cartRowMinHeight: 42,
  gridGap: 8
});

export const resolvePOSLayoutConfig = (overrides: Partial<typeof POS_LAYOUT_DEFAULTS> = {}) => ({
  billingRatio: clamp(overrides.billingRatio ?? POS_LAYOUT_DEFAULTS.billingRatio, 1, 2.2),
  productButtonMinWidth: clamp(overrides.productButtonMinWidth ?? POS_LAYOUT_DEFAULTS.productButtonMinWidth, 96, 220),
  productButtonMinHeight: clamp(overrides.productButtonMinHeight ?? POS_LAYOUT_DEFAULTS.productButtonMinHeight, 48, 112),
  cartItemColumnMinWidth: clamp(overrides.cartItemColumnMinWidth ?? POS_LAYOUT_DEFAULTS.cartItemColumnMinWidth, 140, 360),
  cartRowMinHeight: clamp(overrides.cartRowMinHeight ?? POS_LAYOUT_DEFAULTS.cartRowMinHeight, 36, 72),
  gridGap: clamp(overrides.gridGap ?? POS_LAYOUT_DEFAULTS.gridGap, 4, 20)
});

const formatMoney = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

const POSLayout: React.FC = () => {
  const [mobileItemsVisible, setMobileItemsVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewSettings, setPreviewSettings] = useState<ReturnType<typeof normalizePOSLayoutSettings> | null>(null);
  const [clockNow, setClockNow] = useState(() => new Date());
  const {
    cart = [],
    cartSummary,
    finalTotal = 0,
    paidTotal = 0,
    changeReturn = 0,
    paymentAmounts = {},
    orders = [],
    currentUser,
    setActiveTab,
    cashierShift,
    isShiftLoading,
    shiftError,
    scanStatus,
    posLayoutSettings,
    savePOSLayoutSettings
  } = usePOS();
  const settings = useMemo(
    () => normalizePOSLayoutSettings(previewSettings || posLayoutSettings),
    [previewSettings, posLayoutSettings]
  );
  const layout = useMemo(() => resolvePOSLayoutConfig({
    billingRatio: settings.billingRatio,
    productButtonMinWidth: settings.productButtonMinWidth,
    productButtonMinHeight: settings.productButtonMinHeight,
    cartRowMinHeight: settings.cartRowHeight,
    gridGap: settings.density === 'compact' ? 4 : settings.density === 'comfortable' ? 12 : 8
  }), [settings]);
  const lastBill = useMemo(() => (
    [...(Array.isArray(orders) ? orders : [])]
      .filter((order) => order?.created_at)
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0]
  ), [orders]);
  const formatShort = (amount: unknown) => (
    amount == null || amount === '' ? '—' : formatMoney(Number(amount))
  );
  const paymentSummary = [
    ['Cash', paymentAmounts.Cash],
    ['UPI', paymentAmounts.UPI],
    ['Card', paymentAmounts.Card]
  ].filter(([, amount]) => Number(amount) > 0);
  const billNumber = lastBill?.order_number || lastBill?.invoice_number || lastBill?.id;
  useEffect(() => {
    const intervalId = window.setInterval(() => setClockNow(new Date()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);
  const handleExit = () => {
    if (cart.length > 0) {
      toast.error('Complete or hold the active bill before exiting. Nothing was discarded.');
      return;
    }
    setActiveTab?.('Dashboard');
  };

  return (
    <div
      className={`fixed inset-0 z-[110] flex min-h-0 flex-col overflow-hidden bg-slate-100 text-slate-800 ${settings.density === 'compact' ? 'pos-density-compact' : settings.density === 'comfortable' ? 'pos-density-comfortable' : 'pos-density-standard'}`}
      style={{
        '--pos-billing-ratio': `${layout.billingRatio}fr`,
        '--pos-font-scale': String(settings.fontScale),
        '--pos-product-min-width': `${layout.productButtonMinWidth}px`,
        '--pos-product-min-height': `${layout.productButtonMinHeight}px`,
        '--pos-cart-item-column-min-width': `${layout.cartItemColumnMinWidth}px`,
        '--pos-cart-row-min-height': `${layout.cartRowMinHeight}px`,
        '--pos-grid-gap': `${layout.gridGap}px`,
        '--pos-product-grid-columns': String(settings.productGridColumns),
        '--pos-header-bg': settings.theme === 'blue' ? '#124e9b' : '#073b78',
        '--pos-footer-bg': settings.theme === 'blue' ? '#0d3f82' : '#062f64'
      } as React.CSSProperties}
    >
      <header className={`grid shrink-0 grid-cols-1 gap-2 border-b border-blue-950 px-3 text-white shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4 ${settings.compactHeader ? 'py-1' : 'py-2'}`} style={{ backgroundColor: 'var(--pos-header-bg)' }}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-2 border-r border-white/20 pr-4">
            <ShoppingCart size={23} />
            <span className="flex flex-col leading-tight">
              <span className="font-black uppercase tracking-wide">NM MART POS</span>
              <span className="text-[9px] text-blue-100">shop more save more</span>
            </span>
          </span>
          <span className="text-blue-100">Last Bill: <strong className="text-white">{billNumber ?? '—'}</strong></span>
          <span className="text-blue-100">Last Amount: <strong className="text-white">{lastBill ? formatShort(lastBill.total_amount) : '—'}</strong></span>
          <span className="text-blue-100">Current Bill: <strong className="text-amber-300">{formatMoney(finalTotal)}</strong></span>
          {paymentSummary.length > 0 && paymentSummary.map(([method, amount]) => (
            <span key={method} className="text-blue-100">{method}: <strong className="text-white">{formatShort(amount)}</strong></span>
          ))}
          {paidTotal > 0 && changeReturn > 0 && (
            <span className="text-emerald-200">Change: <strong className="text-white">{formatMoney(changeReturn)}</strong></span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-blue-100">
              {clockNow.toLocaleDateString('en-GB')} · {clockNow.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="max-w-[180px] truncate text-[10px] font-semibold text-white" title={currentUser?.company_code || ''}>
              {currentUser?.name || currentUser?.full_name || currentUser?.username || currentUser?.company_code || 'Store'}
              {currentUser?.company_code ? ` · ${currentUser.company_code}` : ''}
            </span>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-white/40 bg-white/10 px-2.5 text-[10px] font-bold uppercase text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Open POS Settings"
            >
              <Settings2 size={14} /> <span className="hidden sm:inline">POS Settings</span>
            </button>
            <button
              type="button"
              onClick={handleExit}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-red-500 bg-red-600 px-2.5 text-[10px] font-bold uppercase text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Exit Sale Entry and return to admin"
            >
              <ArrowLeft size={14} /> Exit
            </button>
          </div>
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

      {settings.showStatusFooter && <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-blue-950 px-3 py-1.5 text-[10px] font-semibold text-white sm:px-4" style={{ backgroundColor: 'var(--pos-footer-bg)' }}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', scanStatus?.type === 'error' ? 'bg-red-400' : scanStatus?.type === 'success' ? 'bg-emerald-400' : 'bg-slate-300')} />
            Scanner {scanStatus?.message || 'Ready'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', shiftError ? 'bg-red-400' : isShiftLoading ? 'bg-amber-300' : cashierShift ? 'bg-emerald-400' : 'bg-amber-300')} />
            {shiftError ? 'Shift unavailable' : isShiftLoading ? 'Checking cashier shift' : cashierShift ? 'Cashier shift open' : 'Cashier shift required'}
          </span>
          {settings.showShortcutFooter && <span>F1 Search · F2 Customer · F3 Hold · F4 Held · F6 Cash Pay · F7 Shift · F8 Discount · F9 Activity · F10 Devices · F12 Checkout · +/- Qty · Del Remove</span>}
        </div>
        <span className="text-white/80">
          {cashierShift ? 'Shift Open' : shiftError ? 'Shift unavailable' : isShiftLoading ? 'Checking shift' : 'Shift required'}
          {' · '}{cartSummary?.totalQuantity ?? cart.length} items
        </span>
      </footer>}
      <POSSettingsDialog
        open={settingsOpen}
        initialSettings={posLayoutSettings}
        canManage={canManagePOSLayoutSettings(currentUser)}
        onClose={() => setSettingsOpen(false)}
        onPreview={setPreviewSettings}
        onCancelPreview={() => setPreviewSettings(null)}
        onSave={async (nextSettings) => {
          await savePOSLayoutSettings(nextSettings);
          setPreviewSettings(null);
        }}
      />
    </div>
  );
};

export default POSLayout;
