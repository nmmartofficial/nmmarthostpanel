import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import App from './App.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginView from './pages/LoginView.jsx'
import ForgotPasswordView from './pages/ForgotPasswordView.jsx'
import ResetPasswordView from './pages/ResetPasswordView.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { GlobalProvider } from './context/GlobalContext'
import { AuthProvider, useAuthContext } from './context'
import { ProtectedRoute } from './components'
import { supabase } from './supabase'
import { DB_SCHEMA } from './dbSchema'
import { secureStorage } from './utils/security'
import './index.css'

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        if (import.meta.env.DEV) {
          console.log('SW registered: ', registration);
        }
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

/**
 * NM MART - Multi-Tenant SaaS Platform
 */
const SECRET_CLIENT_PATH = "nm-mart";

/**
 * Auth Checker Component - Handles automatic redirects
 */
function AuthChecker({ isTenantMode = false }) {
  const { isAuthenticated, authLoading, currentCompany, currentUser } = useAuthContext();
  const { companySlug } = useParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Don't redirect while loading - show loading screen
    if (authLoading) return;

    if (isAuthenticated && currentUser) {
      // User is authenticated, redirect to appropriate dashboard
      if (isTenantMode && currentCompany?.company_slug && currentCompany.company_slug !== companySlug) {
        // Tenant mismatch - redirect to correct tenant
        navigate(`/${currentCompany.company_slug}/dashboard`, { replace: true });
        return;
      }

      // Redirect to dashboard
      const dashboardPath = isTenantMode
        ? `/${companySlug}/dashboard`
        : `/${SECRET_CLIENT_PATH}/dashboard`;
      navigate(dashboardPath, { replace: true });
    } else {
      // User not authenticated - redirect to login
      const loginPath = isTenantMode
        ? `/${companySlug}/login`
        : `/${SECRET_CLIENT_PATH}`; // Now login page is directly at /nm-mart
      navigate(loginPath, { replace: true });
    }
  }, [isAuthenticated, authLoading, isTenantMode, companySlug, currentCompany, currentUser, navigate]);

  // Show clean loading screen while checking auth
  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Restoring Session...</p>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * ERP Layout - Wraps all ERP routes with AuthProvider and GlobalProvider
 */
/**
 * Login Page Wrapper - Redirects authenticated users to dashboard
 */
function LoginPageWrapper({ isTenantMode = false }) {
  const { isAuthenticated, authLoading } = useAuthContext();
  const { companySlug } = useParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      const dashboardPath = isTenantMode
        ? `/${companySlug}/dashboard`
        : `/${SECRET_CLIENT_PATH}/dashboard`;
      navigate(dashboardPath, { replace: true });
    }
  }, [isAuthenticated, authLoading, isTenantMode, companySlug, navigate]);

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Restoring Session...</p>
        </div>
      </div>
    );
  }

  return <LoginView isTenantMode={isTenantMode} />;
}

function ERPLayout() {
  return (
    <AuthProvider>
      <GlobalProvider>
        <Routes>
          {/* Super Admin / Central Access Routes */}
          <Route path="" element={<LoginPageWrapper isTenantMode={false} />} />
          <Route path="login" element={<LoginPageWrapper isTenantMode={false} />} /> {/* Kept for backward compatibility */}
          <Route path="forgot-password" element={<ForgotPasswordView />} />
          <Route path="*" element={
            <ProtectedRoute>
              <App isTenantMode={false} />
            </ProtectedRoute>
          } />
        </Routes>
      </GlobalProvider>
    </AuthProvider>
  );
}

function TenantERPLayout() {
  return (
    <AuthProvider>
      <GlobalProvider>
        <Routes>
          {/* Tenant-Specific Access via Company Slug */}
          <Route path="" element={<LoginPageWrapper isTenantMode={true} />} />
          <Route path="login" element={<LoginPageWrapper isTenantMode={true} />} />
          <Route path="forgot-password" element={<ForgotPasswordView isTenantMode={true} />} />
          <Route path="*" element={
            <ProtectedRoute>
              <TenantWrapper />
            </ProtectedRoute>
          } />
        </Routes>
      </GlobalProvider>
    </AuthProvider>
  );
}

/**
 * Tenant Wrapper - Handles company slug detection and sets tenant context
 */
function TenantWrapper() {
  const { companySlug } = useParams();
  const { setCompany, currentCompany } = useAuthContext();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchCompany = async () => {
      try {
        setLoading(true);
        // First check if companySlug is the secret path
        if (companySlug === SECRET_CLIENT_PATH) {
          setLoading(false);
          return;
        }
        
        // Fetch company by slug
        const { data, error } = await supabase
          .from(DB_SCHEMA.COMPANIES.table)
          .select('*')
          .eq('company_slug', companySlug)
          .single();
          
        if (error) {
          setError('Company not found');
          return;
        }
        
        // Check if company is active
        if (data.status !== 'active') {
          setError('Company is not active');
          return;
        }
        
        setCompany(data);
        
        // Update user data in secure storage if logged in
        const currentUser = secureStorage.getItem('nm_user_data');
        if (currentUser && currentUser.company_code === data.company_code) {
          secureStorage.setItem('nm_user_data', {
            ...currentUser,
            tenant_id: data.id
          });
        }
      } catch (err) {
        console.error('TenantWrapper error:', err);
        setError('Failed to load company');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompany();
  }, [companySlug, setCompany]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-black text-slate-900 mb-2">Oops!</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  // Pass company data to App via context or just render App
  return <App company={currentCompany} isTenantMode={true} companySlug={companySlug} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Reset Password - this should also be public? Wait, let's think: reset password is part of auth flow */}
          <Route path="/reset-password" element={
            <AuthProvider>
              <GlobalProvider>
                <ResetPasswordView />
              </GlobalProvider>
            </AuthProvider>
          } />

          {/* All ERP routes - wrapped in AuthProvider and GlobalProvider via ERPLayout */}
          <Route path={`/${SECRET_CLIENT_PATH}/*`} element={<ERPLayout />} />
          <Route path="/:companySlug/*" element={<TenantERPLayout />} />

          {/* Catch all - redirect to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
