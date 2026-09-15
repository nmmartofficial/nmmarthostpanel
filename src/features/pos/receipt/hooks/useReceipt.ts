/**
 * Receipt Module Hook
 * Phase 9 - Step 2
 * Exposes receipt state and actions
 */

import { useReceipt as useReceiptContext } from '../context/ReceiptContext';

export const useReceipt = () => {
  const context = useReceiptContext();
  
  return {
    state: context.state,
    actions: context.actions
  };
};
