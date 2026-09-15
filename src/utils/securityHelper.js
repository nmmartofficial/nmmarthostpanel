import { supabase } from '../supabase';
import { secureStorage } from './security';

/**
 * NM MART - Enterprise Security Helper
 * Provides tenant validation, API security, and audit logging
 */

// Security audit logging
export function logSecurityEvent(eventType, details = {}) {
  try {
    let currentUser = null;
    let currentCompany = null;
    try {
      currentUser = secureStorage.getItem('nm_user_data');
      currentCompany = secureStorage.getItem('nm_current_company');
    } catch (storageErr) {
      console.warn('Failed to get user/company for security log:', storageErr);
    }

    const redactEmail = (email) => {
      if (!email || typeof email !== 'string') return null;
      try {
        const parts = email.split('@');
        if (!parts || parts.length < 2) return null;
        const localPart = parts[0] || '';
        const firstChar = localPart.charAt(0) || 'x';
        const domain = '@' + (parts[1] || 'unknown');
        return firstChar + '***' + domain;
      } catch {
        return null;
      }
    };

    const sanitizeURL = (urlString) => {
      try {
        if (!urlString || typeof urlString !== 'string') return '';
        const u = new URL(urlString);
        ['token', 'code', 'invite'].forEach((p) => u.searchParams.delete(p));
        return u.origin + u.pathname;
      } catch {
        return String(urlString || '').split('?')[0] || '';
      }
    };

    const sanitizeDetails = (d) => {
      if (!d || typeof d !== 'object') return {};
      const sanitized = {};
      const sensitiveKeys = new Set(['password', 'token', 'secret', 'authorization', 'cookie']);
      for (const [k, v] of Object.entries(d)) {
        if (sensitiveKeys.has(String(k).toLowerCase())) {
          sanitized[k] = '[REDACTED]';
        } else {
          sanitized[k] = v;
        }
      }
      return sanitized;
    };

    const safeDetails = sanitizeDetails(details || {});
    const rawUserEmail = currentUser?.email || safeDetails.email;
    const userEmailRedacted = redactEmail(rawUserEmail);
    if (safeDetails.email) {
      safeDetails.email = userEmailRedacted;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      user_id: currentUser?.id || null,
      company_id: currentCompany?.id || null,
      company_code: currentCompany?.company_code || null,
      company_slug: currentCompany?.company_slug || null,
      user_email: userEmailRedacted,
      user_role: currentUser?.role || null,
      ...safeDetails,
      severity: safeDetails.severity || (eventType.includes('failed') || eventType.includes('denied') || eventType.includes('suspicious') ? 'warning' : 'info'),
      user_agent: typeof navigator !== 'undefined' ? (navigator.userAgent || '').slice(0, 256) : '',
      url: typeof window !== 'undefined' ? sanitizeURL(window.location.href) : ''
    };

    let existingLogs = [];
    try {
      existingLogs = secureStorage.getItem('nm_security_logs') || [];
      if (!Array.isArray(existingLogs)) existingLogs = [];
    } catch (parseErr) {
      console.warn('Failed to parse security logs, resetting:', parseErr);
      existingLogs = [];
      try { secureStorage.removeItem('nm_security_logs'); } catch {}
    }

    existingLogs.push(logEntry);
    if (existingLogs.length > 100) {
      existingLogs = existingLogs.slice(existingLogs.length - 100);
    }

    try {
      secureStorage.setItem('nm_security_logs', existingLogs);
    } catch (storageErr) {
      console.warn('Failed to save security logs:', storageErr);
    }

  } catch (err) {
    try { console.error('Failed to log security event:', err); } catch {}
  }
}

// Get current tenant ID from authenticated session
export function getCurrentTenantId() {
  const currentUser = secureStorage.getItem('nm_user_data');
  const currentCompany = secureStorage.getItem('nm_current_company');
  
  return currentCompany?.id || currentUser?.tenant_id;
}

