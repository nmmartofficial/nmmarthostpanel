import React from 'react';
import { useExecution } from '../execution/hooks/useExecution';

export const ExecutionSummary = () => {
  const {
    state,
    actions
  } = useExecution();

  return (
    <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <h2>Execution Summary</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div><strong>Execution ID:</strong> {(state as any).executionId || '-'}</div>
        <div><strong>Execution Status:</strong> {(state as any).executionStatus}</div>
        <div><strong>Current Phase:</strong> {(state as any).currentPhase || '-'}</div>
        <div><strong>Started At:</strong> {(state as any).startedAt || '-'}</div>
        <div><strong>Finished At:</strong> {(state as any).finishedAt || '-'}</div>
        <div><strong>Loading:</strong> {(state as any).loading ? 'Yes' : 'No'}</div>
        <div><strong>Cart Reference:</strong> {(state as any).cartReference ? 'Set' : 'Not set'}</div>
        <div><strong>Customer Reference:</strong> {(state as any).customerReference ? 'Set' : 'Not set'}</div>
        <div><strong>Checkout Reference:</strong> {(state as any).checkoutReference ? 'Set' : 'Not set'}</div>
        <div><strong>Order Reference:</strong> {(state as any).orderReference ? 'Set' : 'Not set'}</div>
        <div><strong>Invoice Reference:</strong> {(state as any).invoiceReference ? 'Set' : 'Not set'}</div>
        <div><strong>Printer Reference:</strong> {(state as any).printerReference ? 'Set' : 'Not set'}</div>
        <div style={{ gridColumn: '1 / -1' }}><strong>Error:</strong> {(state as any).error || 'None'}</div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={(actions as any).startExecution} style={{ padding: '8px 16px', cursor: 'pointer' }}>Start Execution</button>
        <button onClick={(actions as any).processExecution} style={{ padding: '8px 16px', cursor: 'pointer' }}>Process Execution</button>
        <button onClick={(actions as any).executeSale} style={{ padding: '8px 16px', cursor: 'pointer' }}>Execute Sale</button>
        <button onClick={(actions as any).persistExecution} style={{ padding: '8px 16px', cursor: 'pointer' }}>Persist Execution</button>
        <button onClick={(actions as any).resetExecution} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reset Execution</button>
      </div>
    </div>
  );
};
