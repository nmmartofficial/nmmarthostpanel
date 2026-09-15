/**
 * Order Module Service
 * Phase 7 - Step 1
 */

import { generateOrderNumber as generateOrderNumberUtil, createOrder as createOrderUtil, freezeOrder as freezeOrderUtil, updateOrderStatus as updateOrderStatusUtil, markOrderCompleted as markOrderCompletedUtil, markOrderCancelled as markOrderCancelledUtil, markOrderPending as markOrderPendingUtil, freezeUpdatedOrder as freezeUpdatedOrderUtil } from '../utils/order.utils';
import type { OrderNumberResult, OrderCreationInput, OrderCreationResult, Order, OrderStatus, OrderStatusResult, OrderRepositoryResult } from '../types/order.types';
import { ORDER_STATUS } from '../constants/order.constants';
import { RepositoryService } from '../../repository';

export const OrderService = {
  startOrder: () => {
    throw new Error('Not Implemented');
  },
  completeOrder: () => {
    throw new Error('Not Implemented');
  },
  cancelOrder: () => {
    throw new Error('Not Implemented');
  },
  resetOrder: () => {
    throw new Error('Not Implemented');
  },
  createSnapshot: (data?: any) => {
    throw new Error('Not Implemented');
  },
  clearSnapshot: () => {
    throw new Error('Not Implemented');
  },
  validate: (snapshot: any) => {
    throw new Error('Not Implemented');
  },
  generateOrderNumber: (): OrderNumberResult => {
    return generateOrderNumberUtil();
  },
  createOrder: (input: OrderCreationInput): OrderCreationResult => {
    try {
      const orderNumberResult = generateOrderNumberUtil();
      const createdOrder = createOrderUtil({ ...input, orderNumber: orderNumberResult.orderNumber });
      const frozenOrder = freezeOrderUtil(createdOrder);
      return {
        success: true,
        order: frozenOrder,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        order: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
  updateStatus: (order: Order, newStatus: OrderStatus): OrderStatusResult => {
    try {
      const previousStatus = order.status;
      const updatedOrder = updateOrderStatusUtil(order, newStatus);
      const frozenOrder = freezeUpdatedOrderUtil(updatedOrder);
      return {
        success: true,
        order: frozenOrder,
        previousStatus,
        currentStatus: newStatus,
        updatedAt: frozenOrder.updatedAt,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        order: null,
        previousStatus: order?.status || null,
        currentStatus: null,
        updatedAt: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
  markCompleted: (order: Order): OrderStatusResult => {
    try {
      const previousStatus = order.status;
      const updatedOrder = markOrderCompletedUtil(order);
      const frozenOrder = freezeUpdatedOrderUtil(updatedOrder);
      return {
        success: true,
        order: frozenOrder,
        previousStatus,
        currentStatus: ORDER_STATUS.COMPLETED,
        updatedAt: frozenOrder.updatedAt,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        order: null,
        previousStatus: order?.status || null,
        currentStatus: null,
        updatedAt: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
  markCancelled: (order: Order): OrderStatusResult => {
    try {
      const previousStatus = order.status;
      const updatedOrder = markOrderCancelledUtil(order);
      const frozenOrder = freezeUpdatedOrderUtil(updatedOrder);
      return {
        success: true,
        order: frozenOrder,
        previousStatus,
        currentStatus: ORDER_STATUS.CANCELLED,
        updatedAt: frozenOrder.updatedAt,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        order: null,
        previousStatus: order?.status || null,
        currentStatus: null,
        updatedAt: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
  markPending: (order: Order): OrderStatusResult => {
    try {
      const previousStatus = order.status;
      const updatedOrder = markOrderPendingUtil(order);
      const frozenOrder = freezeUpdatedOrderUtil(updatedOrder);
      return {
        success: true,
        order: frozenOrder,
        previousStatus,
        currentStatus: ORDER_STATUS.PENDING,
        updatedAt: frozenOrder.updatedAt,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        order: null,
        previousStatus: order?.status || null,
        currentStatus: null,
        updatedAt: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
  addOrder: (existingOrders: Order[], newOrder: Order): OrderRepositoryResult => {
    try {
      const updatedOrders = [...existingOrders, newOrder];
      return {
        success: true,
        orderId: newOrder.orderId,
        repositoryStatus: 'SUCCESS',
        savedAt: new Date(),
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        orderId: null,
        repositoryStatus: 'ERROR',
        savedAt: new Date(),
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
  removeOrder: (existingOrders: Order[], orderId: string): OrderRepositoryResult => {
    try {
      const updatedOrders = existingOrders.filter(order => order.orderId !== orderId);
      return {
        success: true,
        orderId: orderId,
        repositoryStatus: 'SUCCESS',
        savedAt: new Date(),
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        orderId: null,
        repositoryStatus: 'ERROR',
        savedAt: new Date(),
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
  updateOrder: (existingOrders: Order[], updatedOrder: Order): OrderRepositoryResult => {
    try {
      const updatedOrders = existingOrders.map(order => 
        order.orderId === updatedOrder.orderId ? updatedOrder : order
      );
      return {
        success: true,
        orderId: updatedOrder.orderId,
        repositoryStatus: 'SUCCESS',
        savedAt: new Date(),
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        orderId: null,
        repositoryStatus: 'ERROR',
        savedAt: new Date(),
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
  findOrder: (existingOrders: Order[], orderId: string): OrderRepositoryResult => {
    try {
      const foundOrder = existingOrders.find(order => order.orderId === orderId) || null;
      return {
        success: !!foundOrder,
        orderId: orderId,
        repositoryStatus: foundOrder ? 'SUCCESS' : 'NOT_FOUND',
        savedAt: new Date(),
        error: foundOrder ? null : 'Order not found',
      };
    } catch (err) {
      return {
        success: false,
        orderId: null,
        repositoryStatus: 'ERROR',
        savedAt: new Date(),
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
  getOrders: (existingOrders: Order[]): OrderRepositoryResult => {
    try {
      return {
        success: true,
        orderId: null,
        repositoryStatus: 'SUCCESS',
        savedAt: new Date(),
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        orderId: null,
        repositoryStatus: 'ERROR',
        savedAt: new Date(),
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
  clearOrders: (): OrderRepositoryResult => {
    try {
      return {
        success: true,
        orderId: null,
        repositoryStatus: 'SUCCESS',
        savedAt: new Date(),
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        orderId: null,
        repositoryStatus: 'ERROR',
        savedAt: new Date(),
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
  saveOrder: (order: Order | null): OrderRepositoryResult => {
    if (!order) {
      return {
        success: false,
        orderId: null,
        repositoryStatus: 'ERROR',
        savedAt: new Date(),
        error: 'No order provided',
      };
    }

    const adapter = RepositoryService.createStorageAdapter('IN_MEMORY');
    const entity = {
      ...order,
      id: order.orderId,
    };
    const result = adapter.save('order', entity);

    return {
      success: result.success,
      orderId: order.orderId,
      repositoryStatus: result.success ? 'SUCCESS' : 'ERROR',
      savedAt: result.timestamp,
      error: result.error,
    };
  },
};
