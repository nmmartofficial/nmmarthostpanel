import React from 'react';
import { useIntegration } from '../integration/hooks/useIntegration';

export const IntegrationSummary = () => {
  const {
    state,
    actions
  } = useIntegration();

  const handleConnectCart = () => {
    actions.setCartReference({ id: 'test-cart' });
  };

  const handleConnectCustomer = () => {
    actions.setCustomerReference({ id: 'test-customer' });
  };

  const handleConnectCheckout = () => {
    actions.setCheckoutReference({ id: 'test-checkout' });
  };

  const handleConnectOrder = () => {
    actions.setOrderReference({ id: 'test-order' });
  };

  const handleConnectInvoice = () => {
    actions.setInvoiceReference({ id: 'test-invoice' });
  };

  const handleConnectPrinter = () => {
    actions.setPrinterReference({ id: 'test-printer' });
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <h2>Integration Summary</h2>
      <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>Module References</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div><strong>Cart Reference:</strong> {state.cartReference ? JSON.stringify(state.cartReference) : '-'}</div>
        <div><strong>Customer Reference:</strong> {state.customerReference ? JSON.stringify(state.customerReference) : '-'}</div>
        <div><strong>Checkout Reference:</strong> {state.checkoutReference ? JSON.stringify(state.checkoutReference) : '-'}</div>
        <div><strong>Order Reference:</strong> {state.orderReference ? JSON.stringify(state.orderReference) : '-'}</div>
        <div><strong>Invoice Reference:</strong> {state.invoiceReference ? JSON.stringify(state.invoiceReference) : '-'}</div>
        <div><strong>Printer Reference:</strong> {state.printerReference ? JSON.stringify(state.printerReference) : '-'}</div>
      </div>
      <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>Workflow Information</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div><strong>Workflow Status:</strong> {state.workflowStatus}</div>
        <div><strong>Current Workflow Step:</strong> {state.currentWorkflowStep || '-'}</div>
        <div><strong>Workflow Result Success:</strong> {state.workflowResult?.success ? 'Yes' : 'No'}</div>
        <div><strong>Completed Steps:</strong> {state.workflowResult?.completedSteps?.length || 0}</div>
        <div style={{ gridColumn: '1 / -1' }}><strong>Error:</strong> {state.workflowResult?.error || state.error || 'None'}</div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={handleConnectCart} style={{ padding: '8px 16px', cursor: 'pointer' }}>Connect Cart</button>
        <button onClick={handleConnectCustomer} style={{ padding: '8px 16px', cursor: 'pointer' }}>Connect Customer</button>
        <button onClick={handleConnectCheckout} style={{ padding: '8px 16px', cursor: 'pointer' }}>Connect Checkout</button>
        <button onClick={handleConnectOrder} style={{ padding: '8px 16px', cursor: 'pointer' }}>Connect Order</button>
        <button onClick={handleConnectInvoice} style={{ padding: '8px 16px', cursor: 'pointer' }}>Connect Invoice</button>
        <button onClick={handleConnectPrinter} style={{ padding: '8px 16px', cursor: 'pointer' }}>Connect Printer</button>
        <button onClick={actions.processWorkflow} style={{ padding: '8px 16px', cursor: 'pointer' }}>Process Workflow</button>
        <button onClick={actions.resetWorkflow} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reset Workflow</button>
      </div>
    </div>
  );
};