// Get current company code from authenticated session
export function getCurrentCompanyCode() {
  const currentUser = secureStorage.getItem('nm_user_data');
  const currentCompany = secureStorage.getItem('nm_current_company');
  
  return currentCompany?.company_code || currentUser?.company_code;
}

// Validate tenant before API request
export function validateTenantAccess() {
  const tenantId = getCurrentTenantId();
  const companyCode = getCurrentCompanyCode();

  if (!tenantId || !companyCode) {
    logSecurityEvent('tenant_validation_failed', {
      reason: 'Missing tenant information'
    });
    return false;
  }

  return true;
}

// Enhanced Supabase query with tenant filtering
export function createSecureQuery(table, { columns = '*', requireTenant = false } = {}) {
  const tenantId = getCurrentTenantId();
  const companyCode = getCurrentCompanyCode();

  if (!tenantId || !companyCode) {
    logSecurityEvent('unauthorized_query_attempt', {
      table,
      reason: 'Missing tenant information'
    });
    throw new Error('Unauthorized: Missing tenant information');
  }

  let query = supabase.from(table).select(columns).eq('company_code', companyCode);
  if (requireTenant) {
    query = query.eq('tenant_id', tenantId);
  }
  return query;
}

// Enhanced Supabase query with custom tenant column
export function createSecureQueryWithColumn(table, tenantColumn = 'company_code', { columns = '*' } = {}) {
  const tenantId = getCurrentTenantId();
  const companyCode = getCurrentCompanyCode();

  if (!tenantId || !companyCode) {
    logSecurityEvent('unauthorized_query_attempt', {
      table,
      tenant_column: tenantColumn,
      reason: 'Missing tenant information'
    });
    throw new Error('Unauthorized: Missing tenant information');
  }

  const filterValue = (tenantColumn === 'tenant_id') ? tenantId : companyCode;
  return supabase
    .from(table)
    .select(columns)
    .eq(tenantColumn, filterValue);
}

// Validate Supabase session before request
export async function validateSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      logSecurityEvent('session_validation_failed', {
        reason: error?.message || 'No session'
      });
      return false;
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      logSecurityEvent('session_expired', {
        expires_at: session.expires_at,
        current_time: now
      });
      return false;
    }
    
    return true;
  } catch (err) {
    logSecurityEvent('session_validation_error', {
      error: err.message
    });
    return false;
  }
}

// Security error handler
export function handleSecurityError(error, context = {}) {
  const safeError = (error && typeof error === 'object') ? error : (new Error(String(error || 'Unknown error')));
  logSecurityEvent('security_error', {
    error_message: safeError.message,
    error_code: safeError.code || null,
    ...context
  });

  const userMessage = getSafeErrorMessage(safeError);
  return {
    message: userMessage,
    shouldLogout: shouldForceLogout(safeError)
  };
}

// Get safe error message (don't expose sensitive info)
function getSafeErrorMessage(error) {
  const errMsg = String(error?.message || '').toLowerCase();
  const errCode = String(error?.code || '').toLowerCase();

  const errorMap = [
    { keys: ['pgrst116'], message: 'Record not found' },
    { keys: ['pgrst301'], message: 'Unauthorized access' },
    { keys: ['pgrst302'], message: 'Permission denied' },
    { keys: ['jwt expired', 'jwt_expired'], message: 'Your session has expired. Please login again.' },
    { keys: ['invalid jwt'], message: 'Invalid authentication. Please login again.' },
    { keys: ['401', 'unauthorized'], message: 'Authentication required' },
    { keys: ['403', 'forbidden'], message: 'Access denied' },
    { keys: ['404', 'not_found'], message: 'Resource not found' }
  ];

  for (const entry of errorMap) {
    for (const key of entry.keys) {
      if (errMsg.includes(key) || errCode.includes(key)) {
        return entry.message;
      }
    }
  }
  return 'An error occurred. Please try again.';
}

