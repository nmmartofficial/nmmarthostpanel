import { supabase } from '../supabase';
import { secureStorage, safeJsonParse } from './security';

/**
 * NM MART - Enterprise Security Helper
 * Provides tenant validation, API security, and audit logging
 */

// Security audit logging
export function logSecurityEvent(eventType, details = {}) {
  try {
    // Use try/catch around everything to ensure this NEVER throws
    let currentUser = null;
    let currentCompany = null;
    try {
      currentUser = secureStorage.getItem('nm_user_data');
      currentCompany = secureStorage.getItem('nm_current_company');
    } catch (storageErr) {
      console.warn('Failed to get user/company for security log:', storageErr);
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      user_id: currentUser?.id,
      company_id: currentCompany?.id,
      company_code: currentCompany?.company_code,
      company_slug: currentCompany?.company_slug,
      user_email: currentUser?.email,
      user_role: currentUser?.role,
      ...details,
      severity: details.severity || (eventType.includes('failed') || eventType.includes('denied') || eventType.includes('suspicious') ? 'warning' : 'info'),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      url: typeof window !== 'undefined' ? window.location.href : ''
    };
    
    let existingLogs = [];
    try {
      const rawLogs = localStorage.getItem('nm_security_logs');
      existingLogs = safeJsonParse(rawLogs, []);
      if (!Array.isArray(existingLogs)) existingLogs = [];
    } catch (parseErr) {
      console.warn('Failed to parse security logs, resetting:', parseErr);
      existingLogs = [];
      try { localStorage.removeItem('nm_security_logs'); } catch {}
    }
    
    existingLogs.push(logEntry);
    
    if (existingLogs.length > 100) {
      existingLogs = existingLogs.slice(existingLogs.length - 100);
    }
    
    try {
      localStorage.setItem('nm_security_logs', JSON.stringify(existingLogs));
    } catch (storageErr) {
      console.warn('Failed to save security logs:', storageErr);
    }
    
  } catch (err) {
    console.error('Failed to log security event:', err);
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
export function createSecureQuery(table) {
  const tenantId = getCurrentTenantId();
  const companyCode = getCurrentCompanyCode();
  
  if (!tenantId || !companyCode) {
    logSecurityEvent('unauthorized_query_attempt', {
      table,
      reason: 'Missing tenant information'
    });
    throw new Error('Unauthorized: Missing tenant information');
  }
  
  // Return Supabase query with tenant filter
  return supabase
    .from(table)
    .select('*')
    .eq('company_code', companyCode);
}

// Enhanced Supabase query with custom tenant column
export function createSecureQueryWithColumn(table, tenantColumn = 'company_code') {
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
  
  return supabase
    .from(table)
    .select('*')
    .eq(tenantColumn, companyCode);
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
  logSecurityEvent('security_error', {
    error_message: error.message,
    error_code: error.code,
    ...context
  });
  
  // Don't expose sensitive error details to user
  const userMessage = getSafeErrorMessage(error);
  
  return {
    message: userMessage,
    shouldLogout: shouldForceLogout(error)
  };
}

// Get safe error message (don't expose sensitive info)
function getSafeErrorMessage(error) {
  const errorMessages = {
    'PGRST116': 'Record not found',
    'PGRST301': 'Unauthorized access',
    'PGRST302': 'Permission denied',
    'JWT expired': 'Your session has expired. Please login again.',
    'Invalid JWT': 'Invalid authentication. Please login again.',
    '401': 'Authentication required',
    '403': 'Access denied',
    '404': 'Resource not found'
  };
  
  return errorMessages[error.message] || errorMessages[error.code] || 'An error occurred. Please try again.';
}

// Determine if error should force logout
function shouldForceLogout(error) {
  const forceLogoutErrors = [
    'JWT expired',
    'Invalid JWT',
    '401',
    'PGRST301'
  ];
  
  return forceLogoutErrors.some(err => 
    error.message?.includes(err) || error.code === err
  );
}

// Check if user has specific permission
export function hasPermission(permission) {
  const currentUser = secureStorage.getItem('nm_user_data');
  if (!currentUser) return false;
  
  const role = currentUser.role || 'viewer';
  
  const ROLE_PERMISSIONS = {
    'super_admin': ['*'],
    'admin': ['dashboard', 'inventory', 'purchase', 'reports', 'settings', 'pos', 'finance', 'customers', 'analytics', 'orders', 'suppliers', 'categories', 'brands', 'subcategories'],
    'manager': ['dashboard', 'inventory', 'purchase', 'pos', 'customers', 'orders', 'suppliers'],
    'cashier': ['pos'],
    'viewer': ['dashboard', 'reports', 'analytics']
  };
  
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['viewer'];
  
  return permissions.includes('*') || permissions.includes(permission);
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
    const rawLogs = localStorage.getItem('nm_security_logs');
    const logs = safeJsonParse(rawLogs, []);
    return Array.isArray(logs) ? logs : [];
  } catch (err) {
    console.error('Failed to get security logs:', err);
    try { localStorage.removeItem('nm_security_logs'); } catch {}
    return [];
  }
}

// Clear security logs
export function clearSecurityLogs() {
  try {
    localStorage.removeItem('nm_security_logs');
  } catch {}
}

// Monitor for suspicious activity
export function detectSuspiciousActivity() {
  try {
    const logs = getSecurityLogs();
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    const failedLogins = logs.filter(log => {
      try {
        return log.event_type === 'login_failed' && 
          new Date(log.timestamp).getTime() > fiveMinutesAgo;
      } catch { return false; }
    }).length;
    
    const unauthorizedAttempts = logs.filter(log => {
      try {
        return (log.event_type === 'unauthorized_tenant_access' || 
          log.event_type === 'permission_denied') && 
          new Date(log.timestamp).getTime() > fiveMinutesAgo;
      } catch { return false; }
    }).length;
    
    if (failedLogins > 5 || unauthorizedAttempts > 3) {
      try {
        logSecurityEvent('suspicious_activity_detected', {
          failed_logins: failedLogins,
          unauthorized_attempts: unauthorizedAttempts
        });
      } catch {}
      
      return {
        suspicious: true,
        reason: failedLogins > 5 ? 'too_many_failed_logins' : 'too_many_unauthorized_attempts'
      };
    }
    
    return {
      suspicious: false
    };
  } catch (err) {
    console.error('detectSuspiciousActivity failed:', err);
    return { suspicious: false };
  }
}
