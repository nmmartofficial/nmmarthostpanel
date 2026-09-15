/**
 * Order Module Types
 * Phase 7 - Step 1
 */

import { ORDER_STATUS } from '../constants/order.constants';

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export interface OrderSummary {
  // Placeholder
}

export interface OrderResult {
  // Placeholder
}

export interface OrderSnapshot {
  orderSnapshotId: string;
  checkoutSnapshotId: string | null;
  cartId: string | number | null;
  customerId: string | number | null;
  paymentId: string | number | null;
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  payableAmount: number;
  createdAt: Date;
  status: OrderStatus;
}

export interface Order {
  orderId: string;
  orderNumber: string;
  cartId: string | number | null;
  customerId: string | number | null;
  paymentId: string | number | null;
  checkoutSnapshotId: string | null;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderCreationInput {
  cartId: string | number | null;
  customerId: string | number | null;
  paymentId: string | number | null;
  checkoutSnapshotId: string | null;
  status: OrderStatus;
}

export interface OrderCreationResult {
  success: boolean;
  order: Order | null;
  error: string | null;
}

export interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  loading: boolean;
  error: string;
  orderStatus: OrderStatus;
  searchQuery: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface OrderValidationError {
  field: string;
  message: string;
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: OrderValidationError[];
}

export interface OrderNumberResult {
  orderNumber: string;
  prefix: string;
  sequence: number;
  generatedAt: Date;
}

export interface OrderStatusResult {
  success: boolean;
  order: Order | null;
  previousStatus: OrderStatus | null;
  currentStatus: OrderStatus | null;
  updatedAt: Date | null;
  error: string | null;
}

export interface OrderRepositoryResult {
  success: boolean;
  orderId: string | null;
  repositoryStatus: string;
  savedAt: Date;
  error: string | null;
}

export interface OrderActions {
  setOrders: (orders: Order[]) => void;
  setSelectedOrder: (order: Order | null) => void;
  setOrderStatus: (status: OrderStatus) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  resetOrder: () => void;
  generateOrderNumber: () => OrderNumberResult;
  createOrder: (input: OrderCreationInput) => OrderCreationResult;
  updateOrderStatus: (order: Order, newStatus: OrderStatus) => OrderStatusResult;
  markCompleted: (order: Order) => OrderStatusResult;
  markCancelled: (order: Order) => OrderStatusResult;
  markPending: (order: Order) => OrderStatusResult;
  addOrder: (order: Order) => OrderRepositoryResult;
  removeOrder: (orderId: string) => OrderRepositoryResult;
  updateOrder: (order: Order) => OrderRepositoryResult;
  findOrder: (orderId: string) => OrderRepositoryResult;
  getOrders: () => OrderRepositoryResult;
  clearOrders: () => OrderRepositoryResult;
  saveOrder: () => OrderRepositoryResult;
}
