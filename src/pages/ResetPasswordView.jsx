import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { validatePasswordStrength } from '../utils/security';

const BRAND_NAME = "NM MART";

export default function ResetPasswordView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ valid: false, message: '' });

  // Check for valid reset token
  const [isValidToken, setIsValidToken] = useState(null);
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      const accessToken = searchParams.get('access_token');
      
      if (!accessToken) {
        setTokenError('Invalid reset link. Missing access token.');
        setIsValidToken(false);
        return;
      }

      try {
        // Verify the token by getting current session
        const { data: { session }, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: searchParams.get('refresh_token') || ''
        });

        if (error || !session) {
          setTokenError('Invalid or expired reset link. Please request a new password reset.');
          setIsValidToken(false);
        } else {
          setIsValidToken(true);
        }
      } catch (err) {
        setTokenError('Invalid reset link. Please request a new password reset.');
        setIsValidToken(false);
      }
    };

    validateToken();
  }, [searchParams]);

  useEffect(() => {
    if (password) {
      const strength = validatePasswordStrength(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ valid: false, message: '' });
    }
  }, [password]);

  const getPasswordStrengthColor = () => {
    if (!password) return 'bg-slate-200';
    const msg = passwordStrength.message.toLowerCase();
    if (msg.includes('strong')) return 'bg-green-500';
    if (msg.includes('medium')) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPasswordStrengthWidth = () => {
    if (!password) return '0%';
    const msg = passwordStrength.message.toLowerCase();
    if (msg.includes('strong')) return '100%';
    if (msg.includes('medium')) return '66%';
    return '33%';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) return setError('Password is required');
    if (!passwordStrength.valid) return setError(passwordStrength.message);
    if (password !== confirmPassword) return setError('Passwords do not match');

    setIsProcessing(true);
    try {
      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // Sign out all sessions (invalidate old sessions)
      await supabase.auth.signOut();

      setIsSuccess(true);
      toast.success('Password updated successfully');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/nm-mart/login');
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-[#F3F6FF] flex items-center justify-center p-6 font-sans antialiased">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Validating...</p>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-[#F3F6FF] flex items-center justify-center p-6 font-sans antialiased">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[460px]"
        >
          <div className="bg-white rounded-[48px] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.06)] border border-neutral-100 p-12 flex flex-col items-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-8">
              <XCircle size={40} className="text-red-600" />
            </div>

            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase text-center">
              Invalid Link
            </h1>
            <p className="text-[13px] font-semibold text-slate-500 text-center mb-8 leading-relaxed">
              {tokenError}
            </p>

            <button
              onClick={() => navigate('/nm-mart/login')}
              className="w-full h-14 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-black text-[15px] tracking-[0.1em] rounded-2xl shadow-xl shadow-blue-100 hover:opacity-95 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F6FF] flex flex-col items-center justify-center p-6 font-sans antialiased">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[460px]"
      >
        <div className="bg-white rounded-[48px] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.06)] border border-neutral-100 p-12 flex flex-col items-center">
          {!isSuccess ? (
            <>
              {/* Logo Section */}
              <div className="w-16 h-16 bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-8">
                <Lock size={32} className="text-white" />
              </div>

              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase text-center">
                {BRAND_NAME}
              </h1>
              <p className="text-[15px] font-extrabold text-slate-700 text-center mb-1">
                Reset Password
              </p>
              <p className="text-[11px] font-semibold text-slate-400 text-center mb-12">
                Create a new secure password
              </p>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 mb-8"
                  >
                    <div className="text-red-500 shrink-0 mt-0.5">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <p className="text-[11px] font-black text-red-600 leading-relaxed uppercase tracking-tight">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="w-full space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-1">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock size={20} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full h-14 bg-white border border-slate-200 rounded-2xl pl-12 pr-12 text-[15px] font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-3 space-y-2">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: getPasswordStrengthWidth() }}
                          transition={{ duration: 0.3 }}
                          className={`h-full ${getPasswordStrengthColor()}`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield size={12} className={passwordStrength.valid ? 'text-green-600' : 'text-slate-400'} />
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${passwordStrength.valid ? 'text-green-600' : 'text-slate-500'}`}>
                          {passwordStrength.message || 'Enter password'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock size={20} />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full h-14 bg-white border border-slate-200 rounded-2xl pl-12 pr-12 text-[15px] font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || !passwordStrength.valid || password !== confirmPassword}
                  className="w-full h-14 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-black text-[15px] tracking-[0.1em] rounded-2xl shadow-xl shadow-blue-100 hover:opacity-95 hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <Loader2 size={22} className="animate-spin" />
                  ) : (
                    "RESET PASSWORD"
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-8">
                <CheckCircle size={40} className="text-green-600" />
              </div>

              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase text-center">
                Password Updated
              </h1>
              <p className="text-[13px] font-semibold text-slate-500 text-center mb-8 leading-relaxed">
                Your password has been updated successfully. You will be redirected to the login page shortly.
              </p>

              <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <Loader2 size={14} className="animate-spin" />
                Redirecting...
              </div>
            </>
          )}

          {/* Footer inside card */}
          <div className="mt-14 text-center space-y-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              © 2026 {BRAND_NAME} RETAIL ERP
            </p>
          </div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />
    </div>
  );
}
