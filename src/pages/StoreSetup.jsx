import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Save, RefreshCw, LogOut } from 'lucide-react';
import { supabase } from '../supabase';
import { secureStorage } from '../utils/security';
import { toast } from 'sonner';

export default function StoreSetup({ fetchInitialData, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const [nextCode, setNextCode] = useState('');

  useEffect(() => {
    const getNextCode = async () => {
      try {
        const { count } = await supabase.from('companies').select('*', { count: 'exact', head: true });
        const code = `NM${String((count || 0) + 1).padStart(3, '0')}`;
        setNextCode(code);
      } catch (e) {
        setNextCode('NM001');
      }
    };
    getNextCode();
  }, []);

  const handleLogout = () => {
    secureStorage.clear();
    window.location.href = '/nm-mart';
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    if (!shopName) return toast.error("कृपया दुकान का नाम लिखें");

    setLoading(true);
    try {
      const { data: company, error: compError } = await supabase
        .from('companies')
        .insert([{
          company_code: nextCode,
          company_name: shopName,
          owner_email: currentUser.email
        }])
        .select()
        .single();

      if (compError) throw compError;

      const { error: userError } = await supabase
        .from('admin_users')
        .update({ company_code: nextCode })
        .eq('username', currentUser.email);

      if (userError) throw userError;

      const updatedUser = { ...currentUser, company_code: nextCode };
      secureStorage.setItem('nm_user_data', updatedUser);

      toast.success(`बधाई हो! आपकी कंपनी का कोड है: ${nextCode}`);
      window.location.reload();
    } catch (error) {
      toast.error("सेटअप विफल: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-6 font-sans text-slate-900">
      <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="w-full max-w-md bg-white border border-slate-200 p-10 rounded-[32px] shadow-2xl space-y-8 relative">

        {/* Logout Button for when user is stuck */}
        <button
          onClick={handleLogout}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 transition-colors"
          title="Logout"
        >
          <LogOut size={20} />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Building2 size={40} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Setup Your Store</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Create your cloud workspace</p>
        </div>

        <form onSubmit={handleCreateStore} className="space-y-6">
          <div className="space-y-4 text-left">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Company Code</label>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xl font-black text-blue-600 shadow-inner">
                {nextCode || "Generating..."}
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Business Name</label>
              <input
                type="text" required value={shopName} onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Green Valley Supermarket"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <button disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="animate-spin" size={20} /> : "Launch My Workspace"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
