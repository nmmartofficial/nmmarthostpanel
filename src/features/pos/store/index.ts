import type { POSState } from '../types';

export const initialPOSState: POSState = {
  cart: {
    id: '',
    items: [],
    total: 0
  },
  settings: {
    theme: 'light',
    language: 'en'
  }
};
