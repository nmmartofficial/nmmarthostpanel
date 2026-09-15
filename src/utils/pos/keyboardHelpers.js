/**
 * Keyboard Workflow Utilities
 */

/**
 * Maps function keys to their POS actions (for display/tooltips)
 */
export const KEY_MAP = {
  'F1': 'Search Products',
  'F2': 'Search Customer',
  'F3': 'Hold Bill',
  'F4': 'Hold Queue',
  'F6': 'Pay (Cash)',
  'F7': 'Shift Dashboard',
  'F8': 'Add Discount',
  'F9': 'Audit Timeline',
  'F10': 'Hardware Status',
  'F12': 'Quick Checkout',
  'ESC': 'Cancel / Focus Barcode',
  'DEL': 'Remove Item',
  '+': 'Increase Qty',
  '-': 'Decrease Qty'
};

/**
 * Returns help text for a key
 */
export const getActionForKey = (key) => {
  return KEY_MAP[key.toUpperCase()] || 'Unknown Action';
};

/**
 * Checks if key is a functional key (F1-F12)
 */
export const isFunctionalKey = (key) => {
  return /^F[1-9]|F1[0-2]$/.test(key);
};

/**
 * Common POS Key Constants
 */
export const POS_KEYS = {
  SEARCH: 'F1',
  CUSTOMER: 'F2',
  HOLD: 'F3',
  QUEUE: 'F4',
  PAYMENT: 'F6',
  SHIFT: 'F7',
  DISCOUNT: 'F8',
  TIMELINE: 'F9',
  HARDWARE: 'F10',
  CHECKOUT: 'F12',
  CANCEL: 'Escape'
};
