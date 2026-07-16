import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { validateEmail } from '../utils/security';
import { useAuthContext } from '../context';
import { supabase } from '../supabase';
import { DB_SCHEMA } from '../dbSchema';

const BRAND_NAME = "NM MART";

export default function ForgotPasswordView({ isTenantMode = false }) {
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) return setError('Email is required');
    if (!validateEmail(email)) return setError('Invalid email format');

    setIsProcessing(true);
    try {
      // If tenant mode, verify email belongs to this tenant
      if (isTenantMode && companySlug) {
        const { data: company } = await supabase
          .from(DB_SCHEMA.COMPANIES.table)
          .select('company_code')
          .eq('company_slug', companySlug)
          .single();

        if (company) {
          const { data: user } = await supabase
            .from('admin_users')
            .select('email')
            .eq('email', email)
            .eq('company_code', company.company_code)
            .single();

          if (!user) {
            // Don't reveal whether email exists
            // Show success message anyway for security
            setIsSuccess(true);
            return;
          }
        }
      }

      // Send reset email via Supabase
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (resetError) throw resetError;

      setIsSuccess(true);
      toast.success('Password reset link sent to your email');
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Failed to send reset link. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToLogin = () => {
    const loginPath = isTenantMode && companySlug
      ? `/${companySlug}/login`
      : '/nm-mart/login';
    navigate(loginPath);
  };

  return (
    <div className="min-h-screen bg-[#F3F6FF] flex flex-col items-center justify-center p-6 font-sans antialiased">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[460px]"
      >
        <div className="bg-white rounded-[48px] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.06)] border border-neutral-100 p-12 flex flex-col items-center">
          {/* Logo Section */}
          <div className="w-16 h-16 bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-8">
            <Mail size={32} className="text-white" />
          </div>

          {!isSuccess ? (
            <>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase text-center">
                {BRAND_NAME}
              </h1>
              <p className="text-[15px] font-extrabold text-slate-700 text-center mb-1">
                Forgot Password?
              </p>
              <p className="text-[11px] font-semibold text-slate-400 text-center mb-12">
                Enter your email to receive a password reset link
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

              <form onSubmit={handleSubmit} className="w-full space-y-7">
                <div className="space-y-2.5">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-1">
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
                      className="w-full h-14 bg-white border border-blue-400 rounded-2xl pl-12 pr-4 text-[15px] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 shadow-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full h-14 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-black text-[15px] tracking-[0.1em] rounded-2xl shadow-xl shadow-blue-100 hover:opacity-95 hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <Loader2 size={22} className="animate-spin" />
                  ) : (
                    "SEND RESET LINK"
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="flex items-center gap-2 text-[11px] font-black text-slate-600 uppercase tracking-tight hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to Login
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-8">
                <CheckCircle size={40} className="text-green-600" />
              </div>

              <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase text-center">
                Check Your Email
              </h1>
              <p className="text-[13px] font-semibold text-slate-500 text-center mb-8 leading-relaxed">
                We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
              </p>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to Login
                </button>
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
