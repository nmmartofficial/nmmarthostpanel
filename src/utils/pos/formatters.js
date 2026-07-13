/**
 * POS Data Formatting Utilities
 */

/**
 * Formats a number as currency (INR)
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

/**
 * Formats a date to local string
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
};

/**
 * Formats a time to local string
 */
export const formatTime = (date) => {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

/**
 * Formats an order/invoice number with padding
 */
export const formatInvoiceNo = (no) => {
  return String(no).padStart(6, '0');
};

/**
 * Formats the age of a held bill
 */
export const formatHoldAge = (timestamp) => {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
};

/**
 * Formats audit activity labels
 */
export const formatAuditLabel = (type) => {
  return type.replace(/([A-Z])/g, ' $1').trim();
};

/**
 * Formats hardware status labels
 */
export const formatHardwareStatus = (status) => {
  const map = {
    'success': 'Operational',
    'warning': 'Attention Needed',
    'error': 'Offline',
    'info': 'Standby'
  };
  return map[status] || 'Unknown';
};

/**
 * Returns Tailwind classes for status badges
 */
export const getStatusColorClass = (status) => {
  const map = {
    'success': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'error': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    'warning': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'info': 'bg-sky-500/10 text-sky-500 border-sky-500/20'
  };
  return map[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';
};
