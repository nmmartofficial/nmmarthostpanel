import React from 'react';
import { useInvoice } from '../invoice/hooks/useInvoice';

export const InvoiceSummary = () => {
  const {
    invoiceState,
    generateInvoiceNumber,
    validateInvoice,
    createInvoice,
    processInvoice,
    resetInvoice,
  } = useInvoice();

  const handleCreateInvoice = () => {
    createInvoice({
      status: 'IDLE',
    });
  };

  const handleProcessInvoice = () => {
    processInvoice({
      status: 'IDLE',
    });
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <h2>Invoice Summary</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div><strong>Invoice ID:</strong> {invoiceState.invoiceId || '-'}</div>
        <div><strong>Invoice Number:</strong> {invoiceState.invoiceNumber || '-'}</div>
        <div><strong>Order ID:</strong> {invoiceState.orderId || '-'}</div>
        <div><strong>Customer ID:</strong> {invoiceState.customerId || '-'}</div>
        <div><strong>Payment ID:</strong> {invoiceState.paymentId || '-'}</div>
        <div><strong>Invoice Status:</strong> {invoiceState.invoiceStatus}</div>
        <div><strong>Validation Status:</strong> {invoiceState.validationErrors.length === 0 ? 'Valid' : `Invalid (${invoiceState.validationErrors.length} errors)`}</div>
        <div><strong>Loading:</strong> {invoiceState.loading ? 'Yes' : 'No'}</div>
        <div style={{ gridColumn: '1 / -1' }}><strong>Error:</strong> {invoiceState.error || 'None'}</div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={generateInvoiceNumber} style={{ padding: '8px 16px', cursor: 'pointer' }}>Generate Invoice Number</button>
        <button onClick={validateInvoice} style={{ padding: '8px 16px', cursor: 'pointer' }}>Validate Invoice</button>
        <button onClick={handleCreateInvoice} style={{ padding: '8px 16px', cursor: 'pointer' }}>Create Invoice</button>
        <button onClick={handleProcessInvoice} style={{ padding: '8px 16px', cursor: 'pointer' }}>Process Invoice</button>
        <button onClick={resetInvoice} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reset Invoice</button>
      </div>
    </div>
  );
};
