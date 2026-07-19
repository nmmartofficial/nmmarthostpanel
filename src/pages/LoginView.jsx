import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Mail, Lock, Eye, EyeOff, AlertCircle,
  Loader2, RefreshCw, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import {
  validateEmail, secureStorage
} from '../utils/security';
import { useAuthContext } from '../context';
import { cn } from '../utils/helpers';

const BRAND_NAME = "NM MART";

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
    
    // Show session expired message if applicable
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
      : '/nm-mart/forgot-password';
    navigate(forgotPasswordPath);
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    if (!email) return setLoginError('Email is required');
    if (!validateEmail(email)) return setLoginError('Invalid email format');
    if (!password) return setLoginError('Password is required');

    setIsProcessing(true);
    try {
      const { company } = await login(email, password, rememberMe, {
        expectedCompanySlug: isTenantMode ? companySlug : null
      });

      toast.success('Authorized Access Granted');
      
      // Redirect to appropriate dashboard
      const dashboardPath = isTenantMode && companySlug
        ? `/${companySlug}/dashboard`
        : '/nm-mart/dashboard';
      
      navigate(dashboardPath, { replace: true });
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center p-6 font-sans antialiased">
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
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-card border border-neutral-200 p-8 sm:p-10 flex flex-col items-center">
          {/* Logo Section */}
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-card shadow-blue-200 mb-6">
            <ShoppingBag size={32} className="text-white" />
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase text-center">
            {BRAND_NAME}
          </h1>
          <p className="text-sm font-bold text-slate-600 text-center mb-1">
            Retail ERP Management System
          </p>
          <p className="text-xs font-semibold text-slate-400 text-center mb-8">
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

          <form onSubmit={handleLogin} className="w-full space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full h-14 bg-white border border-slate-200 rounded-2xl pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={20} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-14 bg-white border border-slate-200 rounded-2xl pl-12 pr-12 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
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

            <div className="flex items-center justify-between px-1 pt-1">
              <div
                className="flex items-center gap-2.5 cursor-pointer select-none group"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div className={cn(
                  "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
                  rememberMe ? "bg-blue-600 border-blue-600 shadow-card shadow-blue-100" : "bg-white border-slate-300 group-hover:border-blue-400"
                )}>
                  {rememberMe && <CheckCircle2 size={14} className="text-white" fill="white" />}
                </div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Remember Me</span>
              </div>
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
              disabled={isProcessing}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm tracking-[0.15em] rounded-2xl shadow-card shadow-blue-100 hover:opacity-95 hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
            >
              {isProcessing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "SIGN IN"
              )}
            </button>
          </form>

          {/* Footer inside card */}
          <div className="mt-10 text-center space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              © 2026 {BRAND_NAME} RETAIL ERP
            </p>
            <div className="flex items-center justify-center gap-6">
              <button className="text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors">Privacy Policy</button>
              <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
              <button className="text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors">Terms</button>
              <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
              <button className="text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors">Support</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
