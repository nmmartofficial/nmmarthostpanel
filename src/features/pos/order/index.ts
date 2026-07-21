/**
 * Order Module Barrel Exports
 * Phase 7 - Step 1
 */

export { OrderProvider, useOrderContext } from './context/OrderContext';
export { useOrder } from './hooks/useOrder';
export { ORDER_STATUS } from './constants/order.constants';
export type { OrderStatus, OrderSummary, OrderResult, OrderState, OrderActions, OrderSnapshot, OrderValidationError, OrderValidationResult } from './types/order.types';
export { initialOrderState } from './store/order.state';
export { orderActions } from './store/order.actions';
export { orderSelectors } from './store/order.selectors';
export { OrderService } from './services/order.service';
export { generateOrderSnapshotId, createOrderSnapshot, cloneOrderSnapshot, freezeOrderSnapshot, validateCartReference, validateCustomerReference, validatePaymentReference, validateSnapshot, validateOrder } from './utils/order.utils';
