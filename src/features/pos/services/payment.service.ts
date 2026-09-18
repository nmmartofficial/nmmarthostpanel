const normalizeMethod = (method: string) => String(method || 'CASH').trim().toUpperCase();
const supportedMethods = new Set(['CASH', 'UPI', 'CARD', 'CREDIT']);

const failure = (code: string, message: string, details?: unknown) => ({
  success: false,
  error: { code, message, details: details || null },
  paymentId: null,
});

export const PaymentService = {
  processPayment: async (input: { amount?: number; method?: string; reference?: string } = {}) => {
    const amount = Number(input.amount ?? 0);
    const method = normalizeMethod(input.method || 'CASH');

    if (!Number.isFinite(amount) || amount < 0) {
      return failure('INVALID_AMOUNT', 'Invalid payment amount');
    }

    if (!supportedMethods.has(method)) {
      return failure('UNSUPPORTED_PAYMENT_METHOD', 'Unsupported payment method');
    }

    const orderId = (input as any).orderId;
    if (!orderId) return failure('ORDER_REQUIRED', 'A payment must be linked to a persisted order');

    return failure(
      'ATOMIC_CHECKOUT_REQUIRED',
      'Payment must be persisted by the authoritative atomic checkout transaction'
    );
  }
};
