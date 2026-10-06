import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Mail, Lock, Eye, EyeOff, AlertCircle,
  Loader2, RefreshCw, CheckCircle2, Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  validateEmail, secureStorage, LoginRateLimiter, sanitizeText
} from '../utils/security';
import { useAuthContext } from '../context';
import { cn } from '../utils/helpers';

const BRAND_NAME = "NM MART";
const loginRateLimiter = new LoginRateLimiter(5, 5);

const loginUiDebug = (message) => {
  if (import.meta.env.DEV) console.debug(`[LOGIN UI] ${message}`);
};

export default function LoginView({ isTenantMode = false }) {
  const { login, sessionExpiryWarning, refreshSession, sessionExpired } = useAuthContext();
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const rememberedEmail = secureStorage.getItem('nm_remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (sessionExpired) {
      setLoginError('Your session has expired. Please sign in again.');
    }
  }, [sessionExpired]);

  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshSession();
      if (result.success) {
        toast.success('Session refreshed successfully');
      } else {
        toast.error('Session refresh failed. Please login again.');
      }
    } catch (err) {
      toast.error('Failed to refresh session');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleForgotPassword = () => {
    const forgotPasswordPath = isTenantMode && companySlug
      ? `/${companySlug}/forgot-password`
      : '/forgot-password';
    navigate(forgotPasswordPath);
  };

  const handleLogin = async (e) => {
    loginUiDebug('form submitted');
    if (e) e.preventDefault();
    setLoginError('');
    loginUiDebug('validation started');

    const lockout = loginRateLimiter.isLockedOut();
    if (lockout.locked) {
      const minutes = Math.ceil(lockout.remainingSeconds / 60);
      return setLoginError(`Too many failed attempts. Try again in ${minutes} minute(s).`);
    }

    if (!email) return setLoginError('Email is required');
    const cleanEmail = sanitizeText(email).toLowerCase();
    if (!validateEmail(cleanEmail)) return setLoginError('Invalid email format');
    if (!password) return setLoginError('Password is required');
    const cleanPassword = sanitizeText(password);
    loginUiDebug('validation passed');

    setIsProcessing(true);
    try {
      loginUiDebug('calling AuthContext.login');
      const result = await login(cleanEmail, cleanPassword, rememberMe, {
        expectedCompanySlug: isTenantMode ? companySlug : null
      });

      loginRateLimiter.recordAttempt(true);

      const company = result?.company;

      toast.success('Authorized Access Granted');
      
      const dashboardPath = isTenantMode && companySlug
        ? `/${companySlug}/dashboard`
        : '/dashboard';
      
      navigate(dashboardPath, { replace: true });
    } catch (err) {
      loginRateLimiter.recordAttempt(false);
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="login-shell flex min-h-svh flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 pb-4 font-sans antialiased sm:px-6">
      <style>{`
        @media (max-width: 700px) {
          .login-shell { padding-bottom: 8px; }
          .login-header { height: 48px; }
          .login-main { padding-block: 4px; }
          .login-card { padding: 16px; }
          .login-brand-icon { width: 44px; height: 44px; margin-bottom: 8px; }
          .login-brand-icon svg { width: 22px; height: 22px; }
          .login-subtitle { margin-bottom: 12px; }
          .login-form { gap: 12px; }
          .login-form > :not([hidden]) ~ :not([hidden]) { margin-top: 12px; }
          .login-field { gap: 4px; }
          .login-field > :not([hidden]) ~ :not([hidden]) { margin-top: 4px; }
          .login-input { height: 44px; }
          .login-submit { height: 44px; }
          .login-footer { margin-top: 16px; gap: 8px; }
          .login-footer-links { gap: 8px; }
          .login-footer-links button { white-space: nowrap; font-size: 8px; letter-spacing: 0.08em; }
        }
        @media (max-height: 500px) and (max-width: 900px) {
          .login-shell { height: 100svh; min-height: 0; overflow: hidden; padding-bottom: 4px; }
          .login-header { height: 40px; }
          .login-main { min-height: 0; padding-block: 2px; }
          .login-card { padding: 8px 14px; border-radius: 20px; }
          .login-brand-icon { width: 30px; height: 30px; margin-bottom: 2px; border-radius: 9px; }
          .login-brand-icon svg { width: 16px; height: 16px; }
          .login-heading { margin-bottom: 0; font-size: 18px; line-height: 22px; }
          .login-description, .login-subtitle, .login-footer { display: none; }
          .login-form { gap: 6px; }
          .login-form > :not([hidden]) ~ :not([hidden]) { margin-top: 6px; }
          .login-field { gap: 0; }
          .login-field > :not([hidden]) ~ :not([hidden]) { margin-top: 1px; }
          .login-label { font-size: 9px; line-height: 12px; }
          .login-input { height: 34px; }
          .login-options { padding-top: 0; }
          .login-options label > span:last-child,
          .login-options > button { font-size: 9px; }
          .login-submit { height: 34px; }
        }
      `}</style>
      <header className="login-header flex h-14 shrink-0 items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Home size={15} />
          Home
        </Link>
      </header>

      <main className="login-main flex min-h-0 flex-1 items-center justify-center py-3">
      {/* Session Expiry Warning */}
      <AnimatePresence>
        {sessionExpiryWarning && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 shadow-card">
              <AlertCircle size={20} className="text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">Session Expiring Soon</p>
                <p className="text-xs text-amber-600">Your session will expire in less than 5 minutes.</p>
              </div>
              <button
                onClick={handleRefreshSession}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {isRefreshing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Refresh
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[400px]"
      >

        <div className="login-card flex flex-col items-center rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_16px_44px_rgba(30,64,175,0.10)] sm:p-8">
          {/* Logo Section */}
          <div className="login-brand-icon mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg shadow-blue-200/70">
            <ShoppingBag size={27} className="text-white" />
          </div>

          <h1 className="login-heading mb-1.5 text-2xl font-black tracking-tight text-slate-900 text-center">
            {BRAND_NAME}
          </h1>
          <p className="login-description text-xs font-bold text-slate-600 text-center sm:text-sm">
            Retail ERP Management System
          </p>
          <p className="login-subtitle mb-5 mt-1 text-[11px] font-medium text-slate-400 text-center">
            Secure access to your business dashboard
          </p>

          <AnimatePresence>
            {loginError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 mb-6"
              >
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-black text-red-600 leading-relaxed uppercase tracking-tight">{loginError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="login-form w-full space-y-4">
            <div className="login-field space-y-2">
              <label className="login-label text-xs font-black text-slate-600 uppercase tracking-widest ml-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="login-input h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="login-field space-y-2">
              <label className="login-label text-xs font-black text-slate-600 uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={20} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="login-input h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="login-options flex items-center justify-between px-1 pt-1">
              <label
                htmlFor="remember-me"
                className="flex items-center gap-2.5 cursor-pointer select-none group"
              >
                <input
                  id="remember-me"
                  type="checkbox"
                  className="sr-only peer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <div className={cn(
                  "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
                  rememberMe ? "bg-blue-600 border-blue-600 shadow-card shadow-blue-100" : "bg-white border-slate-300 group-hover:border-blue-400 peer-focus:border-blue-500 peer-focus:ring-4 peer-focus:ring-blue-500/10"
                )}>
                  {rememberMe && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Remember Me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-black text-blue-600 uppercase tracking-tight hover:underline underline-offset-4"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              onClick={() => loginUiDebug('button clicked')}
              disabled={isProcessing}
              className="login-submit flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-black tracking-[0.12em] text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:opacity-95 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "SIGN IN"
              )}
            </button>
          </form>

          {/* Footer inside card */}
          <div className="login-footer mt-6 space-y-3 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              © 2026 {BRAND_NAME} RETAIL ERP
            </p>
            <div className="login-footer-links flex items-center justify-center gap-4 sm:gap-6">
              <button
                type="button"
                onClick={() => toast.info('Privacy Policy coming soon')}
                className="text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors"
              >Privacy Policy</button>
              <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
              <button
                type="button"
                onClick={() => toast.info('Terms of Service coming soon')}
                className="text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors"
              >Terms</button>
              <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
              <button
                type="button"
                onClick={() => toast.info('Contact support at: help@nmmart.in')}
                className="text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors"
              >Support</button>
            </div>
          </div>
        </div>
      </motion.div>
      </main>
    </div>
  );
}
