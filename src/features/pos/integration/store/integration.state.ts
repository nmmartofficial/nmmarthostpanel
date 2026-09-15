import type { IntegrationState } from '../types/integration.types';
import { INTEGRATION_STATUS } from '../constants/integration.constants';
import { WORKFLOW_STATUS } from '../types/integration.types';

export const initialIntegrationState: IntegrationState = {
  cartReference: null,
  customerReference: null,
  checkoutReference: null,
  orderReference: null,
  invoiceReference: null,
  printerReference: null,
  integrationStatus: INTEGRATION_STATUS.IDLE,
  loading: false,
  error: '',
  workflowStatus: WORKFLOW_STATUS.IDLE,
  currentWorkflowStep: undefined,
  workflowResult: undefined
};
