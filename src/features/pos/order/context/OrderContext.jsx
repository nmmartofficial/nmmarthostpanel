/**
 * Order Module Context
 * Phase 7 - Step 1
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialOrderState } from '../store/order.state';
import type { OrderState, OrderActions } from '../types/order.types';
import { ORDER_STATUS } from '../constants/order.constants';
import { OrderService } from '../services/order.service';

const OrderContext = createContext<{
  orderState: OrderState;
  actions: OrderActions;
} | null>(null);

export const OrderProvider = ({ children }) => {
  const [orderState, setOrderState] = useState<OrderState>(initialOrderState);

  const actions: OrderActions = useMemo(() => ({
    setOrders: (orders) => setOrderState(prev => ({ ...prev, orders })),
    setSelectedOrder: (order) => setOrderState(prev => ({ ...prev, selectedOrder: order })),
    setOrderStatus: (status) => setOrderState(prev => ({ ...prev, orderStatus: status })),
    setSearchQuery: (query) => setOrderState(prev => ({ ...prev, searchQuery: query })),
    setLoading: (loading) => setOrderState(prev => ({ ...prev, loading })),
    setError: (error) => setOrderState(prev => ({ ...prev, error })),
    resetOrder: () => setOrderState(initialOrderState),
    generateOrderNumber: () => OrderService.generateOrderNumber(),
    createOrder: (input) => OrderService.createOrder(input),
    updateOrderStatus: (order, newStatus) => OrderService.updateStatus(order, newStatus),
    markCompleted: (order) => OrderService.markCompleted(order),
    markCancelled: (order) => OrderService.markCancelled(order),
    markPending: (order) => OrderService.markPending(order),
    addOrder: (newOrder) => {
      let result;
      setOrderState(prev => {
        result = OrderService.addOrder(prev.orders, newOrder);
        return { ...prev, orders: result.orders };
      });
      return result!;
    },
    removeOrder: (orderId) => {
      let result;
      setOrderState(prev => {
        result = OrderService.removeOrder(prev.orders, orderId);
        return { ...prev, orders: result.orders };
      });
      return result!;
    },
    updateOrder: (updatedOrder) => {
      let result;
      setOrderState(prev => {
        result = OrderService.updateOrder(prev.orders, updatedOrder);
        return { ...prev, orders: result.orders };
      });
      return result!;
    },
    findOrder: (orderId) => {
      // findOrder doesn't change state, just uses current orders
      return OrderService.findOrder(orderState.orders, orderId);
    },
    getOrders: () => {
      // getOrders just returns current orders, no state change
      return OrderService.getOrders(orderState.orders);
    },
    clearOrders: () => {
      const result = OrderService.clearOrders();
      setOrderState(prev => ({ ...prev, orders: result.orders }));
      return result;
    },
  }), [orderState.orders]);

  const value = useMemo(() => ({
    orderState,
    actions,
  }), [orderState, actions]);

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrderContext must be used within a OrderProvider');
  }
  return context;
};

export default OrderContext;
