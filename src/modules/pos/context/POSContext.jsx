
import React, { createContext, useContext } from 'react';

const POSContext = createContext(undefined);

export const POSProvider = ({ children, value }) => {
  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
