/**
 * Order Module Context
 * Phase 7 - Step 1
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialOrderState } from '../store/order.state';
import { ORDER_STATUS } from '../constants/order.constants';
import { OrderService } from '../services/order.service';

const OrderContext = createContext(null);

export const OrderProvider = ({ children }) => {
  const [orderState, setOrderState] = useState(initialOrderState);

  const actions = useMemo(() => ({
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
      const result = OrderService.addOrder(orderState.orders, newOrder);
      if (result.success) {
        setOrderState(prev => ({ ...prev, orders: [...prev.orders, newOrder] }));
      }
      return result;
    },
    removeOrder: (orderId) => {
      const result = OrderService.removeOrder(orderState.orders, orderId);
      if (result.success) {
        setOrderState(prev => ({ ...prev, orders: prev.orders.filter(o => o.orderId !== orderId) }));
      }
      return result;
    },
    updateOrder: (updatedOrder) => {
      const result = OrderService.updateOrder(orderState.orders, updatedOrder);
      if (result.success) {
        setOrderState(prev => ({
          ...prev,
          orders: prev.orders.map(o => o.orderId === updatedOrder.orderId ? updatedOrder : o),
        }));
      }
      return result;
    },
    findOrder: (orderId) => {
      return OrderService.findOrder(orderState.orders, orderId);
    },
    getOrders: () => {
      return OrderService.getOrders(orderState.orders);
    },
    clearOrders: () => {
      const result = OrderService.clearOrders();
      if (result.success) {
        setOrderState(prev => ({ ...prev, orders: [] }));
      }
      return result;
    },
    saveOrder: () => {
      return OrderService.saveOrder(orderState.selectedOrder);
    },
  }), [orderState.orders, orderState.selectedOrder]);

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
