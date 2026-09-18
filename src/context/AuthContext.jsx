import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { DB_SCHEMA } from '../dbSchema';
import { secureStorage } from '../utils/security';
import { withRetry } from '../utils/retry';
import {
  logSecurityEvent,
  detectSuspiciousActivity
} from '../utils/securityHelper';
import { normalizeAdminUserProfile, buildFallbackAdminProfile, getAdminUserLookupValue } from '../utils/adminUser';
import { hasValidStoredAuthState, isSessionExpired } from '../utils/authState';

const AuthContext = createContext();
const SUPABASE_NETWORK_TIMEOUT_MS = Number(import.meta.env.VITE_SUPABASE_TIMEOUT_MS || 15000);
const DEFAULT_COMPANY_SLUG = 'nm-mart';

const authLoginDebug = (message, startedAt) => {
  if (import.meta.env.DEV) {
    const elapsed = Math.round(performance.now() - startedAt);
    console.debug(`[AUTH LOGIN] ${message} (${elapsed}ms)`);
  }
};

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

      if (!hasValidStoredAuthState(storedSession, storedUser)) {
        return false;
      }

      setSession(storedSession);
      setCurrentUser(storedUser);
      setCurrentCompany(storedCompany || null);
      setTenant(storedCompany || null);
      setIsAuthenticated(true);
      setSessionExpired(false);
      setSessionExpiryWarning(false);
      sessionRef.current = storedSession;
      currentUserRef.current = storedUser;
      currentCompanyRef.current = storedCompany || null;
      isAuthenticatedRef.current = true;
      return true;
    } catch {
      return false;
    }
  }, []);

  const hydrateAuthState = useCallback(async (supabaseSession) => {
    if (!supabaseSession?.user) {
      clearAuthState();
      return null;
    }

    if (isSessionExpired(supabaseSession)) {
      await supabase.auth.signOut().catch(() => {});
      clearAuthState();
      setSessionExpired(true);
      return null;
    }

    const email = supabaseSession.user.email || currentUserRef.current?.email;
    if (!email) {
      clearAuthState();
      return null;
    }

    setSession(supabaseSession);
    setIsAuthenticated(true);
    setSessionExpired(false);
    setSessionExpiryWarning(false);

    try {
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
        { retries: 1, delayMs: 300, shouldRetry: () => true }
      );

      const fetchedUserData = userResult?.data || null;
      const userError = userResult?.error || null;

      let normalizedUser = null;
      if (fetchedUserData && !userError) {
        normalizedUser = normalizeAdminUserProfile(fetchedUserData, email);
      } else {
        normalizedUser = buildFallbackAdminProfile(supabaseSession.user, email);
      }

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

      let companyData = null;
      if (normalizedUser.company_code) {
        const companyResult = await withRetry(
          () => withTimeout(
            supabase
              .from(DB_SCHEMA.COMPANIES.table)
              .select('*')
              .eq('company_code', normalizedUser.company_code)
              .maybeSingle(),
            SUPABASE_NETWORK_TIMEOUT_MS,
            { data: null, error: { message: 'Unable to load company details.' } }
          ),
          { retries: 1, delayMs: 300, shouldRetry: () => true }
        );

        const maybeCompany = companyResult?.data || null;
        const companyError = companyResult?.error || null;

        if (!companyError && maybeCompany) {
          if (maybeCompany.status === 'suspended') {
            await supabase.auth.signOut().catch(() => {});
            clearAuthState();
            setSessionExpired(true);
            return null;
          }
          companyData = maybeCompany;
        }
      }

      setCurrentUser(normalizedUser);
      setCurrentCompany(companyData || null);
      setTenant(companyData || null);
      currentUserRef.current = normalizedUser;
      currentCompanyRef.current = companyData || null;
      isAuthenticatedRef.current = true;
      sessionRef.current = supabaseSession;

      try {
        secureStorage.setItem('nm_user_data', {
          id: normalizedUser.id,
          email: normalizedUser.email,
          name: normalizedUser.name,
          role: normalizedUser.role,
          company_code: normalizedUser.company_code,
          tenant_id: companyData?.id,
          status: normalizedUser.status
        });
        secureStorage.setItem('nm_auth_session', {
          access_token: supabaseSession?.access_token || null,
          expires_at: supabaseSession?.expires_at || Math.floor(Date.now() / 1000) + 3600,
          refresh_token: supabaseSession?.refresh_token || null,
          user: supabaseSession?.user || { id: normalizedUser.id, email: normalizedUser.email },
          provider: supabaseSession?.provider || 'supabase'
        });
        if (companyData) {
          secureStorage.setItem('nm_current_company', companyData);
        }
      } catch {}

      return { userData: normalizedUser, companyData };
    } catch (error) {
      if (import.meta.env.DEV) console.error('hydrateAuthState error:', error);
      clearAuthState();
      return null;
    }
  }, [clearAuthState]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const restoredFromStorage = restoreStoredAuthState();
        if (restoredFromStorage) {
          setAuthLoading(false);
          return;
        }

        const { data: { session: restoredSession }, error } = await withTimeout(
          supabase.auth.getSession(),
          2500,
          { data: { session: null }, error: null }
        );

        if (!isMounted) return;

        if (error) {
          if (import.meta.env.DEV) console.warn('initAuth: session lookup returned an error', error);
          clearAuthState();
        } else if (restoredSession) {
          await hydrateAuthState(restoredSession);
        } else {
          clearAuthState();
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('initAuth: top level error:', err);
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (!isMounted) return;

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (authSession) {
          await hydrateAuthState(authSession);
        }
        setAuthLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && authSession) {
        setSession(authSession);
        setSessionExpiryWarning(false);
        setSessionExpired(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        clearAuthState();
        setAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearAuthState, hydrateAuthState, restoreStoredAuthState]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSessionExpiry = async () => {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      if (!activeSession) {
        clearAuthState();
        return;
      }

      const expiresAt = activeSession.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;

      if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
        setSessionExpiryWarning(true);
      }

      if (timeUntilExpiry <= 0) {
        setSessionExpired(true);
        await performLogoutRef.current?.();
      }
    };

    const interval = setInterval(checkSessionExpiry, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, clearAuthState]);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (data?.session) {
        setSession(data.session);
        await hydrateAuthState(data.session);
      }
      return data?.session || null;
    } catch (err) {
      return null;
    }
  }, [hydrateAuthState]);

  const login = useCallback(async (email, password, rememberMe = false, options = {}) => {
    setAuthLoading(true);
    setSessionExpired(false);
    const loginStartedAt = performance.now();
    authLoginDebug('started', loginStartedAt);

    try {
      logSecurityEvent('login_attempt', {
        email,
        remember_me: rememberMe,
        expected_company: options.expectedCompanySlug
      });

      const authResult = await withRetry(
        () => supabase.auth.signInWithPassword({ email, password }),
        {
          retries: 1,
          delayMs: 300,
          shouldRetry: (error) => !String(error?.message || '').includes('Invalid login credentials')
        }
      );

      const { data: authData, error: authError } = authResult || {};
      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData?.session || !authData?.user) {
        throw new Error('Authentication failed. Please try again.');
      }

      const sessionData = authData.session;
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
        { retries: 1, delayMs: 300, shouldRetry: () => true }
      );

      const fetchedUserData = userResult?.data || null;
      const userError = userResult?.error || null;
      const userData = fetchedUserData && !userError
        ? normalizeAdminUserProfile(fetchedUserData, email)
        : buildFallbackAdminProfile(sessionData.user, email);

      if (userData.status === 'disabled') {
        await supabase.auth.signOut().catch(() => {});
        throw new Error('Your account has been disabled. Please contact administrator.');
      }

      let company = null;
      if (userData.company_code) {
        const companyResult = await withRetry(
          () => withTimeout(
            supabase
              .from(DB_SCHEMA.COMPANIES.table)
              .select('*')
              .eq('company_code', userData.company_code)
              .maybeSingle(),
            SUPABASE_NETWORK_TIMEOUT_MS,
            { data: null, error: { message: 'Unable to load company details.' } }
          ),
          { retries: 1, delayMs: 300, shouldRetry: () => true }
        );

        const companyData = companyResult?.data || null;
        if (companyData) {
          if (companyData.status === 'suspended') {
            await supabase.auth.signOut().catch(() => {});
            throw new Error('Your company account has been suspended. Please contact administrator.');
          }
          company = companyData;
        }
      }

      if (options.expectedCompanySlug) {
        if (!company) {
          throw new Error('Account not linked to any company');
        }
        if (company.company_slug !== options.expectedCompanySlug) {
          throw new Error('You are not authorized to access this company workspace');
        }
      }

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
        access_token: sessionData.access_token || null,
        expires_at: sessionData.expires_at || Math.floor(Date.now() / 1000) + 3600,
        refresh_token: sessionData.refresh_token || null,
        user: sessionData.user || { id: userData.id, email: userData.email },
        provider: sessionData.provider || 'supabase'
      });

      if (company) {
        secureStorage.setItem('nm_current_company', company);
      }

      if (rememberMe) {
        secureStorage.setItem('nm_remembered_email', email);
      } else {
        secureStorage.removeItem('nm_remembered_email');
      }

      setCurrentUser(userData);
      setCurrentCompany(company);
      setTenant(company);
      setSession(sessionData);
      setIsAuthenticated(true);
      setSessionExpired(false);
      setSessionExpiryWarning(false);
      currentUserRef.current = userData;
      currentCompanyRef.current = company;
      sessionRef.current = sessionData;
      isAuthenticatedRef.current = true;

      logSecurityEvent('login_success', {
        user_id: userData.id,
        email,
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

  const performLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Supabase logout error:', err);
    }
    clearAuthState();
  }, [clearAuthState]);

  useEffect(() => {
    performLogoutRef.current = performLogout;
  }, [performLogout]);

  const logout = useCallback(async (companySlugOverride) => {
    try {
      localStorage.setItem('nm_logout_event', 'true');
      setTimeout(() => localStorage.removeItem('nm_logout_event'), 100);
    } catch {}

    await performLogout();

    const targetSlug = companySlugOverride || currentCompanyRef.current?.company_slug || secureStorage.getItem('nm_current_company')?.company_slug || DEFAULT_COMPANY_SLUG;
    const redirectUrl = `/${targetSlug}/login`;
    if (typeof window !== 'undefined') {
      setTimeout(() => window.location.replace(redirectUrl), 50);
    }
  }, [performLogout]);

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

  const setCompany = useCallback((company) => {
    setCurrentCompany(company);
    setTenant(company);
    if (company) {
      try {
        secureStorage.setItem('nm_current_company', company);
      } catch {}
    } else {
      try {
        secureStorage.removeItem('nm_current_company');
      } catch {}
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
