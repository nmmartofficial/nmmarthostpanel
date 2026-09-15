import type { IntegrationActions, IntegrationState } from '../types/integration.types';
import { initialIntegrationState } from './integration.state';

export const createIntegrationActions = (state: IntegrationState, setState: (state: IntegrationState) => void): IntegrationActions => ({
  setIntegrationStatus: (integrationStatus: IntegrationState['integrationStatus']) => {
    throw new Error('integration.actions.setIntegrationStatus - Not Implemented');
  },
  setLoading: (loading: boolean) => {
    throw new Error('integration.actions.setLoading - Not Implemented');
  },
  setError: (error: string) => {
    throw new Error('integration.actions.setError - Not Implemented');
  },
  resetIntegration: () => {
    throw new Error('integration.actions.resetIntegration - Not Implemented');
  }
});
