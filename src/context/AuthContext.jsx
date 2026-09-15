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
const DEFAULT_COMPANY_SLUG = 'nm-mart';

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
  const refreshSession = useCallback(async () => {
    try {
      const storedAuth = secureStorage.getItem('nm_auth_session');
      const provider = sessionRef.current?.provider || storedAuth?.provider;
      const isSynthetic = provider === 'admin_table_fallback' || provider === 'demo' || String(sessionRef.current?.access_token || storedAuth?.access_token || '').startsWith('fb_');
      if (isSynthetic) {
        const newExpiresAt = Math.floor(Date.now() / 1000) + (3600 * 8);
        const updatedSession = { ...(sessionRef.current || storedAuth || {}), expires_at: newExpiresAt, expires_in: 3600 * 8 };
        setSession(updatedSession);
        try { secureStorage.setItem('nm_auth_session', { ...(storedAuth || {}), access_token: updatedSession.access_token, expires_at: newExpiresAt }); } catch (e) {}
        return updatedSession;
      }
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      setSession(data.session);
      return data.session;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);
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
        const now = Math.floor(Date.now() / 1000);
        const isSyntheticSession = storedSession?.provider === 'admin_table_fallback' || storedSession?.provider === 'demo' || String(storedSession?.access_token || '').startsWith('fb_');
        if (storedSession.expires_at && storedSession.expires_at < now && !isSyntheticSession) {
          try {
            logSecurityEvent('stored_session_expired', {
              user_id: storedUser.id,
              email: storedUser.email
            });
          } catch {}
          return false;
        }

        if (!storedUser.id || !storedUser.email) {
          return false;
        }

        setSession(storedSession);
        setCurrentUser(storedUser);
        setCurrentCompany(storedCompany || null);
        setTenant(storedCompany || null);
        setIsAuthenticated(true);
          try {
            if (typeof isAuthenticatedRef !== 'undefined') isAuthenticatedRef.current = true;
            if (typeof sessionRef !== 'undefined') sessionRef.current = storedSession;
            if (typeof currentUserRef !== 'undefined') currentUserRef.current = storedUser;
            if (typeof currentCompanyRef !== 'undefined') currentCompanyRef.current = storedCompany || null;
          } catch (refErr) {}
        setSessionExpired(false);
        setSessionExpiryWarning(false);
        return true;
      }
    } catch {}

    return false;
  }, []);

  const hydrateAuthState = useCallback(async (supabaseSession) => {
    const localAuth = secureStorage.getItem('nm_auth_session');
      const isLocalSynthetic = localAuth?.provider === 'admin_table_fallback' || String(localAuth?.access_token || '').startsWith('fb_');
      if (!supabaseSession?.user) {
        if (isLocalSynthetic) {
          return null; // Don't wipe fallback admin login on refresh
        }
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
          try {
            if (typeof isAuthenticatedRef !== 'undefined') isAuthenticatedRef.current = true;
            if (typeof sessionRef !== 'undefined') sessionRef.current = storedSession;
            if (typeof currentUserRef !== 'undefined') currentUserRef.current = storedUser;
            if (typeof currentCompanyRef !== 'undefined') currentCompanyRef.current = storedCompany || null;
          } catch (refErr) {}
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

      setCurrentUser(normalizedUser);

      let companyData = null;
      if (userData && userData.company_code) {
        const { data: companiesList, error: companyError } = await supabase
          .from(DB_SCHEMA.COMPANIES.table)
            .select('*')
            .eq('company_code', userData.company_code)
            .limit(1);

        let companyResult = companiesList?.[0] ?? null;

          if (!companyResult) {
            companyResult = {
              id: 'comp_nm_mart_01',
              name: 'NM MART',
              company_code: userData.company_code || 'NMM001',
              company_slug: 'nm-mart',
              status: 'active'
            };
          }

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
          } else {
              const localUser = secureStorage.getItem('nm_user_data');
              const localSession = secureStorage.getItem('nm_auth_session');
              if (!localUser && !localSession) {
                clearAuthState();
              }
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
            const localSession = secureStorage.getItem('nm_auth_session');
            if (localSession?.provider === 'admin_table_fallback' || String(localSession?.access_token || '').startsWith('fb_')) {
              return; // Do not clear fallback session on Supabase SIGNED_OUT
            }
          const storedAuth = secureStorage.getItem('nm_auth_session');
          const hasPersistentSession = !!storedAuth;
          const provider = storedAuth?.provider || sessionRef.current?.provider;
          const isSyntheticSession = provider === 'admin_table_fallback' || provider === 'demo';
          if (isSyntheticSession && hasPersistentSession) {
            setAuthLoading(false);
            return;
          }
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
      let localSession = sessionRef.current;
      const storedAuth = secureStorage.getItem('nm_auth_session');
      const provider = localSession?.provider || storedAuth?.provider;
      const isSynthetic = provider === 'admin_table_fallback' || provider === 'demo' ||
                         String(localSession?.access_token || storedAuth?.access_token || '').startsWith('fb_');

      if (isSynthetic) {
        const expiresAt = localSession?.expires_at || storedAuth?.expires_at;
        if (!expiresAt) return;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
          setSessionExpiryWarning(true);
        }
        if (timeUntilExpiry <= 0) {
          try {
            await refreshSession();
          } catch {}
          const refreshedStored = secureStorage.getItem('nm_auth_session');
          const refreshedExpiry = sessionRef.current?.expires_at || refreshedStored?.expires_at;
          const nowCheck = Math.floor(Date.now() / 1000);
          if (!refreshedExpiry || nowCheck > refreshedExpiry + 30) {
            await performLogoutRef.current?.();
            setSessionExpired(true);
          }
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        
        if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
          setSessionExpiryWarning(true);
        }
        
        if (timeUntilExpiry <= 0) {
          await performLogoutRef.current?.();
          setSessionExpired(true);
        }
      }
    };

    const interval = setInterval(checkSessionExpiry, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshSession]);

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
        let usedFallbackAuth = false;
        let fetchedFromAdminTable = null;

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
        let { data: authData, error: authError } = authResult || {};

        if (!authData?.session && (authError || !authData?.user)) {
          logSecurityEvent('login_fallback', {
            email: email,
            reason: authError?.message || 'Supabase Auth session missing, trying admin_users table'
          });

          const fallbackResult = await withRetry(
            () => withTimeout(
              supabase.rpc('verify_admin_password', {
                p_username_or_email: email,
                p_password: password
              }),
              SUPABASE_NETWORK_TIMEOUT_MS,
              { data: null, error: { message: 'Unable to verify credentials. Please try again.' } }
            ),
            { retries: 1, delayMs: 200, shouldRetry: () => false }
          );

          const fbData = fallbackResult?.data;
          const fbError = fallbackResult?.error;

          if (!fbError && fbData && fbData.verified === true && fbData.profile) {
            usedFallbackAuth = true;
            fetchedFromAdminTable = fbData.profile;

            const syntheticUser = {
              id: String(fbData.profile.id || 'fallback-user'),
              email: email,
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString()
            };

            authData = {
              user: syntheticUser,
              session: {
                access_token: 'fb_' + (globalThis.crypto?.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join('')).slice(0, 40),
                token_type: 'bearer',
                expires_in: 3600 * 8,
                expires_at: Math.floor((Date.now() + 3600 * 8 * 1000) / 1000),
                refresh_token: 'fb_ref_' + (globalThis.crypto?.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2,'0')).join('')).slice(0, 40),
                user: syntheticUser,
                provider: 'admin_table_fallback'
              }
            };
            authError = null;
          } else {
            const originalMsg = authError?.message || 'Invalid login credentials';
            const fbMsg = fbError?.message || null;
            const finalMsg = fbMsg && !fbMsg.includes('Unable to verify')
              ? `${originalMsg} (Fallback: ${fbMsg})`
              : originalMsg;
            logSecurityEvent('login_failed', {
              email: email,
              reason: finalMsg
            });
            throw new Error(finalMsg);
          }
        }

        if (authError) {
          logSecurityEvent('login_failed', {
            email: email,
            reason: authError.message
          });
          throw new Error(authError.message);
        }

        authSession = authData?.session ?? null;

        const lookupValue = getAdminUserLookupValue(email);
        let fetchedUserData = fetchedFromAdminTable;
        let userError = fetchedUserData ? null : { message: 'Using prefetched profile from fallback auth' };

        if (!fetchedUserData) {
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
          fetchedUserData = userResult?.data;
          userError = userResult?.error;
        }

        if (!fetchedUserData) {
          const emailUserResult = await withRetry(
            () => withTimeout(
              supabase
                .from('admin_users')
                .select('*')
                .eq('email', email)
                .single(),
              SUPABASE_NETWORK_TIMEOUT_MS,
              { data: null, error: null }
            ),
            { retries: 1, delayMs: 300, shouldRetry: () => false }
          );
          fetchedUserData = fetchedUserData || emailUserResult?.data;
          userError = fetchedUserData ? null : (userError || emailUserResult?.error);
        }

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
          let companyResult = await withRetry(
            () => withTimeout(
              (async () => {
                const { data: companiesList, error } = await supabase
                  .from(DB_SCHEMA.COMPANIES.table)
                    .select('*')
                    .eq('company_code', userData.company_code)
                    .limit(1);
                return { data: companiesList?.[0] ?? null, error };
              })(),
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
        provider: authSession?.provider || (demoResult ? 'demo' : 'supabase')
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
          try {
            if (typeof isAuthenticatedRef !== 'undefined') isAuthenticatedRef.current = true;
            if (typeof sessionRef !== 'undefined') sessionRef.current = storedSession;
            if (typeof currentUserRef !== 'undefined') currentUserRef.current = storedUser;
            if (typeof currentCompanyRef !== 'undefined') currentCompanyRef.current = storedCompany || null;
          } catch (refErr) {}
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
  }, [refreshSession]);

  // Internal logout function
  // Refresh session
  

  const performLogout = useCallback(async () => {
    try {
      logSecurityEvent('logout', {
        user_id: currentUser?.id,
        email: currentUser?.email,
        company_id: currentCompany?.id
      });

      const storedAuth = secureStorage.getItem('nm_auth_session');
      const provider = sessionRef.current?.provider || storedAuth?.provider;
      const isSynthetic = provider === 'admin_table_fallback' || provider === 'demo' ||
                         String(sessionRef.current?.access_token || storedAuth?.access_token || '').startsWith('fb_');

      if (!isSynthetic) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Supabase logout error:', err);
      try {
        logSecurityEvent('logout_error', {
          error: err.message
        });
      } catch {}
    }

    clearAuthState();
  }, [currentUser, currentCompany, clearAuthState]);

  useEffect(() => {
    performLogoutRef.current = performLogout;
  }, [performLogout]);

  // Logout function
  async function logout() {
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
      const storedCompany = secureStorage.getItem('nm_current_company');
      const fallbackSlug = storedCompany?.company_slug || DEFAULT_COMPANY_SLUG;
      setTimeout(() => { window.location.replace(`/${fallbackSlug}/login`); }, 50);
    }
  }

  // Function to set company (for super admin switching)
  const setCompany = useCallback((company) => {
    setCurrentCompany(company);
    if (company) {
      try { secureStorage.setItem('nm_current_company', company); } catch {}
    } else {
      try { secureStorage.removeItem('nm_current_company'); } catch {}
    }
  }, []);

  

  
  const forgotPassword = useCallback(async (email) => {
    try {
      const companySlug = currentCompanyRef.current?.company_slug || DEFAULT_COMPANY_SLUG;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/${companySlug}/reset-password`
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
    forgotPassword,
    setCurrentUser,
    setSessionExpiryWarning
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
