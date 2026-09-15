import React from 'react';
import { useRepository } from '../repository/hooks/useRepository';

export const RepositorySummary = () => {
  const {
    repositoryState,
    resetRepository,
    processRepository,
    processPersistence,
    executeRepository
  } = useRepository();

  return (
    <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <h2>Repository Summary</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div><strong>Repository ID:</strong> {repositoryState.repositoryId || '-'}</div>
        <div><strong>Repository Status:</strong> {repositoryState.repositoryStatus}</div>
        <div><strong>Current Entity:</strong> {repositoryState.currentEntity || '-'}</div>
        <div><strong>Connected:</strong> {repositoryState.isConnected ? 'Yes' : 'No'}</div>
        <div><strong>Loading:</strong> {repositoryState.loading ? 'Yes' : 'No'}</div>
        <div><strong>Error:</strong> {repositoryState.error || 'None'}</div>
        <div><strong>Runtime Reference:</strong> {repositoryState.runtimeReference ? 'Set' : 'Not set'}</div>
        <div><strong>Execution Reference:</strong> {repositoryState.executionReference ? 'Set' : 'Not set'}</div>
        <div><strong>Persistence Reference:</strong> {repositoryState.persistenceReference ? 'Set' : 'Not set'}</div>
        <div><strong>Checkout Reference:</strong> {repositoryState.checkoutReference ? 'Set' : 'Not set'}</div>
        <div><strong>Order Reference:</strong> {repositoryState.orderReference ? 'Set' : 'Not set'}</div>
        <div><strong>Invoice Reference:</strong> {repositoryState.invoiceReference ? 'Set' : 'Not set'}</div>
        <div><strong>Printer Reference:</strong> {repositoryState.printerReference ? 'Set' : 'Not set'}</div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={resetRepository} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reset Repository</button>
        <button onClick={processRepository} style={{ padding: '8px 16px', cursor: 'pointer' }}>Process Repository</button>
        <button onClick={processPersistence} style={{ padding: '8px 16px', cursor: 'pointer' }}>Process Persistence</button>
        <button onClick={executeRepository} style={{ padding: '8px 16px', cursor: 'pointer' }}>Execute Repository</button>
      </div>
    </div>
  );
};
