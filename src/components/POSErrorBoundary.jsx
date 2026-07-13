import React, { Component } from 'react';
import { motion } from 'framer-motion';
import { AlertOctagon, RotateCcw } from 'lucide-react';

class POSErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[POS CRITICAL ERROR]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[3rem] p-10 text-center space-y-8 shadow-2xl"
          >
            <div className="w-24 h-24 bg-red-50/10 rounded-3xl flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
              <AlertOctagon size={56} />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tight">System Halted</h2>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
                An unexpected runtime error occurred. Your session has been protected from crashing.
              </p>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 text-[9px] font-mono text-red-400 text-left border border-slate-800 overflow-hidden whitespace-nowrap">
              ERROR_ID: {this.state.error?.name || 'UNKNOWN_RUNTIME_EXCEPTION'}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary-900/20 transition-all flex items-center justify-center gap-3"
              >
                <RotateCcw size={18} /> Restart Session
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl font-black uppercase tracking-widest transition-all"
              >
                Attempt Recovery
              </button>
            </div>

            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
              NM MART ULTRA RETAIL • PRODUCTION_BUILD_CERTIFIED
            </p>
          </motion.div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default POSErrorBoundary;
