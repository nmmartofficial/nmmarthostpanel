import React from 'react';
import { useRuntime } from '../runtime/hooks/useRuntime';

export const RuntimeSummary = () => {
  const {
    state,
    actions
  } = useRuntime();

  return (
    <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <h2>Runtime Summary</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div><strong>Runtime ID:</strong> {state.runtimeId || '-'}</div>
        <div><strong>Runtime Status:</strong> {state.runtimeStatus}</div>
        <div><strong>Current Module:</strong> {state.currentModule || '-'}</div>
        <div><strong>Is Running:</strong> {state.isRunning ? 'Yes' : 'No'}</div>
        <div><strong>Started At:</strong> {state.startedAt || '-'}</div>
        <div><strong>Finished At:</strong> {state.finishedAt || '-'}</div>
        <div><strong>Loading:</strong> {state.loading ? 'Yes' : 'No'}</div>
        <div><strong>Error:</strong> {state.error || 'None'}</div>
        <div><strong>Cart Reference:</strong> {state.cartReference ? 'Set' : 'Not set'}</div>
        <div><strong>Customer Reference:</strong> {state.customerReference ? 'Set' : 'Not set'}</div>
        <div><strong>Checkout Reference:</strong> {state.checkoutReference ? 'Set' : 'Not set'}</div>
        <div><strong>Order Reference:</strong> {state.orderReference ? 'Set' : 'Not set'}</div>
        <div><strong>Invoice Reference:</strong> {state.invoiceReference ? 'Set' : 'Not set'}</div>
        <div><strong>Printer Reference:</strong> {state.printerReference ? 'Set' : 'Not set'}</div>
        <div><strong>Validation Result:</strong> {state.validationErrors.length === 0 ? 'Valid' : `Invalid (${state.validationErrors.length} errors)`}</div>
        <div><strong>Runtime Process Result:</strong> {state.processResult ? (state.processResult.success ? 'Success' : 'Failed') : 'Not run'}</div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={actions.startRuntime} style={{ padding: '8px 16px', cursor: 'pointer' }}>Start Runtime</button>
        <button onClick={actions.stopRuntime} style={{ padding: '8px 16px', cursor: 'pointer' }}>Stop Runtime</button>
        <button onClick={actions.restartRuntime} style={{ padding: '8px 16px', cursor: 'pointer' }}>Restart Runtime</button>
        <button onClick={actions.validateRuntime} style={{ padding: '8px 16px', cursor: 'pointer' }}>Validate Runtime</button>
        <button onClick={actions.processRuntime} style={{ padding: '8px 16px', cursor: 'pointer' }}>Process Runtime</button>
        <button onClick={actions.resetRuntime} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reset Runtime</button>
        <button onClick={actions.clearValidation} style={{ padding: '8px 16px', cursor: 'pointer' }}>Clear Validation</button>
      </div>
    </div>
  );
};