// Determine if error should force logout
function shouldForceLogout(error) {
  const errMsg = String(error?.message || '').toLowerCase();
  const errCode = String(error?.code || '').toLowerCase();
  const forceLogoutKeys = ['jwt expired', 'jwt_expired', 'invalid jwt', '401', 'unauthorized', 'pgrst301'];
  return forceLogoutKeys.some((key) => errMsg.includes(key) || errCode === key);
}

// Check if user has specific permission
export function hasPermission(permission) {
  const currentUser = secureStorage.getItem('nm_user_data');
  if (!currentUser) return false;

  const role = String(currentUser.role || 'viewer').toLowerCase();
  const requestedPermission = String(permission || '').toLowerCase();

  const ROLE_PERMISSIONS = {
    'super_admin': ['*'],
    'admin': ['dashboard', 'inventory', 'purchase', 'reports', 'settings', 'pos', 'finance', 'customers', 'analytics', 'orders', 'suppliers', 'categories', 'brands', 'subcategories'],
    'manager': ['dashboard', 'inventory', 'purchase', 'pos', 'customers', 'orders', 'suppliers'],
    'cashier': ['pos'],
    'viewer': ['dashboard', 'reports', 'analytics']
  };

  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['viewer'];
  return permissions.includes('*') || permissions.includes(requestedPermission);
}

// Security check for API requests
export async function performSecurityCheck() {
  const sessionValid = await validateSession();
  const tenantValid = validateTenantAccess();
  
  if (!sessionValid) {
    return {
      valid: false,
      reason: 'session_invalid',
      action: 'logout'
    };
  }
  
  if (!tenantValid) {
    return {
      valid: false,
      reason: 'tenant_invalid',
      action: 'logout'
    };
  }
  
  return {
    valid: true,
    reason: 'all_checks_passed'
  };
}

// Get security logs for debugging
export function getSecurityLogs() {
  try {
    const logs = secureStorage.getItem('nm_security_logs');
    return Array.isArray(logs) ? logs : [];
  } catch (err) {
    console.error('Failed to get security logs:', err);
    try { secureStorage.removeItem('nm_security_logs'); } catch {}
    return [];
  }
}

// Clear security logs
export function clearSecurityLogs() {
  try {
    secureStorage.removeItem('nm_security_logs');
  } catch {}
}

// Monitor for suspicious activity
export function detectSuspiciousActivity() {
  try {
    const logs = getSecurityLogs();
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const failedLoginTypes = new Set([
      'login_failed', 'disabled_user_login_attempt', 'suspended_company_login_attempt',
      'wrong_tenant_login_attempt', 'login_fallback'
    ]);
    const unauthorizedTypes = new Set([
      'unauthorized_query_attempt', 'tenant_validation_failed',
      'session_validation_failed', 'session_expired', 'auth_init_error'
    ]);

    const failedLogins = logs.filter((log) => {
      try {
        const ts = new Date(log.timestamp).getTime();
        return failedLoginTypes.has(log.event_type) && ts > fiveMinutesAgo && ts <= now;
      } catch { return false; }
    }).length;

    const unauthorizedAttempts = logs.filter((log) => {
      try {
        const ts = new Date(log.timestamp).getTime();
        return unauthorizedTypes.has(log.event_type) && ts > fiveMinutesAgo && ts <= now;
      } catch { return false; }
    }).length;

    if (failedLogins >= 5 || unauthorizedAttempts >= 3) {
      try {
        logSecurityEvent('suspicious_activity_detected', {
          failed_logins: failedLogins,
          unauthorized_attempts: unauthorizedAttempts
        });
      } catch {}

      return {
        suspicious: true,
        reason: failedLogins >= 5 ? 'too_many_failed_logins' : 'too_many_unauthorized_attempts'
      };
    }

    return { suspicious: false };
  } catch (err) {
    console.error('detectSuspiciousActivity failed:', err);
    return { suspicious: false };
  }
}
