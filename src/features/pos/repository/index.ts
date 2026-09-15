/**
 * Repository Module Barrel Exports
 * Phase 17 - Step 3
 */

export { RepositoryProvider, useRepositoryContext } from './context/RepositoryContext';
export { useRepository } from './hooks/useRepository';
export { REPOSITORY_STATUS } from './constants/repository.constants';
export { REPOSITORY_PROVIDER } from './constants/repository.constants';
export { REPOSITORY_ADAPTER_STATUS } from './types/repository.types';
export type {
  RepositoryStatus,
  RepositoryState,
  RepositoryActions,
  RepositoryProcessResult,
  RepositoryPersistenceResult,
  RepositoryPipelineResult,
  RepositoryEntity,
  RepositorySaveRequest,
  RepositorySaveResult,
  RepositoryFindRequest,
  RepositoryFindResult,
  RepositoryDeleteRequest,
  RepositoryDeleteResult,
  RepositoryListRequest,
  RepositoryListResult,
  CheckoutRepositoryEntity,
  OrderRepositoryEntity,
  InvoiceRepositoryEntity,
  PrinterRepositoryEntity,
  RuntimeRepositoryEntity,
  ExecutionRepositoryEntity,
  PersistenceRepositoryEntity,
  RepositoryStore,
  RepositoryEntityName,
  RepositoryFactoryResult,
  RepositoryFactory,
  RepositoryAdapter,
  RepositoryAdapterResult,
  RepositoryAdapterStatus,
  RepositoryStorageProvider,
  RepositoryStorageAdapter,
  RepositoryStorageResult,
} from './types/repository.types';
export { initialRepositoryState } from './store/repository.state';
export { repositoryActions } from './store/repository.actions';
export { repositorySelectors } from './store/repository.selectors';
export { RepositoryService } from './services/repository.service';
export { repositoryPlaceholderUtil, deepClone, createRepositoryStore } from './utils/repository.utils';
export { createSupabaseStorageAdapter } from './adapters/supabase.adapter';
