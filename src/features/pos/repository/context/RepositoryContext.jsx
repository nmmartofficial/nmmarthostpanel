/**
 * Repository Module Context
 * Phase 16 - Step 6
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import { initialRepositoryState } from '../store/repository.state';
import { RepositoryService } from '../services/repository.service';

const RepositoryContext = createContext(null);

export const RepositoryProvider = ({ children }) => {
  const [repositoryState, setRepositoryState] = useState(initialRepositoryState);

  const actions = useMemo(() => ({
    setRepositoryId: (repositoryId) => setRepositoryState(prev => ({ ...prev, repositoryId })),
    setRepositoryStatus: (repositoryStatus) => setRepositoryState(prev => ({ ...prev, repositoryStatus })),
    setCurrentEntity: (currentEntity) => setRepositoryState(prev => ({ ...prev, currentEntity })),
    setConnected: (isConnected) => setRepositoryState(prev => ({ ...prev, isConnected })),
    setLoading: (loading) => setRepositoryState(prev => ({ ...prev, loading })),
    setError: (error) => setRepositoryState(prev => ({ ...prev, error })),
    resetRepository: () => setRepositoryState(initialRepositoryState),
    setRuntimeReference: (reference) => setRepositoryState(prev => ({ ...prev, runtimeReference: reference })),
    setExecutionReference: (reference) => setRepositoryState(prev => ({ ...prev, executionReference: reference })),
    setPersistenceReference: (reference) => setRepositoryState(prev => ({ ...prev, persistenceReference: reference })),
    setCheckoutReference: (reference) => setRepositoryState(prev => ({ ...prev, checkoutReference: reference })),
    setOrderReference: (reference) => setRepositoryState(prev => ({ ...prev, orderReference: reference })),
    setInvoiceReference: (reference) => setRepositoryState(prev => ({ ...prev, invoiceReference: reference })),
    setPrinterReference: (reference) => setRepositoryState(prev => ({ ...prev, printerReference: reference })),
    processRepository: () => RepositoryService.processRepository(repositoryState),
    processPersistence: () => RepositoryService.processPersistence(),
    executeRepository: () => RepositoryService.executeRepository(repositoryState),
  }), [repositoryState]);

  const value = useMemo(() => ({
    repositoryState,
    actions,
    service: RepositoryService,
  }), [repositoryState, actions]);

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
};

export const useRepositoryContext = () => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepositoryContext must be used within a RepositoryProvider');
  }
  return context;
};

export default RepositoryContext;
