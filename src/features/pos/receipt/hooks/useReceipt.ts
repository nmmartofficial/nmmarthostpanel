/**
 * Receipt Module Hook
 * Phase 9 - Step 1
 * Placeholder - Not Implemented
 */

import { useReceipt as useReceiptContext } from '../context/ReceiptContext';

export const useReceipt = () => {
  const context = useReceiptContext();
  
  return {
    state: context.state,
    actions: context.actions
  };
};
