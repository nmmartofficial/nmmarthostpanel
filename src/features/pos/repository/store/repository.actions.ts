/**
 * Repository Module Actions
 * Phase 16 - Step 6
 * Basic state setters implementation
 */

import type { RepositoryState, RepositoryActions, RepositoryProcessResult, RepositoryPersistenceResult, RepositoryPipelineResult } from '../types/repository.types';
import { initialRepositoryState } from './repository.state';
import { REPOSITORY_STATUS } from '../constants/repository.constants';

export const createRepositoryActions = (state: RepositoryState, setState: (state: RepositoryState) => void): RepositoryActions => {
  return {
    setRepositoryId: (repositoryId: string | null) => {
      setState({ ...state, repositoryId });
    },
    setRepositoryStatus: (status: any) => {
      setState({ ...state, repositoryStatus: status });
    },
    setCurrentEntity: (entity: any | null) => {
      setState({ ...state, currentEntity: entity });
    },
    setConnected: (isConnected: boolean) => {
      setState({ ...state, isConnected });
    },
    setLoading: (loading: boolean) => {
      setState({ ...state, loading });
    },
    setError: (error: string) => {
      setState({ ...state, error });
    },
    resetRepository: () => {
      setState(initialRepositoryState);
    },
    setRuntimeReference: (reference: any | null) => {
      setState({ ...state, runtimeReference: reference });
    },
    setExecutionReference: (reference: any | null) => {
      setState({ ...state, executionReference: reference });
    },
    setPersistenceReference: (reference: any | null) => {
      setState({ ...state, persistenceReference: reference });
    },
    setCheckoutReference: (reference: any | null) => {
      setState({ ...state, checkoutReference: reference });
    },
    setOrderReference: (reference: any | null) => {
      setState({ ...state, orderReference: reference });
    },
    setInvoiceReference: (reference: any | null) => {
      setState({ ...state, invoiceReference: reference });
    },
    setPrinterReference: (reference: any | null) => {
      setState({ ...state, printerReference: reference });
    },
    processRepository: (): RepositoryProcessResult => {
      const repositoryId = state.repositoryId || `REPO-${Date.now()}`;
      setState({
        ...state,
        repositoryId,
        repositoryStatus: REPOSITORY_STATUS.READY,
        currentEntity: state.currentEntity,
      });
      return {
        success: true,
        repositoryId,
        repositoryStatus: REPOSITORY_STATUS.READY,
        currentEntity: state.currentEntity,
        processedAt: new Date(),
        error: null,
      };
    },
    processPersistence: (): RepositoryPersistenceResult => {
      const persistenceId = `PERS-${Date.now()}`;
      return {
        success: true,
        persistenceId,
        persistenceStatus: 'COMPLETED',
        processedAt: new Date(),
        error: null,
      };
    },
    executeRepository: (): RepositoryPipelineResult => {
      const actions = createRepositoryActions(state, setState);
      const processResult = actions.processRepository();
      const persistenceResult = actions.processPersistence();
      return {
        success: processResult.success && persistenceResult.success,
        repository: processResult,
        persistence: persistenceResult,
        completedAt: new Date(),
        error: processResult.error || persistenceResult.error,
      };
    },
  };
};
