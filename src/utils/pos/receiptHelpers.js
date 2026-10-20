/**
 * Receipt Generation Utilities
 */
import { DB_SCHEMA } from '../../dbSchema.js';

/**
 * Formats receipt headers
 */
export const formatReceiptHeader = (shopName) => {
  return shopName.toUpperCase();
};

/**
 * Calculates item row totals for receipt
 */
export const calcRowTotal = (rate, qty) => {
  return (parseFloat(rate) || 0) * (parseFloat(qty) || 0);
};

/**
 * Generates print timestamp
 */
export const getPrintTimestamp = () => {
  const now = new Date();
  return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
};

export const createPersistedPOSInvoice = (order, items) => {
  if (!order || order.id == null || !order.order_number || !order.created_at) {
    throw new Error('Persisted order invoice fields are incomplete');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Persisted order items are unavailable');
  }
  if (!Number.isFinite(Number(order.total_amount))) {
    throw new Error('Persisted order total is unavailable');
  }

  const invoiceItems = items.map((item) => {
    const quantity = Number(item.quantity ?? item.qty);
    const rate = Number(item.rate ?? item.price);
    const total = Number(item.total);
    const gstPercent = Number(item.gst_percent);
    const gstAmount = Number(item.gst_amount);
    if (item.id == null || !Number.isFinite(quantity) || quantity <= 0
      || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(total) || total < 0
      || !Number.isFinite(gstPercent) || gstPercent < 0 || !Number.isFinite(gstAmount) || gstAmount < 0) {
      throw new Error('Persisted order item values are incomplete');
    }
    return {
      ...item,
      name: item.product_name || item.product_name_snapshot || '',
      quantity,
      rate,
      total,
      gst_percent: gstPercent,
      gst_amount: gstAmount
    };
  });

  const toCents = (value) => Math.round(Number(value) * 100);
  const lineTotalCents = invoiceItems.reduce((sum, item) => sum + toCents(item.total), 0);
  const lineDiscountCents = invoiceItems.reduce((sum, item) => sum + toCents(item.discount_amount ?? 0), 0);
  const lineTaxCents = invoiceItems.reduce((sum, item) => sum + toCents(item.gst_amount), 0);
  const expectedTotalCents = lineTotalCents
    + toCents(order.delivery_charge ?? 0)
    + toCents(order.round_off ?? 0);
  if (expectedTotalCents !== toCents(order.total_amount)) {
    throw new Error('Persisted order and line totals do not reconcile');
  }
  if (lineDiscountCents !== toCents(order.discount ?? 0)) {
    throw new Error('Persisted order and item discounts do not reconcile');
  }
  if (order.total_gst == null || lineTaxCents !== toCents(order.total_gst)) {
    throw new Error('Persisted order and item GST totals do not reconcile');
  }

  return { ...order, items: invoiceItems };
};

export const fetchPersistedPOSInvoice = async (
  supabaseClient,
  { orderId, tenantId, companyCode }
) => {
  if (!Number.isSafeInteger(Number(orderId)) || Number(orderId) <= 0
    || tenantId == null || !companyCode) {
    throw new Error('Invoice store scope is unavailable');
  }

  const orderResult = await supabaseClient
    .from(DB_SCHEMA.ORDERS.table)
    .select('*')
    .eq('id', Number(orderId))
    .eq('tenant_id', tenantId)
    .eq('company_code', companyCode)
    .single();
  if (orderResult.error) throw orderResult.error;
  if (!orderResult.data) throw new Error('Persisted order could not be retrieved');

  const itemResult = await supabaseClient
    .from(DB_SCHEMA.ORDER_ITEMS.table)
    .select('*')
    .eq('order_id', Number(orderId))
    .eq('tenant_id', tenantId)
    .eq('company_code', companyCode);
  if (itemResult.error) throw itemResult.error;

  return createPersistedPOSInvoice(orderResult.data, itemResult.data);
};
