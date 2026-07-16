import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseMock } from '../supabase';
import { DB_SCHEMA } from '../dbSchema';
import { secureStorage } from '../utils/security';
import { 
  logSecurityEvent, 
  validateSession, 
  getCurrentTenantId, 
  getCurrentCompanyCode,
  handleSecurityError,
  detectSuspiciousActivity
} from '../utils/securityHelper';

const AuthContext = createContext();

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionExpiryWarning, setSessionExpiryWarning] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Multi-tab synchronization using storage events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'nm_logout_event' && e.newValue === 'true') {
        performLogout();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      // If using mock client, resolve immediately without any delays
      if (isSupabaseMock) {
        setAuthLoading(false);
        return;
      }

      try {
        // Timeout to ensure authLoading doesn't get stuck - reduced to 1.5s
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth init timeout')), 1500)
        );

        // Log login attempt (with try/catch to prevent blocking auth)
        try {
          logSecurityEvent('login_attempt', {
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          if (import.meta.env.DEV) console.error('initAuth: logSecurityEvent failed', e);
        }

        // Check for suspicious activity (with try/catch)
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

        // Check Supabase session first (with timeout)
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]).catch(() => ({ data: { session: null } }));
        
        if (session) {
          // Validate session is not expired
          const now = Math.floor(Date.now() / 1000);
          if (session.expires_at && session.expires_at < now) {
            // Session expired, clear it
            await supabase.auth.signOut().catch(() => {});
            setSessionExpired(true);
            try {
              logSecurityEvent('session_expired_on_init', {
                expires_at: session.expires_at
              });
            } catch {}
            return;
          }

          // Get user profile from custom table
          const { data: userData } = await Promise.race([
            supabase
              .from('admin_users')
              .select('*')
              .eq('email', session.user.email)
              .single(),
            timeoutPromise
          ]).catch(() => ({ data: null }));
          
          if (userData) {
            // Check if user is disabled
            if (userData.status === 'disabled') {
              await supabase.auth.signOut().catch(() => {});
              setSessionExpired(true);
              try {
                logSecurityEvent('disabled_user_login_attempt', {
                  user_id: userData.id,
                  email: userData.email
                });
              } catch {}
              return;
            }

            setCurrentUser(userData);
            setIsAuthenticated(true);
            
            // Load company if exists
            if (userData.company_code) {
              const { data: companyData } = await Promise.race([
                supabase
                  .from(DB_SCHEMA.COMPANIES.table)
                  .select('*')
                  .eq('company_code', userData.company_code)
                  .single(),
                timeoutPromise
              ]).catch(() => ({ data: null }));
              
              if (companyData) {
                // Check if company is suspended
                if (companyData.status === 'suspended') {
                  await supabase.auth.signOut().catch(() => {});
                  setSessionExpired(true);
                  try {
                    logSecurityEvent('suspended_company_login_attempt', {
                      user_id: userData.id,
                      company_id: companyData.id,
                      company_code: companyData.company_code
                    });
                  } catch {}
                  return;
                }

                setCurrentCompany(companyData);
                try {
                  secureStorage.setItem('nm_current_company', companyData);
                } catch {}
                
                try {
                  logSecurityEvent('session_restored', {
                    user_id: userData.id,
                    company_id: companyData.id,
                    company_slug: companyData.company_slug
                  });
                } catch {}
              }
            }
            
            // Store minimal session data
            try {
              secureStorage.setItem('nm_user_data', {
                id: userData.id,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                company_code: userData.company_code,
                tenant_id: companyData?.id
              });
            } catch {}
          }
        } else {
          // Check if Remember Me was enabled and try to restore
          try {
            const rememberedEmail = secureStorage.getItem('nm_remembered_email');
            if (rememberedEmail) {
              // Session expired but Remember Me was enabled
              // User will need to login again with pre-filled email
            }
            
            // Clear any legacy storage
            secureStorage.removeItem('nm_user_data');
            secureStorage.removeItem('nm_current_company');
          } catch (e) {
            if (import.meta.env.DEV) console.error('initAuth: clearing legacy storage failed', e);
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('initAuth: top level error:', err);
        try {
          logSecurityEvent('auth_init_error', {
            error: err.message
          });
        } catch {}
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    // Set up Supabase auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          // Session restored or created
          const { data: userData } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', session.user.email)
            .single();
          
          if (userData) {
            setCurrentUser(userData);
            setIsAuthenticated(true);
            setSessionExpired(false);
            
            // Load company if exists
            if (userData.company_code) {
              const { data: companyData } = await supabase
                .from(DB_SCHEMA.COMPANIES.table)
                .select('*')
                .eq('company_code', userData.company_code)
                .single();
              
              if (companyData) {
                setCurrentCompany(companyData);
                try { secureStorage.setItem('nm_current_company', companyData); } catch {}
              }
            }
          }
        } else if (event === 'SIGNED_OUT') {
          // Session expired or logout
          setCurrentUser(null);
          setCurrentCompany(null);
          setIsAuthenticated(false);
          try {
            secureStorage.removeItem('nm_user_data');
            secureStorage.removeItem('nm_current_company');
          } catch {}
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed successfully
          setSessionExpiryWarning(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        logSecurityEvent('login_failed', {
          email: email,
          reason: authError.message
        });
        throw new Error(authError.message);
      }

      // Get user profile from custom table
      const { data: userData, error: userError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        // Sign out if user profile not found
        await supabase.auth.signOut();
        logSecurityEvent('login_failed', {
          email: email,
          reason: 'User profile not found'
        });
        throw new Error('User profile not found. Please contact administrator.');
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
      let company = null;
      if (userData.company_code) {
        const { data: companyData, error: companyError } = await supabase
          .from(DB_SCHEMA.COMPANIES.table)
          .select('*')
          .eq('company_code', userData.company_code)
          .single();
        
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
        tenant_id: company?.id
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
      secureStorage.removeItem('nm_remembered_email');
    } catch {}

    setCurrentUser(null);
    setCurrentCompany(null);
    setIsAuthenticated(false);
    setSessionExpiryWarning(false);
  }, [currentUser, currentCompany]);

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
