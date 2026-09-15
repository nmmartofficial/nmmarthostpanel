import React, { createContext, useContext } from 'react';

const POSContext = createContext();

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};

export const POSProvider = ({ children, value }) => {
  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
};
