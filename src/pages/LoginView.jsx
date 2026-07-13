import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Mail, Lock, Eye, EyeOff, AlertCircle,
  Loader2, CheckCircle2, ArrowRight, ShieldCheck, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  validateEmail, secureStorage
} from '../utils/security';
import { supabase } from '../supabase';
import { cn } from '../utils/helpers';

const BRAND_NAME = "NM MART";

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const rememberedEmail = secureStorage.getItem('nm_remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!email) return setLoginError('Email is required');
    if (!validateEmail(email)) return setLoginError('Invalid email format');
    if (!pin) return setLoginError('Password is required');

    setIsProcessing(true);
    try {
      const { data: userData, error } = await supabase.rpc('verify_admin_pin', {
        email_input: email,
        pin_input: pin
      }).single();

      if (error || !userData) {
        setLoginError('Invalid email or password');
        setIsProcessing(false);
        return;
      }

      if (!userData.company_code) {
        setLoginError('Account not linked to any company.');
        setIsProcessing(false);
        return;
      }

      if (rememberMe) {
        secureStorage.setItem('nm_remembered_email', email);
      } else {
        secureStorage.removeItem('nm_remembered_email');
      }

      secureStorage.setItem('nm_user_data', userData);
      secureStorage.setItem('nm_admin_auth', 'true');

      toast.success('Authorized Access Granted');
      onLoginSuccess(userData);
    } catch (err) {
      setLoginError('Login failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans antialiased relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] -left-[10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] -right-[10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="bg-white rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-white p-10 md:p-12">
          {/* Header */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-200 mx-auto mb-6"
            >
              <ShoppingBag size={32} className="text-white" fill="white" />
            </motion.div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">{BRAND_NAME}</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Enterprise Gateway</p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {loginError && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                className="w-full bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 mb-8"
              >
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-black text-red-600 leading-relaxed uppercase tracking-tight">{loginError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Identity</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="admin@nmmart.com"
                  className="w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all placeholder:text-slate-300"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Security PIN</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="••••"
                  className="w-full h-14 bg-slate-50 border-2 border-slate-50 rounded-2xl pl-12 pr-12 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all placeholder:text-slate-300 tracking-[0.3em]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <div
                className="flex items-center gap-2 cursor-pointer select-none group"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div className={cn(
                  "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                  rememberMe ? "bg-slate-900 border-slate-900" : "bg-white border-slate-200 group-hover:border-slate-300"
                )}>
                  {rememberMe && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <span className="text-xs font-black text-slate-500 uppercase tracking-tight">Remember</span>
              </div>
              <button
                type="button"
                className="text-xs font-black text-slate-900 uppercase tracking-tight hover:underline underline-offset-4"
              >
                Reset PIN
              </button>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full h-16 bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-slate-200 hover:bg-blue-600 hover:translate-y-[-2px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 overflow-hidden group"
            >
              {isProcessing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Authorize Access
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Security Features */}
          <div className="mt-10 pt-8 border-t border-slate-50 flex justify-center gap-6">
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <ShieldCheck size={12} className="text-emerald-500" /> AES-256
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <Zap size={12} className="text-amber-500" /> Real-time
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} {BRAND_NAME} ULTRA • SYSTEMS
          </p>
        </div>
      </motion.div>
    </div>
  );
}
