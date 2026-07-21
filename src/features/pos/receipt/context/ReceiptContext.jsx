/**
 * Receipt Module Context
 * Phase 9 - Step 1
 * Placeholder - Not Implemented
 */

import React, { createContext, useContext, useState, useMemo } from 'react';
import { initialReceiptState } from '../store/receipt.state';
import { createReceiptActions } from '../store/receipt.actions';

const ReceiptContext = createContext();

export const useReceipt = () => {
  const context = useContext(ReceiptContext);
  if (!context) {
    throw new Error('useReceipt must be used within a ReceiptProvider');
  }
  return context;
};

export const ReceiptProvider = ({ children }) => {
  const [state, setState] = useState(initialReceiptState);

  const actions = useMemo(() => createReceiptActions(state, setState), [state, setState]);

  const value = useMemo(() => ({
    state,
    actions
  }), [state, actions]);

  return <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>;
};
