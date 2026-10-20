import React, { useEffect, useState } from 'react';
import { RotateCcw, Save, Settings2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  normalizePOSLayoutSettings,
  POS_LAYOUT_DEFAULTS
} from './posLayoutSettings';

const sections = [
  ['layout', 'Screen Layout'],
  ['cart', 'Billing Cart'],
  ['products', 'Product Selection'],
  ['buttons', 'Billing Buttons'],
  ['payment', 'Payment Panel'],
  ['display', 'Display & Appearance'],
  ['shortcuts', 'Keyboard Shortcuts']
];

const buttonOptions = [
  ['deleteSelected', 'Delete Selected'],
  ['discountCoupon', 'Discount / Coupon'],
  ['holdBill', 'Hold Bill'],
  ['heldBills', 'Held Bills'],
  ['ordersReturns', 'Orders / Returns'],
  ['splitTender', 'Split Tender'],
  ['shift', 'Cashier Shift'],
  ['activity', 'Activity'],
  ['devices', 'Devices'],
  ['clearBill', 'Clear Bill']
];

const shortcutRows = [
  ['F1', 'Search products'],
  ['F2', 'Customer search'],
  ['F3', 'Hold bill'],
  ['F4', 'Held bills'],
  ['F6', 'Cash payment'],
  ['F7', 'Cashier shift'],
  ['F8', 'Discount / coupon'],
  ['F9', 'Activity'],
  ['F10', 'Devices'],
  ['F12', 'Checkout'],
  ['+ / −', 'Adjust selected quantity'],
  ['Delete', 'Remove selected item']
];

