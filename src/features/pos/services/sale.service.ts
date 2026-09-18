import { DB_SCHEMA } from '../../dbSchema';
import { dbSync } from '../../dbSync';
import { ACTION_TYPES, ERP_MODULES, handleERPAction } from '../../erpController';

type SaleInput = {
  id?: string | number;
  items?: Array<{ id?: string | number; quantity?: number; price?: number; product?: { id?: string | number; name?: string; price?: number } }>;
  total?: number;
  customer?: { id?: string | number; name?: string } | null;
  payment?: { amount?: number; method?: string } | null;
};

export const SaleService = {
  createSale: async (input: SaleInput = {}) => {
    const items = Array.isArray(input.items) ? input.items : [];
    if (items.length === 0) return { success: false, error: { code: 'EMPTY_SALE', message: 'Sale requires at least one item' } };

    const subtotal = items.reduce((sum, item) => sum + (Number(item.price ?? item.product?.price ?? 0) * Number(item.quantity ?? 0)), 0);
    const total = Number(input.total ?? subtotal);
    const paymentAmount = Number(input.payment?.amount ?? total);
    if (!Number.isFinite(total) || total < 0 || paymentAmount < total) {
      return { success: false, error: { code: 'INVALID_SALE_TOTAL', message: 'Sale total or payment amount is invalid' } };
    }

    const payload = {
      order_header: {
        order_type: 'pos_counter',
        user_id: (input.customer as any)?.userId ?? null,
        customer_name: (input.customer as any)?.name || 'Walk-in Customer',
        subtotal,
        discount: 0,
        delivery_charge: 0,
        total_amount: total,
        payment_method: String(input.payment?.method || 'CASH').toLowerCase(),
        payment_status: 'paid',
        order_status: 'delivered',
      },
      items: items.map((item) => ({
        product_id: item.id ?? item.product?.id,
        product_name: item.product?.name || '',
        quantity: Number(item.quantity),
        rate: Number(item.price ?? item.product?.price ?? 0),
        total: Number(item.price ?? item.product?.price ?? 0) * Number(item.quantity),
      })),
      payment: {
        amount: paymentAmount,
        method: String(input.payment?.method || 'CASH').toLowerCase(),
        reference_no: null,
      },
    };

    const result = await handleERPAction(ERP_MODULES.ORDER_MASTER, ACTION_TYPES.ATOMIC_ORDER, payload);
    if (!result.success || !result.data) {
      return { success: false, error: { code: result.code || 'SALE_WRITE_FAILED', message: result.error || 'Atomic sale failed', details: result.details || null } };
    }

    const order = await dbSync.fetch(DB_SCHEMA.ORDERS.table, { eq: { column: 'id', value: result.data } });
    if (!order[0]) return { success: false, error: { code: 'SALE_READ_FAILED', message: 'Sale committed but order receipt could not be read' } };
    return { success: true, saleId: order[0].id, order: order[0], status: order[0].order_status };
  },
  getSaleById: async (id: string | number) => {
    if (!id) return null;
    const orders = await dbSync.fetch(DB_SCHEMA.ORDERS.table, { eq: { column: 'id', value: id } });
    return orders[0] || null;
  }
};
