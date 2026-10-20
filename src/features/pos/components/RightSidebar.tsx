import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, CreditCard, Flame, Smartphone } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import {
  buildTopSellingProducts,
  filterRowsToCurrentStore
} from '../../../utils/analyticsHelpers';
import BarcodeInput from '../../../components/BarcodeInput';
import ProductGrid from '../../../components/ProductGrid';
import ProductSearch from '../../../components/ProductSearch';
import { usePOS } from '../../../context';
import { toast } from 'sonner';
import { formatCurrency } from '../../../utils/pos';

interface RightSidebarProps {
  className?: string;
}

type ProductListSelection =
  | { type: 'trending' }
  | { type: 'all' }
  | { type: 'category'; id: string }
  | null;

const RightSidebar: React.FC<RightSidebarProps> = ({ className }) => {
  const {
    categories = [],
    activeCategory = 'All',
    setActiveCategory,
    filteredProducts = [],
    products = [],
    orders = [],
    orderItems = [],
    currentUser,
    cart = [],
    finalTotal = 0,
    paymentAmounts = {},
    setPaymentAmounts,
    setPaymentError,
    paidTotal = 0,
    changeReturn = 0,
    isSplitPayment,
    setShowPaymentModal,
    isProcessing,
    taxError,
    posLayoutSettings
  } = usePOS();
  const [productListSelection, setProductListSelection] = useState<ProductListSelection>(() => (
    posLayoutSettings?.defaultProductMode === 'closed'
      ? null
      : posLayoutSettings?.defaultProductMode === 'all'
        ? { type: 'all' }
        : { type: 'trending' }
  ));
  const [selectedTender, setSelectedTender] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const showTrending = productListSelection?.type === 'trending';
  useEffect(() => {
    setProductListSelection(
      posLayoutSettings?.defaultProductMode === 'closed'
        ? null
        : posLayoutSettings?.defaultProductMode === 'all'
          ? { type: 'all' }
          : { type: 'trending' }
    );
    if (posLayoutSettings?.defaultProductMode === 'all') setActiveCategory('All');
  }, [posLayoutSettings?.defaultProductMode, setActiveCategory]);
  const categoryOptions = useMemo(() => (
    (Array.isArray(categories) ? categories : [])
      .map((category: any) => ({
        id: category?.id,
        label: category?.name || category?.category_name || category?.catname || ''
      }))
      .filter((category) => category.id != null && category.label)
  ), [categories]);
  const { trendingProducts, hasTrendingData } = useMemo(() => {
    const scopedOrders = filterRowsToCurrentStore(orders, currentUser);
    const scopedOrderItems = filterRowsToCurrentStore(orderItems, currentUser);
    const ranked = buildTopSellingProducts(scopedOrderItems, products, scopedOrders);
    const visibleProducts = new Map(
      filteredProducts.map((product: any) => [String(product.id), product])
    );
    return {
      hasTrendingData: ranked.length > 0,
      trendingProducts: ranked
        .map((product) => visibleProducts.get(String(product.id)))
        .filter(Boolean)
    };
  }, [currentUser, filteredProducts, orderItems, orders, products]);
  const showProductList = productListSelection !== null;
  const shownProducts = showTrending
    ? trendingProducts
    : productListSelection?.type === 'category' || productListSelection?.type === 'all'
      ? filteredProducts
      : [];
  const tenderMethods = [
    { id: 'Cash' as const, label: 'Cash', icon: Banknote },
    { id: 'UPI' as const, label: 'UPI', icon: Smartphone },
    { id: 'Card' as const, label: 'Card', icon: CreditCard }
  ];
  const updateTenderAmount = (value: string) => {
    setPaymentAmounts((current: Record<string, number | string>) => ({
      ...current,
      [selectedTender]: value
    }));
    setPaymentError('');
  };
  const addQuickTenderAmount = (amount: number) => {
    const currentAmount = Number(paymentAmounts[selectedTender] || 0);
    updateTenderAmount(String(Math.round((currentAmount + amount) * 100) / 100));
  };
  const chooseTender = (method: 'Cash' | 'UPI' | 'Card') => {
    setSelectedTender(method);
    if (!isSplitPayment) {
      setPaymentAmounts({
        Cash: method === 'Cash' ? finalTotal : 0,
        UPI: method === 'UPI' ? finalTotal : 0,
        Card: method === 'Card' ? finalTotal : 0
      });
      setPaymentError('');
    }
  };
  const openPayment = () => {
    if (cart.length === 0) {
      toast.error('Add an item before opening payment.');
      return;
    }
    if (Number(paymentAmounts.Cash || 0) + Number(paymentAmounts.UPI || 0) + Number(paymentAmounts.Card || 0) <= 0) {
      chooseTender(selectedTender);
    }
    setShowPaymentModal(true);
  };

  return (
    <aside className={cn(
      'flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-l border-slate-200 bg-white shadow-sm',
      className
    )}>
      <div className="shrink-0 space-y-2 border-b border-slate-200 bg-slate-50 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <BarcodeInput placeholder="Scan barcode and press Enter" />
          <ProductSearch />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            aria-pressed={showTrending}
            onClick={() => {
              setActiveCategory('All');
              setProductListSelection({ type: 'trending' });
            }}
            className={cn(
              'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              showTrending
                ? 'border-orange-600 bg-orange-500 text-white'
                : 'border-orange-200 bg-white text-orange-700 hover:bg-orange-50'
            )}
          >
            <Flame size={15} /> Trending Items
          </button>
          <button
            type="button"
            aria-pressed={productListSelection?.type === 'all'}
            onClick={() => {
              setActiveCategory('All');
              setProductListSelection({ type: 'all' });
            }}
            className={cn(
              'min-h-10 shrink-0 rounded-lg border px-3 text-xs font-bold',
              productListSelection?.type === 'all'
                ? 'border-blue-700 bg-blue-700 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            )}
          >
            All Items
          </button>
          {categoryOptions.map((category) => (
            <button
              type="button"
              key={String(category.id)}
              aria-pressed={productListSelection?.type === 'category'
                && productListSelection.id === String(category.id)
                && String(activeCategory) === String(category.id)}
              onClick={() => {
                setActiveCategory(category.id);
                setProductListSelection({ type: 'category', id: String(category.id) });
              }}
              className={cn(
                'min-h-10 shrink-0 rounded-lg border px-3 text-xs font-bold',
                productListSelection?.type === 'category'
                  && productListSelection.id === String(category.id)
                  && String(activeCategory) === String(category.id)
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              )}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
      {showProductList ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
              {showTrending ? 'Trending Items' : 'Products'}
            </h2>
            <span className="text-[10px] font-medium text-slate-500">
              {showTrending ? 'Ranked by loaded paid sales' : `${shownProducts.length} available`}
            </span>
          </div>
          {showTrending && (!hasTrendingData || trendingProducts.length === 0) ? (
            <p role="status" className="m-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-medium text-amber-800">
              Trending data unavailable. No matching paid sales are available to rank.
            </p>
          ) : (
            <ProductGrid productsOverride={shownProducts} showPrices />
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
          <p role="status" className="max-w-xs text-xs font-medium leading-relaxed text-slate-500">
            Select Trending Items, All Items, or a category to display products.
          </p>
        </div>
      )}

      <section className="shrink-0 border-t border-slate-200 bg-white p-2.5 shadow-[0_-2px_8px_rgba(15,23,42,0.06)]">
        {posLayoutSettings?.paymentPlacement === 'on-demand' ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-blue-900">Payment</p>
              <p className="truncate text-[10px] text-slate-500">Opens the existing payment dialog when requested.</p>
            </div>
            <button
              type="button"
              disabled={cart.length === 0 || isProcessing || Boolean(taxError)}
              onClick={openPayment}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-xs font-black uppercase text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <CreditCard size={15} /> Open Payment
            </button>
          </div>
        ) : <>
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-blue-900">
          <CreditCard size={13} /> Payment Mode
          {isSplitPayment && <span className="ml-auto text-[9px] font-bold text-blue-600">Split tender</span>}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {tenderMethods.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              aria-pressed={selectedTender === id}
              onClick={() => chooseTender(id)}
              className={cn(
                'inline-flex min-h-9 items-center justify-center gap-1 rounded-md border px-2 text-[10px] font-black uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                selectedTender === id
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-blue-50'
              )}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        {(posLayoutSettings?.showAmountReceived !== false || posLayoutSettings?.showChangeDue !== false) && <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] gap-2">
          {posLayoutSettings?.showAmountReceived !== false &&
          <label className="min-w-0 text-[10px] font-semibold text-slate-600">
            Amount Received · {selectedTender}
            <span className="mt-0.5 flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100">
              <span className="mr-1 text-slate-500">₹</span>
              <input
                aria-label={`Amount received by ${selectedTender}`}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={paymentAmounts[selectedTender] ?? ''}
                onChange={(event) => updateTenderAmount(event.target.value)}
                className="w-full min-w-0 bg-transparent text-right text-sm font-black tabular-nums text-slate-900 outline-none"
              />
            </span>
          </label>
          }
          {posLayoutSettings?.showChangeDue !== false &&
          <div className="min-w-0 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1">
            <p className="text-[10px] font-semibold text-emerald-800">Change Due</p>
            <p className="mt-1 truncate text-lg font-black leading-none tabular-nums text-emerald-700">
              {formatCurrency(changeReturn)}
            </p>
          </div>
          }
        </div>}
        <div className="mt-1 flex items-center justify-between text-[9px] font-semibold text-slate-500">
          <span>Received total: {formatCurrency(paidTotal)}</span>
          <span>Bill: {formatCurrency(finalTotal)}</span>
        </div>
        {posLayoutSettings?.showQuickAmounts !== false && posLayoutSettings?.showAmountReceived !== false && <div className="mt-1.5 flex items-center gap-1 overflow-x-auto pb-0.5">
          <span className="shrink-0 text-[9px] font-black uppercase text-slate-500">Quick Amt</span>
          {[0.5, 1, 5, 10, 20, 50, 100].map((amount) => (
            <button
              type="button"
              key={amount}
              onClick={() => addQuickTenderAmount(amount)}
              className="min-h-7 min-w-8 shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 text-[9px] font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
              aria-label={`Add ₹${amount} to ${selectedTender} amount`}
            >
              {amount < 1 ? amount.toFixed(2) : amount}
            </button>
          ))}
        </div>}
        {taxError && (
          <p role="alert" className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-800">
            {taxError === 'POS_GST_CONFIGURATION_REQUIRED'
              ? 'Store GST-inclusive configuration is unavailable.'
              : 'A valid GST rate is required for each item.'}
          </p>
        )}
        <button
          type="button"
          disabled={cart.length === 0 || isProcessing || Boolean(taxError)}
          onClick={openPayment}
          className="mt-1.5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-black uppercase text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <CreditCard size={16} /> Complete Bill / Payment
        </button>
        </>}
      </section>
    </aside>
  );
};

export default RightSidebar;
