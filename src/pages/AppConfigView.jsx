import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';
import { cn } from '../utils/helpers';

export default function AppConfigView({ appConfig, setAppConfig, fetchInitialData, uploadImage }) {
  const [formData, setFormData] = useState(appConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [logoFile, setLogoFile] = useState(null);

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
      const finalData = {};
      
      // Only include valid database fields
      const validFields = [
        'id', 'store_name', 'brand_name', 'logo_url', 'delivery_time_msg',
        'primary_color', 'secondary_color', 'accent_color', 'delivery_charge',
        'tax_rate', 'security_pin', 'maintenance_mode'
      ];
      
      validFields.forEach(field => {
        if (formData[field] !== undefined) {
          finalData[field] = formData[field];
        }
      });
      
      if (logoFile) {
        const { url, error: uploadError } = await uploadImage(logoFile, 'product-images');
        if (uploadError) {
          console.warn('Logo upload failed, keeping existing logo');
        } else {
          finalData.logo_url = url;
        }
      }
      
      finalData.id = 'default';
      
      const res = await handleERPAction(DB_SCHEMA.APP_CONFIG.table, ACTION_TYPES.BULK_UPSERT, [finalData]);
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
              
              {/* Logo Upload Section */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-2">
                <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest ml-1">Logo</label>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center">
                      {(logoFile ? URL.createObjectURL(logoFile) : formData.logo_url) ? (
                        <img 
                          src={logoFile ? URL.createObjectURL(logoFile) : formData.logo_url} 
                          alt="Logo Preview" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-slate-400 text-xs font-black uppercase tracking-widest">No Logo</div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center justify-center w-full h-12 bg-slate-50 border border-slate-200 border-dashed rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                      <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Upload Logo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setLogoFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                    <input 
                      type="text" 
                      placeholder="Or paste logo URL"
                      value={formData.logo_url || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, logo_url: e.target.value });
                        setLogoFile(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black focus:ring-1 focus:ring-blue-500 transition-all text-slate-900"
                    />
                  </div>
                </div>
              </div>
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
                { label: 'Base Delivery Fee', name: 'delivery_charge', type: 'number' },
                { label: 'GST Tax Rate (%)', name: 'tax_rate', type: 'number' },
                { label: 'Security Admin PIN', name: 'security_pin', type: 'text' },
                { label: 'App Maintenance Mode', name: 'maintenance_mode', type: 'checkbox' },
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
