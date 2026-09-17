const PAYMENT_METHODS = new Set(['cash', 'upi', 'card', 'wallet', 'credit', 'mixed']);

export const normalizeCheckoutPaymentMethod = (method) => {
  const normalized = String(method || 'cash').trim().toLowerCase();
  return normalized === 'split' ? 'mixed' : normalized;
};

export const validateAtomicCheckoutInput = ({ cart, totalAmount, paidAmount, paymentMethod }) => {
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

  cart.forEach((item) => {
    if (item?.id == null) throw new Error('INVALID_PRODUCT');
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
      throw new Error('INVALID_QUANTITY');
    }
  });

  return normalizedPaymentMethod;
};

export const buildAtomicCheckoutPayload = ({
  cart,
  selectedUser,
  customerInfo,
  subtotal,
  totalAmount,
  discount,
  deliveryCharge,
  paymentMethod,
  paidAmount,
  referenceNo = null
}) => {
  const normalizedPaymentMethod = validateAtomicCheckoutInput({
    cart,
    totalAmount,
    paidAmount,
    paymentMethod
  });

  return {
    order_header: {
      order_type: 'pos_counter',
      user_id: selectedUser?.id ?? null,
      customer_name: selectedUser?.name || customerInfo?.name || 'Walk-in Customer',
      user_mobile: selectedUser?.mobile || customerInfo?.mob || '',
      delivery_address: selectedUser?.address || customerInfo?.add || '',
      subtotal: Number(subtotal) || 0,
      discount: Number(discount) || 0,
      delivery_charge: Number(deliveryCharge) || 0,
      total_amount: Number(totalAmount) || 0,
      payment_method: normalizedPaymentMethod,
      payment_status: 'paid',
      order_status: 'delivered'
    },
    items: cart.map((item) => ({
      product_id: item.id,
      product_name: item.itname || item.name || '',
      quantity: Number(item.quantity),
      rate: Number(item.sale_rate ?? item.price ?? 0),
      total: Number(item.sale_rate ?? item.price ?? 0) * Number(item.quantity)
    })),
    payment: {
      amount: Number(paidAmount),
      method: normalizedPaymentMethod,
      reference_no: referenceNo
    }
  };
};
