import React from 'react';
import { useReceipt } from '../receipt/hooks/useReceipt';

export const ReceiptSummary = () => {
  const {
    state,
    actions: {
      generateReceiptNumber,
      validateReceipt,
      createReceipt,
      processReceipt,
      resetReceipt
    }
  } = useReceipt();

  const handleGenerateNumber = () => {
    generateReceiptNumber();
  };

  const handleValidate = async () => {
    await validateReceipt();
  };

  const handleCreate = async () => {
    await createReceipt({
      status: state.receiptStatus,
      receiptId: state.receiptId || undefined,
      receiptNumber: state.receiptNumber || null,
      invoiceId: state.invoiceId,
      orderId: state.orderId,
      customerId: state.customerId,
      paymentId: state.paymentId,
      receiptDate: state.receiptDate ? new Date(state.receiptDate) : undefined,
      receiptStatus: state.receiptStatus,
      subtotal: 0,
      discount: 0,
      tax: 0,
      grandTotal: 0,
      items: []
    });
  };

  const handleProcess = async () => {
    await processReceipt({
      status: state.receiptStatus,
      receiptId: state.receiptId || undefined,
      receiptNumber: state.receiptNumber || null,
      invoiceId: state.invoiceId,
      orderId: state.orderId,
      customerId: state.customerId,
      paymentId: state.paymentId,
      receiptDate: state.receiptDate ? new Date(state.receiptDate) : undefined,
      receiptStatus: state.receiptStatus,
      subtotal: 0,
      discount: 0,
      tax: 0,
      grandTotal: 0,
      items: []
    });
  };

  return (
    <div className="receipt-summary">
      <h2>Receipt Summary</h2>

      <div>
        <strong>Receipt ID:</strong> {state.receiptId ?? 'N/A'}
      </div>
      <div>
        <strong>Receipt Number:</strong> {state.receiptNumber ?? 'N/A'}
      </div>
      <div>
        <strong>Invoice ID:</strong> {state.invoiceId ?? 'N/A'}
      </div>
      <div>
        <strong>Order ID:</strong> {state.orderId ?? 'N/A'}
      </div>
      <div>
        <strong>Customer ID:</strong> {state.customerId ?? 'N/A'}
      </div>
      <div>
        <strong>Payment ID:</strong> {state.paymentId ?? 'N/A'}
      </div>
      <div>
        <strong>Receipt Status:</strong> {state.receiptStatus}
      </div>
      <div>
        <strong>Receipt Date:</strong> {state.receiptDate ?? 'N/A'}
      </div>
      <div>
        <strong>Loading:</strong> {String(state.loading)}
      </div>
      <div>
        <strong>Error:</strong> {state.error || 'None'}
      </div>
      <div>
        <strong>Validation Status:</strong> {state.validationErrors.length === 0 ? 'Valid' : 'Invalid'}
      </div>

      {state.validationErrors.length > 0 && (
        <div>
          <strong>Validation Errors:</strong>
          <ul>
            {state.validationErrors.map((error, index) => (
              <li key={index}>{`${error.field}: ${error.message}`}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="receipt-summary-buttons">
        <button type="button" onClick={handleGenerateNumber}>
          Generate Number
        </button>
        <button type="button" onClick={handleValidate}>
          Validate
        </button>
        <button type="button" onClick={handleCreate}>
          Create Receipt
        </button>
        <button type="button" onClick={handleProcess}>
          Process Receipt
        </button>
        <button type="button" onClick={resetReceipt}>
          Reset
        </button>
      </div>
    </div>
  );
};
