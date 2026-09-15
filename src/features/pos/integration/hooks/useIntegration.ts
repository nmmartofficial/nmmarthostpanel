import { useIntegrationContext } from '../context/IntegrationContext';

export const useIntegration = () => {
  const context = useIntegrationContext();

  return {
    state: context.state,
    actions: context.actions
  };
};