const POSSettingsDialog = ({
  open,
  initialSettings,
  canManage,
  onClose,
  onPreview,
  onCancelPreview,
  onSave
}) => {
  const [section, setSection] = useState('layout');
  const [draft, setDraft] = useState(() => normalizePOSLayoutSettings(initialSettings));
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(normalizePOSLayoutSettings(initialSettings));
      setSection('layout');
      setPreviewing(false);
    }
  }, [open, initialSettings]);

  if (!open) return null;

  const update = (key, value) => setDraft((current) => normalizePOSLayoutSettings({ ...current, [key]: value }));
  const updateNested = (key, name, value) => setDraft((current) => normalizePOSLayoutSettings({
    ...current,
    [key]: { ...current[key], [name]: value }
  }));

  const save = async (settings) => {
    if (!canManage) {
      toast.error('Only an authorized store administrator can save shared POS settings.');
      return;
    }
    setSaving(true);
    try {
      await onSave(normalizePOSLayoutSettings(settings));
      setPreviewing(false);
    } catch (error) {
      toast.error(error?.message || 'POS settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (previewing) onCancelPreview();
    setPreviewing(false);
    onClose();
  };

  const preview = () => {
    onPreview(normalizePOSLayoutSettings(draft));
    setPreviewing(true);
  };

  const reset = async () => {
    if (!window.confirm('Reset shared POS layout preferences to the documented defaults? Business and checkout settings will not change.')) return;
    await save(POS_LAYOUT_DEFAULTS);
  };

  const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
  const labelClass = 'block text-xs font-bold text-slate-700';

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-3" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-settings-title"
        className="flex max-h-[min(90vh,760px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings2 size={19} className="text-blue-700" />
            <div>
              <h2 id="pos-settings-title" className="text-sm font-black text-slate-900">POS Layout & Settings</h2>
              <p className="text-[10px] font-medium text-slate-500">Shared presentation preferences for this store</p>
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Close POS settings" className="rounded-md p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900">
            <X size={17} />
          </button>
        </header>

        {!canManage && (
          <p role="alert" className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">
            You can view shared POS settings, but only an authorized store administrator can change them.
          </p>
        )}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav aria-label="POS settings sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2 md:w-52 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            {sections.map(([id, title]) => (
              <button
                key={id}
                type="button"
                aria-pressed={section === id}
                onClick={() => setSection(id)}
                className={`shrink-0 rounded-md px-3 py-2 text-left text-xs font-bold ${section === id ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                {title}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {section === 'layout' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>Billing panel share: {Math.round((draft.billingRatio / (draft.billingRatio + 1)) * 100)}%
                  <input aria-label="Billing panel share" className="mt-2 w-full accent-blue-700" type="range" min="1.2" max="2.2" step="0.1" value={draft.billingRatio} onChange={(event) => update('billingRatio', Number(event.target.value))} />
                  <span className="mt-1 block text-[10px] font-medium text-slate-500">Product panel keeps at least 320px where screen width allows.</span>
                </label>
                <label className={labelClass}>Density
                  <select className={`${inputClass} mt-1`} value={draft.density} onChange={(event) => update('density', event.target.value)}>
                    <option value="compact">Compact</option><option value="standard">Standard</option><option value="comfortable">Comfortable</option>
                  </select>
                </label>
                <Toggle label="Compact header" checked={draft.compactHeader} onChange={(value) => update('compactHeader', value)} />
                <Toggle label="Show customer section" checked={draft.showCustomerSection} onChange={(value) => update('showCustomerSection', value)} />
                <Toggle label="Show cashier status footer" checked={draft.showStatusFooter} onChange={(value) => update('showStatusFooter', value)} />
              </div>
            )}

            {section === 'cart' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <RangeField label="Cart row height" value={draft.cartRowHeight} min={36} max={64} suffix="px" onChange={(value) => update('cartRowHeight', value)} />
                <RangeField label="POS font scale" value={draft.fontScale} min={0.9} max={1.15} step={0.05} suffix="×" onChange={(value) => update('fontScale', value)} />
                <fieldset className="sm:col-span-2">
                  <legend className={labelClass}>Optional table columns</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {[
                      ['mrp', 'MRP'],
                      ['discount', 'Discount %'],
                      ['gst', 'GST %'],
                      ['saleRate', 'Sale Rate'],
                      ['actions', 'Line actions']
                    ].map(([id, label]) => (
                      <Toggle key={id} label={label} checked={draft.cartColumns[id]} onChange={(value) => updateNested('cartColumns', id, value)} />
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">Sr. No., Item, Qty and Total remain visible. Hidden columns do not change calculations or checkout data.</p>
                </fieldset>
              </div>
            )}

            {section === 'products' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <RangeField label="Product tile minimum width" value={draft.productButtonMinWidth} min={100} max={200} suffix="px" onChange={(value) => update('productButtonMinWidth', value)} />
                <RangeField label="Product tile height" value={draft.productButtonMinHeight} min={48} max={104} suffix="px" onChange={(value) => update('productButtonMinHeight', value)} />
                <label className={labelClass}>Product grid columns
                  <select className={`${inputClass} mt-1`} value={draft.productGridColumns} onChange={(event) => update('productGridColumns', Number(event.target.value))}>
                    {[2, 3, 4].map((value) => <option key={value} value={value}>{value} columns</option>)}
                  </select>
                </label>
                <label className={labelClass}>Default product view
                  <select className={`${inputClass} mt-1`} value={draft.defaultProductMode} onChange={(event) => update('defaultProductMode', event.target.value)}>
                    <option value="closed">Closed until selected</option><option value="trending">Trending Items</option><option value="all">All Items</option>
                  </select>
                </label>
                <p className="sm:col-span-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs font-semibold text-blue-900">Product photos are disabled and cannot be enabled in POS Settings. Product lists remain scrollable and use live store data.</p>
              </div>
            )}

            {section === 'buttons' && (
              <>
                <p className="mb-3 text-xs text-slate-600">Hide optional buttons from the billing action area. Existing shortcuts and confirmations remain unchanged. Payment and checkout controls cannot be hidden.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {buttonOptions.map(([id, label]) => (
                    <Toggle key={id} label={label} checked={draft.billingButtons[id]} onChange={(value) => updateNested('billingButtons', id, value)} />
                  ))}
                </div>
              </>
            )}

            {section === 'payment' && (
              <div className="space-y-4">
                <label className={`${labelClass} max-w-sm`}>Payment panel
                  <select className={`${inputClass} mt-1`} value={draft.paymentPlacement} onChange={(event) => update('paymentPlacement', event.target.value)}>
                    <option value="right">Right-side payment dock</option>
                    <option value="on-demand">On demand (open existing payment dialog)</option>
                  </select>
                </label>
                <Toggle label="Show amount received in dock" checked={draft.showAmountReceived} onChange={(value) => update('showAmountReceived', value)} />
                <Toggle label="Show change due in dock" checked={draft.showChangeDue} onChange={(value) => update('showChangeDue', value)} />
                <Toggle label="Show quick amount buttons" checked={draft.showQuickAmounts} onChange={(value) => update('showQuickAmounts', value)} />
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">Cash, UPI and Card remain available. Amount validation and the existing payment dialog are unchanged; payment cannot be hidden.</p>
              </div>
            )}

            {section === 'display' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>NM MART theme
                  <select className={`${inputClass} mt-1`} value={draft.theme} onChange={(event) => update('theme', event.target.value)}>
                    <option value="navy">Navy</option><option value="blue">Blue</option>
                  </select>
                </label>
                <label className={labelClass}>Density
                  <select className={`${inputClass} mt-1`} value={draft.density} onChange={(event) => update('density', event.target.value)}>
                    <option value="compact">Compact</option><option value="standard">Standard</option><option value="comfortable">Comfortable</option>
                  </select>
                </label>
                <RangeField label="Font scale" value={draft.fontScale} min={0.9} max={1.15} step={0.05} suffix="×" onChange={(value) => update('fontScale', value)} />
                <Toggle label="Show keyboard shortcut footer" checked={draft.showShortcutFooter} onChange={(value) => update('showShortcutFooter', value)} />
                <p className="sm:col-span-2 text-[10px] text-slate-500">Only NM MART navy/blue themes are available. Required alerts, payment actions and validation messages always remain visible.</p>
              </div>
            )}

            {section === 'shortcuts' && (
              <>
                <p className="mb-3 text-xs text-slate-600">These shortcuts are fixed to the existing POS handlers. Custom assignments are unavailable to avoid scanner conflicts and destructive-action collisions.</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {shortcutRows.map(([key, action]) => (
                    <div key={key} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-xs">
                      <span className="font-semibold text-slate-700">{action}</span><kbd className="rounded bg-slate-100 px-2 py-1 font-black text-slate-800">{key}</kbd>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex gap-2">
            <button type="button" disabled={saving || !canManage} onClick={reset} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-50">
              <RotateCcw size={14} /> Reset to defaults
            </button>
            {previewing && <button type="button" disabled={saving} onClick={() => { onCancelPreview(); setPreviewing(false); }} className="min-h-9 rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-900">Cancel preview</button>}
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={preview} className="min-h-9 rounded-md border border-blue-300 bg-white px-3 text-xs font-bold text-blue-800 disabled:opacity-50">Preview</button>
            <button type="button" disabled={saving || !canManage} onClick={() => save(draft)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-blue-700 px-4 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-50">
              <Save size={14} /> {saving ? 'Saving…' : 'Save / Apply'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
};

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
    <span>{label}</span>
    <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-blue-700" />
  </label>
);

const RangeField = ({ label, value, min, max, step = 1, suffix, onChange }) => (
  <label className="block text-xs font-bold text-slate-700">
    {label}: {value}{suffix}
    <input className="mt-2 w-full accent-blue-700" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>
);

export default POSSettingsDialog;
