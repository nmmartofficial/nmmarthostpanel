import React from 'react';
import { usePersistence } from '../persistence/hooks/usePersistence';

export const PersistenceSummary = () => {
  const {
    state,
    actions
  } = usePersistence();

  return (
    <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <h2>Persistence Summary</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div><strong>Persistence ID:</strong> {state.persistenceId || '-'}</div>
        <div><strong>Persistence Status:</strong> {state.persistenceStatus}</div>
        <div><strong>Current Entity:</strong> {state.currentEntity || '-'}</div>
        <div><strong>Is Persisting:</strong> {state.isPersisting ? 'Yes' : 'No'}</div>
        <div><strong>Started At:</strong> {state.startedAt || '-'}</div>
        <div><strong>Finished At:</strong> {state.finishedAt || '-'}</div>
        <div><strong>Loading:</strong> {state.loading ? 'Yes' : 'No'}</div>
        <div><strong>Error:</strong> {state.error || 'None'}</div>
        <div><strong>Execution Reference:</strong> {state.executionReference ? 'Set' : 'Not set'}</div>
        <div><strong>Runtime Reference:</strong> {state.runtimeReference ? 'Set' : 'Not set'}</div>
        <div><strong>Checkout Reference:</strong> {state.checkoutReference ? 'Set' : 'Not set'}</div>
        <div><strong>Order Reference:</strong> {state.orderReference ? 'Set' : 'Not set'}</div>
        <div><strong>Invoice Reference:</strong> {state.invoiceReference ? 'Set' : 'Not set'}</div>
        <div><strong>Printer Reference:</strong> {state.printerReference ? 'Set' : 'Not set'}</div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={actions.processExecution} style={{ padding: '8px 16px', cursor: 'pointer' }}>Process Execution</button>
        <button onClick={actions.processPersistence} style={{ padding: '8px 16px', cursor: 'pointer' }}>Process Persistence</button>
        <button onClick={actions.executePersistence} style={{ padding: '8px 16px', cursor: 'pointer' }}>Execute Persistence</button>
        <button onClick={actions.resetPersistence} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reset Persistence</button>
      </div>
    </div>
  );
};
