import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, isSupabaseMock } from '../supabase';
import { DB_SCHEMA } from '../dbSchema';
import { secureStorage } from '../utils/security';
import { getDemoAuthResult } from '../utils/authFallback';
import { withRetry } from '../utils/retry';
import { 
  logSecurityEvent, 
  validateSession, 
  getCurrentTenantId, 
  getCurrentCompanyCode,
  handleSecurityError,
  detectSuspiciousActivity
} from '../utils/securityHelper';
import { normalizeAdminUserProfile, buildFallbackAdminProfile, getAdminUserLookupValue } from '../utils/adminUser';

const AuthContext = createContext();
const SUPABASE_NETWORK_TIMEOUT_MS = Number(import.meta.env.VITE_SUPABASE_TIMEOUT_MS || 15000);

const withTimeout = async (promise, timeoutMs = SUPABASE_NETWORK_TIMEOUT_MS, fallback = null) => {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [session, setSession] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionExpiryWarning, setSessionExpiryWarning] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const hasHydratedSessionRef = useRef(false);
  const currentUserRef = useRef(currentUser);
  const currentCompanyRef = useRef(currentCompany);
  const sessionRef = useRef(session);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const performLogoutRef = useRef(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    currentCompanyRef.current = currentCompany;
  }, [currentCompany]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Multi-tab synchronization using storage events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'nm_logout_event' && e.newValue === 'true') {
        performLogoutRef.current?.();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const clearAuthState = useCallback(() => {
    setCurrentUser(null);
    setCurrentCompany(null);
    setSession(null);
    setTenant(null);
    setIsAuthenticated(false);
    setSessionExpiryWarning(false);
    setSessionExpired(false);
    try {
      secureStorage.removeItem('nm_user_data');
      secureStorage.removeItem('nm_current_company');
      secureStorage.removeItem('nm_admin_auth');
      secureStorage.removeItem('nm_auth_session');
      secureStorage.removeItem('nm_remembered_email');
      localStorage.removeItem('nm_logout_event');
    } catch {}
  }, []);

  const restoreStoredAuthState = useCallback(() => {
    try {
      const storedSession = secureStorage.getItem('nm_auth_session');
      const storedUser = secureStorage.getItem('nm_user_data');
      const storedCompany = secureStorage.getItem('nm_current_company');

      if (storedSession && storedUser) {
        setSession(storedSession);
        setCurrentUser(storedUser);
        setCurrentCompany(storedCompany || null);
        setTenant(storedCompany || null);
        setIsAuthenticated(true);
        setSessionExpired(false);
        setSessionExpiryWarning(false);
        return true;
      }
    } catch {}

    return false;
  }, []);

  const hydrateAuthState = useCallback(async (supabaseSession) => {
    if (!supabaseSession?.user) {
      clearAuthState();
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (supabaseSession.expires_at && supabaseSession.expires_at < now) {
      await supabase.auth.signOut().catch(() => {});
      clearAuthState();
      setSessionExpired(true);
      return null;
    }

    setSession(supabaseSession);
    setIsAuthenticated(true);
    setSessionExpired(false);
    setSessionExpiryWarning(false);

    try {
      const lookupValue = getAdminUserLookupValue(supabaseSession.user.email);
      const { data: userData, error: userError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', lookupValue)
        .single();

      const normalizedUser = (userData && !userError)
        ? normalizeAdminUserProfile(userData, supabaseSession.user.email)
        : buildFallbackAdminProfile(supabaseSession.user, supabaseSession.user.email);

      if (!normalizedUser) {
        clearAuthState();
        return null;
      }
      if (normalizedUser.status === 'disabled') {
        await supabase.auth.signOut().catch(() => {});
        clearAuthState();
        setSessionExpired(true);
        return null;
      }

      setCurrentUser(userData);

      let companyData = null;
      if (userData && userData.company_code) {
        const { data: companyResult, error: companyError } = await supabase
          .from(DB_SCHEMA.COMPANIES.table)
          .select('*')
          .eq('company_code', userData.company_code)
          .single();

        if (!companyError && companyResult) {
          if (companyResult.status === 'suspended') {
            await supabase.auth.signOut().catch(() => {});
            clearAuthState();
            setSessionExpired(true);
            return null;
          }

          companyData = companyResult;
          setCurrentCompany(companyResult);
          setTenant(companyResult);
          try {
            secureStorage.setItem('nm_current_company', companyResult);
          } catch {}
        }
      } else {
        setCurrentCompany(null);
        setTenant(null);
      }

      try {
        secureStorage.setItem('nm_user_data', {
          id: normalizedUser.id,
          email: normalizedUser.email,
          name: normalizedUser.name,
          role: normalizedUser.role,
          company_code: normalizedUser.company_code,
          tenant_id: companyData?.id
        });
      } catch {}

      return { userData, companyData };
    } catch (err) {
      if (import.meta.env.DEV) console.error('hydrateAuthState error:', err);
      clearAuthState();
      return null;
    }
  }, [clearAuthState]);

  // Check for existing session on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (isSupabaseMock) {
        hasHydratedSessionRef.current = true;
        if (isMounted) {
          setAuthLoading(false);
        }
        return;
      }

      try {
        const restoredFromStorage = restoreStoredAuthState();
        if (restoredFromStorage) {
          hasHydratedSessionRef.current = true;
          if (isMounted) {
            setAuthLoading(false);
          }
          return;
        }

        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => resolve({ data: { session: null }, error: null }), 2500);
        });

        try {
          logSecurityEvent('login_attempt', {
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          if (import.meta.env.DEV) console.error('initAuth: logSecurityEvent failed', e);
        }

        let suspicious = { suspicious: false };
        try {
          suspicious = detectSuspiciousActivity();
          if (suspicious.suspicious) {
            try {
              logSecurityEvent('suspicious_activity_prevented', {
                reason: suspicious.reason
              });
            } catch {}
          }
        } catch (e) {
          if (import.meta.env.DEV) console.error('initAuth: detectSuspiciousActivity failed', e);
        }

        const { data: { session: restoredSession }, error: sessionError } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]).catch(() => ({ data: { session: null }, error: null }));

        if (!isMounted) return;

        hasHydratedSessionRef.current = true;

        if (sessionError) {
          if (import.meta.env.DEV) console.warn('initAuth: session lookup returned an error', sessionError);
          clearAuthState();
        } else if (restoredSession) {
          await hydrateAuthState(restoredSession);
        } else {
          clearAuthState();
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('initAuth: top level error:', err);
        try {
          logSecurityEvent('auth_init_error', {
            error: err.message
          });
        } catch {}
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, authSession) => {
        if (!isMounted) return;

        if (event === 'INITIAL_SESSION') {
          hasHydratedSessionRef.current = true;
          // Only clear auth state if we don't already have a valid session from storage
          if (authSession) {
            await hydrateAuthState(authSession);
          } else if (!isAuthenticatedRef.current && !sessionRef.current && !currentUserRef.current) {
            // Only clear if no session was restored from storage
            clearAuthState();
          }
          setAuthLoading(false);
          return;
        }

        if (event === 'SIGNED_IN') {
          await hydrateAuthState(authSession);
          setAuthLoading(false);
          return;
        }

        if (event === 'USER_UPDATED') {
          if (authSession) {
            await hydrateAuthState(authSession);
          }
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          if (authSession) {
            setSession(authSession);
            setSessionExpiryWarning(false);
            setSessionExpired(false);
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
          const hasPersistentSession = !!secureStorage.getItem('nm_auth_session');
          if (!hasPersistentSession && hasHydratedSessionRef.current && (sessionRef.current || currentUserRef.current || isAuthenticatedRef.current)) {
            clearAuthState();
          }
          setAuthLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearAuthState, hydrateAuthState]);

  // Session expiry check
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSessionExpiry = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        
        // Show warning 5 minutes before expiry
        if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
          setSessionExpiryWarning(true);
        }
        
        // Auto logout if expired
        if (timeUntilExpiry <= 0) {
          await logout();
          setSessionExpired(true);
        }
      }
    };

    const interval = setInterval(checkSessionExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Login function with proper Supabase Auth
  const login = useCallback(async (email, password, rememberMe = false, options = {}) => {
    setAuthLoading(true);
    setSessionExpired(false);
    try {
      // Log login attempt
      logSecurityEvent('login_attempt', {
        email: email,
        remember_me: rememberMe,
        expected_company: options.expectedCompanySlug
      });

      const demoResult = getDemoAuthResult(email, password);

      let authSession = null;
      let userData = null;
      let company = null;

      if (demoResult) {
        authSession = demoResult.authSession;
        userData = demoResult.userData;
        company = demoResult.companyData;
      } else {
        // Sign in with Supabase Auth
        const authResult = await withRetry(
          () => withTimeout(
            supabase.auth.signInWithPassword({
              email,
              password
            }),
            SUPABASE_NETWORK_TIMEOUT_MS,
            { data: null, error: { message: 'Login request is taking longer than expected. Please check your internet connection or try again in a moment.' } }
          ),
          {
            retries: 1,
            delayMs: 300,
            shouldRetry: (error) => !String(error?.message || '').includes('Invalid login credentials')
          }
        );
        const { data: authData, error: authError } = authResult || {};

        if (authError) {
          logSecurityEvent('login_failed', {
            email: email,
            reason: authError.message
          });
          throw new Error(authError.message);
        }

        authSession = authData?.session ?? null;
        if (authSession) {
          setSession(authSession);
        }

        // Get user profile from custom table
        const lookupValue = getAdminUserLookupValue(email);
        const userResult = await withRetry(
          () => withTimeout(
            supabase
              .from('admin_users')
              .select('*')
              .eq('username', lookupValue)
              .single(),
            SUPABASE_NETWORK_TIMEOUT_MS,
            { data: null, error: { message: 'Unable to load your account profile. Please try again.' } }
          ),
          {
            retries: 1,
            delayMs: 300,
            shouldRetry: (error) => !String(error?.message || '').includes('User profile not found')
          }
        );
        const { data: fetchedUserData, error: userError } = userResult || {};

        if (userError || !fetchedUserData) {
          userData = buildFallbackAdminProfile(authSession?.user || { email }, email);
          logSecurityEvent('login_failed', {
            email: email,
            reason: 'Using fallback profile because admin_users lookup failed'
          });
        } else {
          userData = normalizeAdminUserProfile(fetchedUserData, email);
        }

        // Check if user is disabled
        if (userData.status === 'disabled') {
          await supabase.auth.signOut();
          logSecurityEvent('disabled_user_login_attempt', {
            user_id: userData.id,
            email: email
          });
          throw new Error('Your account has been disabled. Please contact administrator.');
        }

        // Handle company detection
        if (userData.company_code) {
          const companyResult = await withRetry(
            () => withTimeout(
              supabase
                .from(DB_SCHEMA.COMPANIES.table)
                .select('*')
                .eq('company_code', userData.company_code)
                .single(),
              SUPABASE_NETWORK_TIMEOUT_MS,
              { data: null, error: { message: 'Unable to load company details.' } }
            ),
            {
              retries: 1,
              delayMs: 300,
              shouldRetry: (error) => true
            }
          );
          const { data: companyData, error: companyError } = companyResult || {};
          
          if (!companyError && companyData) {
            // Check if company is suspended
            if (companyData.status === 'suspended') {
              await supabase.auth.signOut();
              logSecurityEvent('suspended_company_login_attempt', {
                user_id: userData.id,
                company_id: companyData.id,
                company_code: companyData.company_code
              });
              throw new Error('Your company account has been suspended. Please contact administrator.');
            }
            company = companyData;
          }
        }
      }

      if (options.expectedCompanySlug) {
        if (!company) {
          logSecurityEvent('login_failed', {
            email: email,
            reason: 'Account not linked to any company'
          });
          throw new Error('Account not linked to any company');
        }

        if (company.company_slug !== options.expectedCompanySlug) {
          logSecurityEvent('wrong_tenant_login_attempt', {
            email: email,
            expected_slug: options.expectedCompanySlug,
            actual_slug: company.company_slug
          });
          throw new Error('You are not authorized to access this company workspace');
        }
      }

      // Store minimal session data in secure storage
      secureStorage.setItem('nm_user_data', {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        company_code: userData.company_code,
        tenant_id: company?.id,
        status: userData.status
      });

      secureStorage.setItem('nm_auth_session', {
        access_token: authSession?.access_token || null,
        expires_at: authSession?.expires_at || Math.floor(Date.now() / 1000) + 3600,
        refresh_token: authSession?.refresh_token || null,
        user: authSession?.user || {
          id: userData.id,
          email: userData.email
        },
        provider: demoResult ? 'demo' : 'supabase'
      });
      
      if (company) {
        secureStorage.setItem('nm_current_company', company);
      }
      
      if (rememberMe) {
        secureStorage.setItem('nm_remembered_email', email);
        // Supabase automatically handles persistent sessions when Remember Me is enabled
      } else {
        secureStorage.removeItem('nm_remembered_email');
      }

      setCurrentUser(userData);
      setCurrentCompany(company);
      setTenant(company);
      setSession(authSession);
      setIsAuthenticated(true);
      setSessionExpiryWarning(false);

      // Log successful login
      logSecurityEvent('login_success', {
        user_id: userData.id,
        email: email,
        role: userData.role,
        company_id: company?.id,
        company_slug: company?.company_slug
      });

      return { success: true, company };
    } catch (err) {
      if (import.meta.env.DEV) console.error('Login error:', err);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Internal logout function
  const performLogout = useCallback(async () => {
    try {
      // Log logout event
      logSecurityEvent('logout', {
        user_id: currentUser?.id,
        email: currentUser?.email,
        company_id: currentCompany?.id
      });

      await supabase.auth.signOut();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Supabase logout error:', err);
      try {
        logSecurityEvent('logout_error', {
          error: err.message
        });
      } catch {}
    }

    // Clear all storage
    try {
      secureStorage.removeItem('nm_user_data');
      secureStorage.removeItem('nm_current_company');
      secureStorage.removeItem('nm_admin_auth');
      secureStorage.removeItem('nm_auth_session');
      secureStorage.removeItem('nm_remembered_email');
    } catch {}

    setCurrentUser(null);
    setCurrentCompany(null);
    setSession(null);
    setTenant(null);
    setIsAuthenticated(false);
    setSessionExpiryWarning(false);
  }, [currentUser, currentCompany]);

  useEffect(() => {
    performLogoutRef.current = performLogout;
  }, [performLogout]);

  // Logout function
  const logout = useCallback(async (companySlug = null) => {
    // Trigger logout event for other tabs
    try {
      localStorage.setItem('nm_logout_event', 'true');
      setTimeout(() => localStorage.removeItem('nm_logout_event'), 100);
    } catch {}

    await performLogout();

    // Redirect to appropriate page
    if (companySlug) {
      window.location.href = `/${companySlug}/login`;
    } else {
      window.location.href = '/nm-mart';
    }
  }, [performLogout]);

  // Function to set company (for super admin switching)
  const setCompany = useCallback((company) => {
    setCurrentCompany(company);
    if (company) {
      try { secureStorage.setItem('nm_current_company', company); } catch {}
    } else {
      try { secureStorage.removeItem('nm_current_company'); } catch {}
    }
  }, []);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      if (data?.session) {
        setSession(data.session);
      }
      setSessionExpiryWarning(false);
      setSessionExpired(false);
      return { success: true };
    } catch (err) {
      if (import.meta.env.DEV) console.error('Session refresh error:', err);
      // If refresh fails, logout
      await logout();
      setSessionExpired(true);
      return { success: false, error: err.message };
    }
  }, [logout]);

  // Forgot password function with Supabase
  const forgotPassword = useCallback(async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (err) {
      if (import.meta.env.DEV) console.error('Forgot password error:', err);
      throw err;
    }
  }, []);

  const value = useMemo(() => ({
    currentUser,
    currentCompany,
    session,
    tenant,
    isAuthenticated,
    authLoading,
    sessionExpiryWarning,
    sessionExpired,
    login,
    logout,
    setCompany,
    refreshSession,
    forgotPassword,
    setCurrentUser,
    setSessionExpiryWarning
  }), [
    currentUser,
    currentCompany,
    session,
    tenant,
    isAuthenticated,
    authLoading,
    sessionExpiryWarning,
    sessionExpired,
    login,
    logout,
    setCompany,
    refreshSession,
    forgotPassword
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
