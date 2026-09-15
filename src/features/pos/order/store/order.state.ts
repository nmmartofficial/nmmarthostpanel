/**
 * Order Module Initial State
 * Phase 7 - Step 1
 */

import { OrderState } from '../types/order.types';
import { ORDER_STATUS } from '../constants/order.constants';

export const initialOrderState: OrderState = {
  orders: [],
  selectedOrder: null,
  loading: false,
  error: '',
  orderStatus: ORDER_STATUS.IDLE,
  searchQuery: '',
  createdAt: null,
  updatedAt: null,
};
