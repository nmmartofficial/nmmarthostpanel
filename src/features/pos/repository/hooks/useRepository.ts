/**
 * Repository Module Hook
 * Phase 16 - Step 3
 */

import { useRepositoryContext } from '../context/RepositoryContext';

export const useRepository = () => {
  const { repositoryState, actions, service } = useRepositoryContext();
  return {
    repositoryState,
    ...actions,
    ...service,
  };
};
