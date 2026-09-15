import React from 'react';
import { usePrinter } from '../printer/hooks/usePrinter';

export const PrinterSummary = () => {
  const {
    state,
    actions
  } = usePrinter();

  const handleCreateConfiguration = () => {
    actions.createConfiguration({
      printerId: 'test-printer',
      printerName: 'Test Printer',
      printerType: 'Thermal',
      paperWidth: '80mm',
      copies: 1,
      isConnected: true
    });
  };

  const handleValidateConfiguration = () => {
    actions.validateConfiguration({
      printerId: 'test-printer',
      printerName: 'Test Printer',
      printerType: 'Thermal',
      paperWidth: '80mm',
      copies: 1,
      isConnected: true
    });
  };

  const handleProcessPrinter = () => {
    actions.processPrinter({
      printerId: 'test-printer',
      printerName: 'Test Printer',
      printerType: 'Thermal',
      paperWidth: '80mm',
      copies: 1,
      isConnected: true
    });
  };

  const handleAddConfiguration = () => {
    const configResult = actions.createConfiguration({
      printerId: 'test-printer',
      printerName: 'Test Printer',
      printerType: 'Thermal',
      paperWidth: '80mm',
      copies: 1,
      isConnected: true
    });
    if (configResult.success && configResult.configuration) {
      actions.addConfiguration(configResult.configuration);
    }
  };

  const handleRemoveConfiguration = () => {
    const configs = actions.getConfigurations();
    if (configs.length > 0) {
      actions.removeConfiguration(configs[0].configurationId);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <h2>Printer Summary</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div><strong>Printer ID:</strong> {state.printerId || '-'}</div>
        <div><strong>Printer Name:</strong> {state.printerName || '-'}</div>
        <div><strong>Printer Type:</strong> {state.printerType || '-'}</div>
        <div><strong>Printer Status:</strong> {state.printerStatus}</div>
        <div><strong>Connection Status:</strong> {state.isConnected ? 'Connected' : 'Disconnected'}</div>
        <div><strong>Paper Width:</strong> {state.paperWidth || '-'}</div>
        <div><strong>Copies:</strong> {state.copies}</div>
        <div><strong>Last Printed Time:</strong> {state.lastPrintedAt || '-'}</div>
        <div><strong>Validation Status:</strong> {state.validationErrors.length === 0 ? 'Valid' : `Invalid (${state.validationErrors.length} errors)`}</div>
        <div><strong>Configuration Count:</strong> {state.configurations.length}</div>
        <div><strong>Loading:</strong> {state.loading ? 'Yes' : 'No'}</div>
        <div style={{ gridColumn: '1 / -1' }}><strong>Error:</strong> {state.error || 'None'}</div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={handleCreateConfiguration} style={{ padding: '8px 16px', cursor: 'pointer' }}>Create Configuration</button>
        <button onClick={handleValidateConfiguration} style={{ padding: '8px 16px', cursor: 'pointer' }}>Validate Configuration</button>
        <button onClick={handleProcessPrinter} style={{ padding: '8px 16px', cursor: 'pointer' }}>Process Printer</button>
        <button onClick={handleAddConfiguration} style={{ padding: '8px 16px', cursor: 'pointer' }}>Add Configuration</button>
        <button onClick={handleRemoveConfiguration} style={{ padding: '8px 16px', cursor: 'pointer' }}>Remove Configuration</button>
        <button onClick={actions.clearConfigurations} style={{ padding: '8px 16px', cursor: 'pointer' }}>Clear Configurations</button>
        <button onClick={actions.resetPrinter} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reset Printer</button>
      </div>
    </div>
  );
};
