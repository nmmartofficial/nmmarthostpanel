import { handleERPAction, ACTION_TYPES, ERP_MODULES } from '../erpController';

export const fetchModuleData = async (moduleName, options = {}) => {
  try {
    return await handleERPAction(moduleName, ACTION_TYPES.FETCH, options);
  } catch (error) {
    console.error('erpService fetchModuleData error:', error);
    return [];
  }
};

export const saveModuleRecord = async (moduleName, payload, options = {}) => {
  try {
    return await handleERPAction(moduleName, ACTION_TYPES.INSERT, payload, options);
  } catch (error) {
    console.error('erpService saveModuleRecord error:', error);
    return null;
  }
};
