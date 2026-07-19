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
    if (authLoading) return;

    const allowedPublicPaths = [`/${SECRET_CLIENT_PATH}/login`, `/${SECRET_CLIENT_PATH}/forgot-password`, `/${SECRET_CLIENT_PATH}/reset-password`];
    if (isTenantMode) {
      allowedPublicPaths.push(`/${companySlug}/login`, `/${companySlug}/forgot-password`, `/${companySlug}/reset-password`);
    }

    if (!isAuthenticated || !currentUser) {
      const loginPath = isTenantMode
        ? `/${companySlug}/login`
        : `/${SECRET_CLIENT_PATH}/login`;

      if (window.location.pathname !== loginPath && !allowedPublicPaths.includes(window.location.pathname)) {
        navigate(loginPath, { replace: true });
      }
      return;
    }

    if (isTenantMode && currentCompany?.company_slug && currentCompany.company_slug !== companySlug) {
      navigate(`/${currentCompany.company_slug}/dashboard`, { replace: true });
      return;
    }

    const dashboardPath = isTenantMode
      ? `/${companySlug}/dashboard`
      : `/${SECRET_CLIENT_PATH}/dashboard`;

    if (window.location.pathname !== dashboardPath) {
      navigate(dashboardPath, { replace: true });
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



const rootContainer = document.getElementById('root');

if (!rootContainer) {
  throw new Error('Root container not found');
}

let reactRoot = null;

if (!reactRoot) {
  reactRoot = ReactDOM.createRoot(rootContainer);
}

reactRoot.render(

  <React.StrictMode>

    <ErrorBoundary>

      <AuthProvider>

        <GlobalProvider>

          <BrowserRouter>

            <Routes>

              {/* Public Landing Page */}

              <Route path="/" element={<LandingPage />} />



              {/* Super Admin / Central Access Routes */}

              <Route path={`/${SECRET_CLIENT_PATH}`} element={<AuthChecker isTenantMode={false} />} />

              <Route path={`/${SECRET_CLIENT_PATH}/login`} element={<LoginView />} />

              <Route path={`/${SECRET_CLIENT_PATH}/*`} element={

                <ProtectedRoute>

                  <App isTenantMode={false} />

                </ProtectedRoute>

              } />



              {/* Tenant-Specific Access via Company Slug */}

              <Route path="/:companySlug" element={<AuthChecker isTenantMode={true} />} />

              <Route path="/:companySlug/login" element={<LoginView isTenantMode={true} />} />

              <Route path="/:companySlug/*" element={

                <ProtectedRoute>

                  <TenantWrapper />

                </ProtectedRoute>

              } />



              {/* Catch all - redirect to landing */}

              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>

          </BrowserRouter>

        </GlobalProvider>

      </AuthProvider>

    </ErrorBoundary>

  </React.StrictMode>,

)

