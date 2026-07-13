import { lazy } from 'react';

// Core UI Components
export { default as ProductGrid } from './ProductGrid';
export { default as ProductSearch } from './ProductSearch';
export { default as BarcodeInput } from './BarcodeInput';
export { default as CartPanel } from './CartPanel';
export { default as CustomerPanel } from './CustomerPanel';
export { default as ProductCard } from './ProductCard';
export { default as CartItem } from './CartItem';
export { default as ThermalReceipt } from './ThermalReceipt';
export { default as NumericKeypad } from './NumericKeypad';
export { default as POSErrorBoundary } from './POSErrorBoundary';

// Lazy-loaded Dialogs & Dashboards
export const HoldQueueDialog = lazy(() => import('./HoldQueueDialog'));
export const PaymentDialog = lazy(() => import('./PaymentDialog'));
export const ReceiptDialog = lazy(() => import('./ReceiptDialog'));
export const ManagerOverrideDialog = lazy(() => import('./ManagerOverrideDialog'));
export const DiscountDialog = lazy(() => import('./DiscountDialog'));
export const VoidDialog = lazy(() => import('./VoidDialog'));
export const ShiftDashboard = lazy(() => import('./ShiftDashboard'));
export const AuditTimeline = lazy(() => import('./AuditTimeline'));
export const HardwareDashboard = lazy(() => import('./HardwareDashboard'));
