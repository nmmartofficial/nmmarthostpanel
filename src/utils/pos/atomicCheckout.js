import { getCartUnitPrice, roundTo, summarizePOSPaymentAmounts } from './calculations.js';

const PAYMENT_METHODS = new Set(['cash', 'upi', 'card', 'wallet', 'credit', 'mixed']);

export const normalizeCheckoutPaymentMethod = (method) => {
  const normalized = String(method || 'cash').trim().toLowerCase();
  return normalized === 'split' ? 'mixed' : normalized;
};

export const validateAtomicCheckoutInput = ({
  cart,
  totalAmount,
  paidAmount,
  paymentMethod,
  paymentAmounts
}) => {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error('Cart is empty');
  }

  const normalizedPaymentMethod = normalizeCheckoutPaymentMethod(paymentMethod);
  if (!PAYMENT_METHODS.has(normalizedPaymentMethod)) {
    throw new Error('INVALID_PAYMENT_METHOD');
  }

  if (!Number.isFinite(Number(totalAmount)) || Number(totalAmount) < 0) {
    throw new Error('INVALID_PAYMENT');
  }

  if (!Number.isFinite(Number(paidAmount)) || Number(paidAmount) < Number(totalAmount)) {
    throw new Error('INSUFFICIENT_PAYMENT');
  }
  if (paymentAmounts !== undefined) {
    const paymentSummary = summarizePOSPaymentAmounts(paymentAmounts, totalAmount);
    if (!paymentSummary.isValid) throw new Error(paymentSummary.error);
    if (paymentSummary.paymentMethod !== normalizedPaymentMethod) {
      throw new Error('PAYMENT_METHOD_MISMATCH');
    }
    if (paymentSummary.paidTotal !== roundTo(Number(paidAmount), 2)) {
      throw new Error('PAYMENT_AMOUNT_MISMATCH');
    }
  }

  cart.forEach((item) => {
    if (item?.id == null) throw new Error('INVALID_PRODUCT');
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
      throw new Error('INVALID_QUANTITY');
    }
    if (getCartUnitPrice(item) === null) {
      throw new Error('INVALID_PRICE');
    }
  });

  return normalizedPaymentMethod;
};

export const runPOSCheckoutOnce = async (inFlightRef, submit) => {
  if (inFlightRef.current) return false;
  inFlightRef.current = true;
  try {
    await submit();
    return true;
  } catch (error) {
    inFlightRef.current = false;
    throw error;
  }
};

export const buildAtomicCheckoutPayload = ({
  cart,
  selectedUser,
  customerInfo,
  subtotal,
  totalAmount,
  discount,
  deliveryCharge,
  deliveryChargePercent = 0,
  paymentMethod,
  paidAmount,
  paymentAmounts,
  totalGst = 0,
  roundOff = 0,
  referenceNo = null,
  transactionId = null, // For idempotency
  orderType = 'pos_counter',
  tenantId = null,
  companyCode = null,
  cashierAdminUserId = null,
  promotion = null,
  couponCode = '',
  manualDiscountType = null,
  manualDiscountValue = 0,
  pointsDiscount = 0,
  discountOverrideApprovalId = null,
  taxBreakdown = null
}) => {
  const normalizedPaymentMethod = validateAtomicCheckoutInput({
    cart,
    totalAmount,
    paidAmount,
    paymentMethod,
    paymentAmounts
  });

  return {
    transaction_id: transactionId || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    order_header: {
      order_type: orderType,
      user_id: selectedUser?.id ?? null,
      customer_name: selectedUser?.name || customerInfo?.name || 'Walk-in Customer',
      user_mobile: selectedUser?.mobile || selectedUser?.phone || selectedUser?.phone_number || customerInfo?.mob || '',
      delivery_address: selectedUser?.address || customerInfo?.add || '',
      subtotal: Number(subtotal) || 0,
      discount: Number(discount) || 0,
      delivery_charge: Number(deliveryCharge) || 0,
      delivery_charge_percent: Number(deliveryChargePercent) || 0,
      total_amount: Number(totalAmount) || 0,
      total_gst: Number(totalGst) || 0,
      round_off: Number(roundOff) || 0,
      tenant_id: tenantId,
      company_code: companyCode,
      cashier_admin_user_id: cashierAdminUserId,
      coupon_id: promotion?.kind === 'coupon' ? promotion.id : null,
      coupon_discount: promotion?.kind === 'coupon' ? Number(promotion.discountAmount) || 0 : 0,
      offer_id: promotion?.kind === 'offer' ? promotion.id : null,
      offer_discount: promotion?.kind === 'offer' ? Number(promotion.discountAmount) || 0 : 0,
      manual_discount_type: manualDiscountType,
      manual_discount_value: Number(manualDiscountValue) || 0,
      points_discount: Number(pointsDiscount) || 0,
      manual_discount_approval_id: discountOverrideApprovalId,
      payment_method: normalizedPaymentMethod,
      payment_status: 'paid',
      order_status: 'delivered'
    },
    items: cart.map((item) => {
      const rate = getCartUnitPrice(item);
      const qty = Number(item.quantity);
      const rawGstPercent = item.gst_percent ?? item.gst;
      const gstPercent = rawGstPercent == null || rawGstPercent === ''
        ? null
        : Number(rawGstPercent);
      const itemTotal = rate * qty;
      const taxLine = taxBreakdown?.items?.[String(item.id)];
      const lineDiscount = Number(taxLine?.discountAmount) || 0;

      return {
        product_id: item.id,
        product_name: item.itname || item.name || '',
        quantity: qty,
        rate: rate,
        gst_percent: gstPercent,
        gst_amount: Number.isFinite(Number(taxLine?.gstAmount)) ? Number(taxLine.gstAmount) : null,
        discount_amount: lineDiscount,
        hsn_code: item.hsn_code || item.hsncode || '',
        total: Number.isFinite(Number(taxLine?.total)) ? Number(taxLine.total) : itemTotal,
        override_approval_id: item.price_override_approval_id || null
      };
    }),
    promotion: promotion ? {
      kind: promotion.kind,
      id: promotion.id,
      discount_amount: Number(promotion.discountAmount) || 0
    } : null,
    coupon_code: String(couponCode || '').trim().toUpperCase() || null,
    payment: {
      amount: Number(paidAmount),
      method: normalizedPaymentMethod,
      reference_no: referenceNo
    }
  };
};
