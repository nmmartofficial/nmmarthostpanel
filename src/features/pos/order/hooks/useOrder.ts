/**
 * Order Module Hook
 * Phase 7 - Step 1
 */

import { useOrderContext } from '../context/OrderContext';

export const useOrder = () => {
  const { orderState, actions } = useOrderContext();
  return {
    orderState,
    ...actions,
  };
};
