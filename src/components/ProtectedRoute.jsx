import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuthContext } from '../context';
import { logSecurityEvent } from '../utils/securityHelper';

// Role-based route permissions
const ROLE_PERMISSIONS = {
  'super_admin': ['*'],
  'admin': ['dashboard', 'inventory', 'purchase', 'reports', 'settings', 'pos', 'finance', 'customers', 'analytics', 'orders', 'suppliers', 'categories', 'brands', 'subcategories'],
  'manager': ['dashboard', 'inventory', 'purchase', 'pos', 'customers', 'orders', 'suppliers'],
  'cashier': ['pos'],
  'viewer': ['dashboard', 'reports', 'analytics']
};

const normalizeRole = (role) => {
  if (!role) return 'viewer';
  return String(role).toLowerCase();
};

const hasRequiredPermission = (role, requiredPermission) => {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.viewer;
  return permissions.includes('*') || permissions.includes(requiredPermission);
};

export default function ProtectedRoute({ children, requiredPermission = null }) {
  const { isAuthenticated, authLoading, currentCompany, currentUser, logout } = useAuthContext();
  const location = useLocation();
  const { companySlug } = useParams();

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    const loginPath = companySlug 
      ? `/${companySlug}/login` 
      : '/nm-mart/login';
    
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check if user is disabled
  if (currentUser && currentUser.status === 'disabled') {
    // Logout disabled user
    logout(companySlug);
    return null;
  }

  // Check if company is suspended
  if (currentCompany && currentCompany.status === 'suspended') {
    // Logout user from suspended company
    logout(companySlug);
    return null;
  }

  // Prevent cross-tenant route access
  if (companySlug && currentCompany && currentCompany.company_slug !== companySlug) {
    // Log unauthorized access attempt
    try {
      logSecurityEvent('unauthorized_tenant_access', {
        user_id: currentUser?.id,
        attempted_slug: companySlug,
        actual_slug: currentCompany.company_slug,
        path: location.pathname
      });
    } catch {}
    
    return <Navigate to={`/${currentCompany.company_slug}/dashboard`} replace />;
  }

  // Role-based route validation
  if (currentUser && requiredPermission) {
    const userRole = normalizeRole(currentUser.role);
    if (!hasRequiredPermission(userRole, requiredPermission)) {
      try {
        logSecurityEvent('permission_denied', {
          user_id: currentUser?.id,
          role: userRole,
          required_permission: requiredPermission,
          path: location.pathname
        });
      } catch {}
      
      return <Navigate to={`/${companySlug || 'nm-mart'}/dashboard`} replace />;
    }
  }

  // Additional security: Check if user has access to this specific route
  const protectedRoutes = [
    '/dashboard',
    '/inventory',
    '/purchase',
    '/reports',
    '/settings',
    '/pos',
    '/finance',
    '/customers',
    '/analytics',
    '/orders',
    '/suppliers',
    '/categories',
    '/brands',
    '/subcategories',
    '/users',
    '/master',
    '/tools'
  ];

  const isProtectedRoute = protectedRoutes.some(route => 
    location.pathname.includes(route)
  );

  if (isProtectedRoute && !currentUser) {
    return <Navigate to={companySlug ? `/${companySlug}/login` : '/nm-mart/login'} replace />;
  }

  return children;
}
