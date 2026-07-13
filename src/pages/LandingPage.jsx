import React from 'react';
import {
  ShoppingBag, Phone, ArrowRight, ShieldCheck, Sparkles,
  Zap, Layers, MessageCircle, BarChart3, Box, CheckCircle2, Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/helpers';

export default function LandingPage() {
  const contactNumber = "917081154604";
  const displayPhone = "+91 7081154604";
  const whatsappLink = `https://wa.me/${contactNumber}?text=Hello%20NM%20MART,%20I'm%20interested%20in%20your%20Management%20Solutions.`;

  return (
    <div className="h-screen w-full bg-white text-slate-900 flex flex-col overflow-hidden relative selection:bg-blue-600 selection:text-white antialiased font-sans">

      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-50 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 px-10 py-8 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
            <ShoppingBag className="text-white" size={26} fill="white" />
          </div>
          <span className="text-2xl font-bold tracking-tighter text-slate-900 uppercase italic">NM MART</span>
        </div>

        <a href={`tel:${contactNumber}`} className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-blue-600 transition-colors tracking-widest uppercase">
          <Phone size={14} /> {displayPhone}
        </a>
      </header>

      {/* Main Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10 -mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-10 max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">
            <Sparkles size={12} fill="currentColor" /> Enterprise-Grade Retail Management
          </div>

          <h1 className="text-7xl md:text-9xl font-black text-slate-900 tracking-tighter leading-[0.85]">
            Powering <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-blue-800 uppercase">
              Retail Giants.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium leading-relaxed italic">
            "Your business, our technology. A seamless partnership for growth and efficiency."
          </p>

          <div className="flex justify-center pt-4">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 px-14 py-6 bg-slate-900 text-white rounded-[24px] text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-blue-600 hover:translate-y-[-4px] transition-all"
            >
              Get Started <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
            </a>
          </div>
        </motion.div>
      </main>

      {/* Feature Bar */}
      <footer className="relative z-10 py-10 px-8 border-t border-slate-100 bg-white/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-8">
          <div className="flex flex-wrap gap-x-12 gap-y-4">
            {[
              { label: "Inventory Intelligence", icon: <Box size={14} /> },
              { label: "Cloud Core Sync", icon: <Zap size={14} /> },
              { label: "Encrypted Data", icon: <ShieldCheck size={14} /> }
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-400">
                {f.icon}
                <span className="text-[10px] font-black uppercase tracking-widest">{f.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            © 2026 NM MART <span className="text-blue-600">ULTRA</span> • SOLUTIONS
          </p>
          <a href="/nm-mart" className="text-[10px] font-black text-slate-300 hover:text-slate-900 transition-colors uppercase tracking-[0.2em]">
            Staff Portal
          </a>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />
    </div>
  );
}
