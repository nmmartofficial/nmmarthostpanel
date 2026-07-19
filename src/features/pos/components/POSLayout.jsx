import React, { Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, Camera, MousePointer, Touchpad } from 'lucide-react';
import { cn } from '../../../utils/helpers';
import { usePOS } from '../../../context';
import {
  ProductGrid, ProductSearch, BarcodeInput, CartPanel, CustomerPanel,
  HoldQueueDialog, PaymentDialog, ReceiptDialog, ManagerOverrideDialog,
  DiscountDialog, VoidDialog, ShiftDashboard, AuditTimeline, HardwareDashboard,
  NumericKeypad
} from '../../../components';

function SidebarButton({ active, isTouchMode, onClick, children, className }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded font-black uppercase shadow-sm transition-all',
        active ? 'bg-primary-600 text-white shadow-primary-600/20' : 'bg-white text-neutral-700 hover:bg-neutral-50',
        isTouchMode ? 'py-4 text-xs' : 'py-2.5 text-[11px]',
        className
      )}
    >
      {children}
    </button>
  );
}

function ModeToggleButton({ active, onClick, Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[9px] font-black uppercase transition-all',
        active ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'
      )}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

export default function POSLayout() {
  const {
    isTouchMode, setIsTouchMode, appConfig, activeCategory, setActiveCategory,
    categories, posFilter, setPosFilter, setShowScanner
  } = usePOS();

  const sidebarWidthClass = isTouchMode ? 'w-64' : 'w-48';
  const billingWidthClass = isTouchMode ? 'w-[480px]' : 'w-[420px]';

  return (
    <div className={cn(
      'flex h-[calc(100vh-60px)] bg-neutral-100 overflow-hidden -m-4 transition-all duration-300 portrait:flex-col landscape:flex-row',
      isTouchMode ? 'text-lg' : 'text-base'
    )}>
      <aside className={cn(
        'bg-white flex flex-col border-r border-neutral-200 transition-all duration-300 portrait:w-full portrait:h-48 portrait:border-r-0 portrait:border-b',
        sidebarWidthClass
      )}>
        <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
          <div className={cn(
            'bg-primary-900 text-white p-2 rounded font-black mb-2 uppercase text-center truncate shadow-sm',
            isTouchMode ? 'text-xs py-3' : 'text-[10px]'
          )}>
            {appConfig?.shop_name || 'NM MART'}
          </div>

          <div className="space-y-1">
            <SidebarButton
              active={activeCategory === 'All'}
              isTouchMode={isTouchMode}
              onClick={() => setActiveCategory('All')}
              className="px-3 text-left"
            >
              All Items
            </SidebarButton>

            {(categories || []).map((cat, idx) => (
              <SidebarButton
                key={`cat-${cat.id}-${idx}`}
                active={activeCategory === cat.id}
                isTouchMode={isTouchMode}
                onClick={() => setActiveCategory(cat.id)}
                className="px-3 text-left"
              >
                {cat.name}
              </SidebarButton>
            ))}
          </div>
        </div>

        <div className="p-2 border-t border-neutral-100 bg-slate-50 space-y-1">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">Terminal Mode</p>
          <div className="flex bg-white rounded-lg p-1 shadow-inner border border-slate-200">
            <ModeToggleButton active={!isTouchMode} onClick={() => setIsTouchMode(false)} Icon={MousePointer} label="Desktop" />
            <ModeToggleButton active={isTouchMode} onClick={() => setIsTouchMode(true)} Icon={Touchpad} label="Touch" />
          </div>
        </div>

        <div className="p-2 space-y-2 border-t border-neutral-200 bg-neutral-50">
          <button
            onClick={() => { setPosFilter(posFilter === 'TopSale' ? 'All' : 'TopSale'); setActiveCategory('All'); }}
            className={cn(
              'w-full rounded font-black uppercase flex items-center justify-center gap-2 shadow-md transition-all border',
              posFilter === 'TopSale' ? 'bg-primary-600 text-white border-primary-700' : 'bg-white text-neutral-700 border-neutral-200',
              isTouchMode ? 'p-4 text-xs' : 'p-2 text-[10px]'
            )}
          >
            <Zap size={isTouchMode ? 16 : 14} /> Top Sale
          </button>

          <button
            onClick={() => { setPosFilter(posFilter === 'Favourite' ? 'All' : 'Favourite'); setActiveCategory('All'); }}
            className={cn(
              'w-full rounded font-black uppercase flex items-center justify-center gap-2 shadow-md transition-all border',
              posFilter === 'Favourite' ? 'bg-primary-600 text-white border-primary-700' : 'bg-white text-neutral-700 border-neutral-200',
              isTouchMode ? 'p-4 text-xs' : 'p-2 text-[10px]'
            )}
          >
            <CheckCircle2 size={isTouchMode ? 16 : 14} /> Favourite
          </button>
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0">
        <div className={cn('p-2 flex gap-2 bg-neutral-100 relative border-b border-neutral-200 shadow-sm', isTouchMode ? 'py-4' : '')}>
          <ProductSearch />
          <BarcodeInput />
          <button
            onClick={() => setShowScanner(true)}
            className={cn('bg-success-600 text-white rounded font-black shadow-md whitespace-nowrap flex items-center justify-center', isTouchMode ? 'px-6' : 'px-3 py-1.5 text-xs')}
          >
            <Camera size={isTouchMode ? 18 : 14} />
          </button>
        </div>
        <ProductGrid />
      </section>

      <aside className={cn('bg-white flex flex-col border-l border-neutral-200 shadow-2xl overflow-hidden transition-all duration-300', billingWidthClass)}>
        <CustomerPanel />
        <CartPanel />
      </aside>

      <Suspense fallback={<div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[5000] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>}>
        <HoldQueueDialog />
        <VoidDialog />
        <ManagerOverrideDialog />
        <HardwareDashboard />
        <AuditTimeline />
        <DiscountDialog />
        <ShiftDashboard />
        <ReceiptDialog />
        <PaymentDialog />
      </Suspense>

      <AnimatePresence>
        <NumericKeypad />
      </AnimatePresence>
    </div>
  );
}
