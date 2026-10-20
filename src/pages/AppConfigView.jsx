import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuthContext } from '../context/AuthContext';
import { DB_SCHEMA } from '../dbSchema';
import { cn } from '../utils/helpers';
import { toast } from 'sonner';

const getCurrentBrowserName = () => {
  const userAgent = navigator.userAgent || '';
  if (/EdgA?\/|EdgiOS\//.test(userAgent)) return 'Edge';
  if (/OPR\/|OPiOS\//.test(userAgent)) return 'Opera';
  if (/CriOS\/|Chrome\//.test(userAgent)) return 'Chrome';
  if (/FxiOS\/|Firefox\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return 'Unknown';
};

export default function AppConfigView({
  appConfig,
  appConfigRows = [],
  appConfigLoadError = '',
  dataReady = false,
  setAppConfig,
  fetchInitialData,
  uploadImage
}) {
  const { currentUser, isAuthenticated } = useAuthContext();
  const [formData, setFormData] = useState(appConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [isGeneratingFcmToken, setIsGeneratingFcmToken] = useState(false);
  const [fcmTokenStatus, setFcmTokenStatus] = useState('');

  const handleGenerateFcmToken = async () => {
    const allowedRoles = new Set(['super_admin', 'admin', 'manager']);
    setIsGeneratingFcmToken(true);
    setFcmTokenStatus('');

    const diagnostics = {
      tokenGenerated: false,
      currentAuthUserExists: false,
      adminProfileFound: false,
      role: null,
      tenant_id: null,
      company_code: null,
      registrationAttempted: false,
      supabaseErrorCode: null,
      supabaseErrorMessage: null,
      registrationSuccess: false
    };
    let generatedToken = '';
    const recordSupabaseError = (error) => {
      diagnostics.supabaseErrorCode = error?.code || null;
      const message = String(error?.message || '');
      diagnostics.supabaseErrorMessage = generatedToken
        ? message.replaceAll(generatedToken, '[redacted]')
        : message;
    };

    try {
      if (
        typeof Notification === 'undefined' ||
        !window.isSecureContext ||
        !navigator.serviceWorker
      ) {
        throw new Error('This browser or connection does not support FCM Web Push.');
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        recordSupabaseError(authError);
        throw authError;
      }
      const authUser = authData?.user;
      diagnostics.currentAuthUserExists = Boolean(authUser?.id);
      if (!authUser?.id) {
        throw new Error('An authenticated Supabase user is required to register browser push.');
      }

      if (!isAuthenticated) {
        throw new Error('The admin session is not authenticated. Please sign in again.');
      }

      const { data: adminProfile, error: profileError } = await supabase
        .from('admin_users')
        .select('auth_user_id, role, tenant_id, company_code, is_active, status')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (profileError) {
        recordSupabaseError(profileError);
        throw profileError;
      }

      diagnostics.adminProfileFound = Boolean(adminProfile);
      diagnostics.role = adminProfile?.role ?? null;
      diagnostics.tenant_id = adminProfile?.tenant_id ?? null;
      diagnostics.company_code = adminProfile?.company_code ?? null;

      const role = String(adminProfile?.role || '').trim().toLowerCase();
      const profileStatus = String(adminProfile?.status || '').trim().toLowerCase();
      const tenantId = adminProfile?.tenant_id;
      const companyCode = adminProfile?.company_code;

      if (
        !adminProfile ||
        adminProfile.auth_user_id !== authUser.id ||
        !allowedRoles.has(role) ||
        adminProfile.is_active !== true ||
        profileStatus !== 'active' ||
        tenantId == null ||
        !companyCode
      ) {
        throw new Error('An active authorized admin profile with tenant and company scope is required.');
      }

      if (Notification.permission === 'denied') {
        throw new Error('Notification permission is blocked in browser settings.');
      }
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Notification permission was not granted.');
        }
      }

      const { requestAdminFcmToken } = await import('../utils/firebaseMessaging.js');
      const response = await requestAdminFcmToken();
      generatedToken = typeof response?.token === 'string' ? response.token : '';
      diagnostics.tokenGenerated = Boolean(generatedToken);

      if (response?.status !== 'granted' || !generatedToken) {
        const messages = {
          unsupported: 'This browser or connection does not support FCM Web Push.',
          'permission-denied': 'Notification permission is blocked in browser settings.',
          'permission-not-granted': 'Notification permission was not granted.',
          'token-unavailable': 'Firebase did not return a registration token.'
        };
        setFcmTokenStatus(messages[response.status] || 'FCM token generation did not complete.');
        return;
      }

      setFcmTokenStatus('Token generated. It was not saved.');

      const now = new Date().toISOString();
      diagnostics.registrationAttempted = true;
      const { data: registration, error: registrationError } = await supabase
        .from('admin_device_tokens')
        .upsert({
          auth_user_id: authUser.id,
          tenant_id: tenantId,
          company_code: companyCode,
          device_token: generatedToken,
          platform: 'web',
          browser: getCurrentBrowserName(),
          is_active: true,
          last_seen_at: now,
          updated_at: now
        }, { onConflict: 'device_token' })
        .select('id')
        .single();

      if (registrationError) {
        recordSupabaseError(registrationError);
        throw registrationError;
      }
      if (!registration?.id) {
        throw new Error('Supabase did not confirm the browser device registration.');
      }
      diagnostics.registrationSuccess = true;
      setFcmTokenStatus('Browser push enabled successfully.');
    } catch (error) {
      const message = String(error?.message || 'FCM token registration failed.');
      const safeMessage = generatedToken ? message.replaceAll(generatedToken, '[redacted]') : message;
      setFcmTokenStatus(`Browser push registration failed: ${safeMessage}`);
    } finally {
      if (import.meta.env.DEV) {
        console.info('[FCM registration diagnostics]', diagnostics);
      }
      generatedToken = '';
      setIsGeneratingFcmToken(false);
    }
  };

  useEffect(() => {
    // Initialize formData only with fields that exist in appConfig (from DB)
    if (appConfig) {
      const filteredFormData = {};
      Object.keys(appConfig).forEach(key => {
        filteredFormData[key] = appConfig[key];
      });
      setFormData(filteredFormData);
    }
  }, [appConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveStatus('');
    let savedCount = 0;
    try {
      if (appConfigLoadError) {
        throw new Error('Configuration failed to load. Retry before saving.');
      }
      if (!currentUser?.tenant_id || !currentUser?.company_code) {
        throw new Error('Company and tenant context are required to save configuration.');
      }

      const valuesToSave = {};
      for (const [field, metadata] of Object.entries(ALL_FIELDS)) {
        if (
          !Object.prototype.hasOwnProperty.call(appConfig || {}, field)
          || formData[field] === undefined
          || JSON.stringify(formData[field]) === JSON.stringify(appConfig[field])
        ) {
          continue;
        }

        let value = formData[field];
        if (metadata.type === 'number') {
          value = Number(value);
          if (!Number.isFinite(value) || value < 0 || value > 100000000) {
            throw new Error(`${metadata.label} must be a valid non-negative number.`);
          }
          if (metadata.category === 'financial' && /percentage|tax_rate/.test(field) && value > 100) {
            throw new Error(`${metadata.label} cannot be greater than 100%.`);
          }
        } else if (metadata.type === 'color' && !/^#[0-9a-f]{6}$/i.test(String(value))) {
          throw new Error(`${metadata.label} must be a six-digit hex color.`);
        } else if (metadata.type === 'textarea') {
          try {
            value = JSON.parse(value);
          } catch {
            throw new Error(`${metadata.label} must contain valid JSON.`);
          }
          if (!value || Array.isArray(value) || typeof value !== 'object') {
            throw new Error(`${metadata.label} must be a JSON object.`);
          }
        } else if (metadata.type === 'checkbox') {
          value = Boolean(value);
        } else {
          value = String(value).trim();
          if (value.length > 2000) throw new Error(`${metadata.label} is too long.`);
        }
        valuesToSave[field] = value;
      }

      if (logoFile && Object.prototype.hasOwnProperty.call(appConfig || {}, 'logo_url')) {
        const { url, error: uploadError } = await uploadImage(logoFile, 'images');
        if (uploadError || !url) throw uploadError || new Error('Logo upload did not return a URL.');
        valuesToSave.logo_url = url;
      }

      if (Object.keys(valuesToSave).length === 0) {
        setSaveStatus('No changes to save.');
        return;
      }

      for (const [key, value] of Object.entries(valuesToSave)) {
        const row = appConfigRows.find((entry) => entry.key === key);
        if (!row?.id) throw new Error(`The existing "${key}" setting could not be located.`);
        const { data, error } = await supabase
          .from(DB_SCHEMA.APP_CONFIG.table)
          .update({ value, updated_at: new Date().toISOString() })
          .eq('id', row.id)
          .eq('tenant_id', currentUser.tenant_id)
          .eq('company_code', currentUser.company_code)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (!data?.id) throw new Error(`The backend did not confirm saving "${key}".`);
        savedCount += 1;
      }

      setAppConfig((previous) => ({ ...previous, ...valuesToSave }));
      setSaveStatus(`Saved ${savedCount} setting${savedCount === 1 ? '' : 's'} successfully.`);
      toast.success('Configuration saved');
      await fetchInitialData(true, false);
    } catch (error) {
      const message = savedCount > 0
        ? `${savedCount} setting(s) were saved before the next update failed: ${error.message}`
        : error.message || 'Configuration could not be saved.';
      setSaveStatus(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!dataReady || appConfigLoadError) {
    return (
      <div className="max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900" role="status">
        {appConfigLoadError
          ? `Configuration load failed: ${appConfigLoadError}. Existing values have not been replaced.`
          : 'Loading company configuration…'}
        {appConfigLoadError && (
          <button type="button" onClick={() => fetchInitialData(true, false)} className="ml-3 font-bold underline">
            Retry
          </button>
        )}
      </div>
    );
  }

  // Define all possible fields with their metadata
  const ALL_FIELDS = {
    store_name: { label: 'Official Store Name', type: 'text', category: 'branding' },
    brand_name: { label: 'Brand Name', type: 'text', category: 'branding' },
    logo_url: { label: 'Logo URL', type: 'text', category: 'branding' },
    delivery_time_msg: { label: 'Standard Delivery Msg', type: 'text', category: 'branding' },
    primary_color: { label: 'Primary Color', type: 'color', category: 'theme' },
    secondary_color: { label: 'Secondary Color', type: 'color', category: 'theme' },
    accent_color: { label: 'Accent Color', type: 'color', category: 'theme' },
    min_order_free_delivery: { label: 'Free Delivery Threshold', type: 'number', category: 'financial' },
    delivery_charge: { label: 'Base Delivery Fee', type: 'number', category: 'financial' },
    handling_charge: { label: 'Order Handling Fee', type: 'number', category: 'financial' },
    cashback_percentage: { label: 'Reward Cashback (%)', type: 'number', category: 'financial' },
    tax_rate: { label: 'GST Tax Rate (%)', type: 'number', category: 'financial' },
    pos_gst_pricing_mode: { label: 'POS GST Pricing Mode (Tenant-wide)', type: 'text', category: 'financial', readOnly: true },
    navigation_config: { label: 'Navigation Buttons (JSON)', type: 'textarea', category: 'settings' },
    maintenance_mode: { label: 'App Maintenance Mode', type: 'checkbox', category: 'settings' },
    app_version: { label: 'App Version (Latest)', type: 'text', category: 'settings' },
    force_update: { label: 'Force Update', type: 'checkbox', category: 'settings' },
    enable_guard_verification: { label: 'Guard Verification', type: 'checkbox', category: 'settings' }
  };

  // Get existing fields from appConfig
  const existingFields = appConfig
    ? Object.keys(appConfig).filter((field) => !/(?:secret|token|api.?key|password|security.?pin|private.?key)/i.test(field))
    : [];

  // Get fields by category
  const getFieldsByCategory = (category) => {
    return existingFields
      .filter((field) => {
        const metadata = ALL_FIELDS[field];
        if (!metadata) return false;
        const rowGroup = String(appConfigRows.find((row) => row.key === field)?.group_name || '').toLowerCase();
        const actualCategory = rowGroup.includes('brand')
          ? 'branding'
          : rowGroup.includes('theme') || rowGroup.includes('appearance')
            ? 'theme'
            : rowGroup.includes('finan') || rowGroup.includes('payment')
              ? 'financial'
              : rowGroup.includes('setting') || rowGroup.includes('general')
                ? 'settings'
                : metadata.category;
        return actualCategory === category;
      })
      .map(field => ({ name: field, ...ALL_FIELDS[field] }));
  };

  const brandingFields = getFieldsByCategory('branding');
  const themeFields = getFieldsByCategory('theme');
  const financialFields = getFieldsByCategory('financial');
  const settingsFields = getFieldsByCategory('settings');

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col max-w-4xl bg-white rounded-2xl border border-neutral-200 shadow-enterprise overflow-hidden">
      <div className="p-6 border-b border-neutral-100 flex items-center gap-4 bg-neutral-50/50 flex-shrink-0">
        <div className="p-2.5 bg-primary-600 rounded-xl text-white shadow-lg shadow-primary-600/20">
          <Settings size={22} />
        </div>
        <div>
          <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest">Company Configuration</h3>
          <p className="text-neutral-400 font-black text-[9px] uppercase tracking-widest mt-0.5">{currentUser?.company_code || 'Company scope unavailable'}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="space-y-8">
            {existingFields.filter((field) => ALL_FIELDS[field]).length === 0 && (
              <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                No supported configuration values are stored for this company. No defaults will be written automatically.
              </div>
            )}
            {import.meta.env.DEV && (
              <section className="border border-neutral-200 rounded-xl p-5 space-y-3">
                <div>
                  <h4 className="text-xs font-black text-neutral-800 uppercase tracking-widest">Browser Push Test</h4>
                  <p className="mt-1 text-xs text-neutral-500">Generate a local FCM token. It will not be saved to the database.</p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateFcmToken}
                  disabled={isGeneratingFcmToken}
                  className="bg-primary-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {isGeneratingFcmToken ? 'Generating token...' : 'Request permission and generate token'}
                </button>
                {fcmTokenStatus && <p role="status" className="text-xs text-neutral-600">{fcmTokenStatus}</p>}
              </section>
            )}
            {/* Store & Branding */}
            {(brandingFields.length > 0 || existingFields.includes('logo_url')) && (
              <div className="border border-neutral-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-neutral-50 px-5 py-3.5 border-b border-neutral-100">
                  <h4 className="text-[11px] font-black text-neutral-800 uppercase tracking-widest">Store & Branding</h4>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {brandingFields.filter(f => f.name !== 'logo_url').map(f => (
                    <div key={f.name} className="space-y-2">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">{f.label}</label>
                      {f.type === 'checkbox' ? (
                        <div className="flex items-center h-[42px]">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, [f.name]: !formData[f.name] })}
                            className={cn(
                              "w-12 h-6 rounded-full transition-all duration-300 relative shadow-inner",
                              formData[f.name] ? "bg-primary-600" : "bg-neutral-300"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 absolute top-1",
                              formData[f.name] ? "left-7" : "left-1"
                            )} />
                          </button>
                        </div>
                      ) : f.type === 'textarea' ? (
                        <textarea
                          value={typeof formData[f.name] === 'string' ? formData[f.name] : JSON.stringify(formData[f.name] || {}, null, 2)}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          rows={8}
                          className="w-full bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 py-2.5 text-[10px] font-black focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all text-neutral-900 outline-none resize-y"
                        />
                      ) : (
                        <input
                          type={f.type}
                          value={formData[f.name] || ''}
                          readOnly={f.readOnly === true}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          className={`w-full bg-neutral-50 border-2 border-neutral-100 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all text-neutral-900 outline-none ${f.readOnly ? 'cursor-not-allowed opacity-70' : ''}`}
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
            )}

            {/* Theme Colors */}
            {themeFields.length > 0 && (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">App Theme Colors</h4>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {themeFields.map(f => (
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
            )}

            {/* Financial & Settings */}
            {(financialFields.length > 0 || settingsFields.length > 0) && (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Financial & Settings</h4>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...financialFields, ...settingsFields].map(f => (
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
                      ) : f.type === 'textarea' ? (
                        <textarea
                          value={typeof formData[f.name] === 'string' ? formData[f.name] : JSON.stringify(formData[f.name] || {}, null, 2)}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          rows={6}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black focus:ring-1 focus:ring-blue-500 transition-all text-slate-900 resize-y"
                        />
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
            )}
          </div>
        </div>
        <div className="p-4 bg-white border-t border-neutral-100 flex-shrink-0">
          <p role="status" aria-live="polite" className="mb-3 text-center text-xs text-neutral-600">{saveStatus}</p>
          <button
            type="submit"
            disabled={isSubmitting || Boolean(appConfigLoadError)}
            className="w-full bg-primary-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[11px] shadow-xl shadow-primary-600/20 flex items-center justify-center gap-3 hover:bg-primary-700 hover:translate-y-[-2px] transition-all disabled:opacity-50"
          >
            {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            Save Company Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
