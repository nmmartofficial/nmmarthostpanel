import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';
import { cn } from '../utils/helpers';

export default function AppConfigView({ appConfig, setAppConfig, fetchInitialData }) {
  const [formData, setFormData] = useState(appConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => { setFormData(appConfig); }, [appConfig]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const correctPin = appConfig?.security_pin || '1234';
    if (password === correctPin) {
      setIsVerified(true);
    } else {
      alert("Incorrect Password!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await handleERPAction(DB_SCHEMA.APP_CONFIG.table, ACTION_TYPES.BULK_UPSERT, [{ id: 'default', ...formData }]);
      if (res && !res.success) {
        throw new Error(`Database Error [AppConfig]: ${res.error}`);
      }
      alert("Settings Updated Successfully!");
      fetchInitialData();
    } catch (error) {
      console.error("AppConfig Update Error:", error);
      alert(`Update Failed!\n\nReason: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center pt-20">
        <form onSubmit={handlePasswordSubmit} className="flex items-center gap-4 bg-white p-8 rounded-xl shadow-sm border border-slate-100">
          <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Password :</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-64 border-2 border-blue-200 rounded-lg px-4 py-1.5 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all font-bold"
            autoFocus
          />
          <button 
            type="submit"
            className="bg-[#1e293b] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-md"
          >
            Submit
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
        <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md">
          <Settings size={20} />
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Global ERP Configuration</h3>
          <p className="text-slate-800 font-black text-[8px] uppercase tracking-widest">Master Store Controls</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-6">
          {/* Store & Branding */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
              <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Store & Branding</h4>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Official Store Name', name: 'store_name', type: 'text' },
                { label: 'Brand Name', name: 'brand_name', type: 'text' },
                { label: 'Logo URL', name: 'logo_url', type: 'text' },
                { label: 'Standard Delivery Msg', name: 'delivery_time_msg', type: 'text' },
              ].map(f => (
                <div key={f.name} className="space-y-1">
                  <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest ml-1">{f.label}</label>
                  {f.type === 'checkbox' ? (
                    <div className="flex items-center h-[34px]">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, [f.name]: !formData[f.name] })}
                        className={cn(
                          "w-12 h-6 rounded-full p-1 transition-all duration-300",
                          formData[f.name] ? "bg-blue-600" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform",
                          formData[f.name] ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  ) : (
                    <input 
                      type={f.type}
                      value={formData[f.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black focus:ring-1 focus:ring-blue-500 transition-all text-slate-900"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Theme Colors */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
              <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">App Theme Colors</h4>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Primary Color', name: 'primary_color', type: 'color' },
                { label: 'Secondary Color', name: 'secondary_color', type: 'color' },
                { label: 'Accent Color', name: 'accent_color', type: 'color' },
              ].map(f => (
                <div key={f.name} className="space-y-2">
                  <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest ml-1">{f.label}</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color"
                      value={formData[f.name] || '#FFFFFF'}
                      onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                      className="w-16 h-10 rounded-lg border-2 border-slate-200 cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={formData[f.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black focus:ring-1 focus:ring-blue-500 transition-all text-slate-900 uppercase"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial & Settings */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
              <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Financial & Settings</h4>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Free Delivery Threshold', name: 'min_order_free_delivery', type: 'number' },
                { label: 'Base Delivery Fee', name: 'delivery_charge', type: 'number' },
                { label: 'Order Handling Fee', name: 'handling_charge', type: 'number' },
                { label: 'Reward Cashback (%)', name: 'cashback_percentage', type: 'number' },
                { label: 'GST Tax Rate (%)', name: 'tax_rate', type: 'number' },
                { label: 'Security Admin PIN', name: 'security_pin', type: 'text' },
                { label: 'App Maintenance Mode', name: 'maintenance_mode', type: 'checkbox' },
                { label: 'App Version (Latest)', name: 'app_version', type: 'text' },
                { label: 'Force Update', name: 'force_update', type: 'checkbox' },
                { label: 'Guard Verification', name: 'enable_guard_verification', type: 'checkbox' },
              ].map(f => (
                <div key={f.name} className="space-y-1">
                  <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest ml-1">{f.label}</label>
                  {f.type === 'checkbox' ? (
                    <div className="flex items-center h-[34px]">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, [f.name]: !formData[f.name] })}
                        className={cn(
                          "w-12 h-6 rounded-full p-1 transition-all duration-300",
                          formData[f.name] ? "bg-blue-600" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 transform",
                          formData[f.name] ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  ) : (
                    <input 
                      type={f.type}
                      value={formData[f.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black focus:ring-1 focus:ring-blue-500 transition-all text-slate-900"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-slate-800 text-white font-black py-3 rounded-xl uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-3 hover:translate-y-[-1px] transition-all"
        >
          {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          Apply Global Settings
        </button>
      </form>
    </div>
  );
}
