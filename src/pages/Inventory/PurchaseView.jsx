import React, { useState } from 'react';
import { 
  ShoppingCart, Search, Plus, PlusCircle, Trash2 
} from 'lucide-react';
import { handleERPAction, ACTION_TYPES } from '../../erpController';
import { generateUUID } from '../../utils/helpers';

export default function PurchaseView({ title, table, data, products, departments, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    bill_no: '',
    bill_date: new Date().toISOString().split('T')[0],
    department: 'NA',
    party_name: 'NA',
    tax_type: 'Include',
    items: []
  });
  const [currentItem, setCurrentItem] = useState({ name: '', barcode: '', qty: 1, purch_rate: 0, dis_percent: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredData = (data || []).filter(item => 
    item.bill_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = () => {
    if (!currentItem.name) return alert("Select an item first");
    const gst = 0; // Placeholder for GST logic
    const amount = (currentItem.qty * currentItem.purch_rate) * (1 - currentItem.dis_percent/100);
    const gst_amt = amount * (gst/100);
    
    setFormData({
      ...formData,
      items: [...formData.items, { ...currentItem, gst, gst_amt, amount: amount + gst_amt }]
    });
    setCurrentItem({ name: '', barcode: '', qty: 1, purch_rate: 0, dis_percent: 0 });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const totalQty = formData.items.reduce((sum, item) => sum + Number(item.qty), 0);
  const totalGst = formData.items.reduce((sum, item) => sum + Number(item.gst_amt), 0);
  const subTotal = formData.items.reduce((sum, item) => sum + Number(item.amount), 0);
  const finalBillAmt = Math.round(subTotal);
  const roundOff = subTotal - finalBillAmt;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) return alert("Add at least one item");
    setIsSubmitting(true);
    try {
      const purchaseId = editingItem?.id || generateUUID();
      const payload = { ...formData, id: purchaseId, bill_amount: finalBillAmt };
      
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, payload);
      } else {
        res = await handleERPAction(table, ACTION_TYPES.INSERT, payload);
      }
      
      if (res && !res.success) throw new Error(res.error);
      
      setShowForm(false);
      setEditingItem(null);
      setFormData({ bill_no: '', bill_date: new Date().toISOString().split('T')[0], department: 'NA', party_name: 'NA', tax_type: 'Include', items: [] });
      await fetchInitialData();
      alert(`Purchase saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* List View matching Screenshot 1 */}
      {!showForm ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-slate-100 rounded text-slate-900 border border-slate-200">
                <ShoppingCart size={20} />
              </div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-64 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input 
                    type="text"
                    placeholder="Search Bill No"
                    className="w-full bg-slate-100 border border-transparent rounded-xl pl-10 pr-4 py-2 text-xs font-black uppercase tracking-tighter focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600 tracking-tighter">
                  <span className="opacity-60">From :</span>
                  <input type="date" className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:border-blue-500 outline-none transition-all shadow-inner" />
                  <span className="opacity-60">To :</span>
                  <input type="date" className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:border-blue-500 outline-none transition-all shadow-inner" />
                </div>
              </div>
            </div>

            <button 
              onClick={() => { setEditingItem(null); setShowForm(true); }}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2"
            >
              <Plus size={18} /> Purchase
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase">Bill Date</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase">Bill No</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase">Party</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase">Department</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase text-right">Bill Amt</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length > 0 ? filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">{item.bill_date}</td>
                    <td className="px-6 py-4 text-xs font-black text-slate-900 uppercase">{item.bill_no}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">{item.party_name}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">{item.department}</td>
                    <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">{item.bill_amount}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }} className="text-blue-600 hover:underline font-black text-[10px] uppercase mr-3">Edit</button>
                      <button onClick={async () => {
                          await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                          fetchInitialData();
                        }} className="text-red-600 hover:underline font-black text-[10px] uppercase">Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className="py-20 text-center text-slate-400 font-black uppercase text-[10px]">No purchase records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Entry Form matching Screenshot 2 */
        <div className="fixed inset-0 z-[600] bg-white flex flex-col">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-[#81E6D9] via-[#FEB2B2] to-[#81E6D9] p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2 text-white font-black uppercase">
                <ShoppingCart size={20} /> Purchase
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-white uppercase">Bill No :</label>
                <input 
                  type="text" 
                  value={formData.bill_no} 
                  onChange={(e) => setFormData({...formData, bill_no: e.target.value})}
                  className="bg-white border-none rounded px-3 py-1 text-sm font-bold w-32 outline-none" 
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-white uppercase">Bill Date :</label>
                <input 
                  type="date" 
                  value={formData.bill_date}
                  onChange={(e) => setFormData({...formData, bill_date: e.target.value})}
                  className="bg-white border-none rounded px-3 py-1 text-sm font-bold outline-none" 
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-white uppercase">Department :</label>
                <select 
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="bg-white border-none rounded px-3 py-1 text-sm font-bold outline-none"
                >
                  <option value="NA">NA</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Party & Tax Row */}
            <div className="flex items-center gap-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Select Party</label>
                <select 
                  value={formData.party_name}
                  onChange={(e) => setFormData({...formData, party_name: e.target.value})}
                  className="bg-white border border-slate-200 rounded px-3 py-1.5 text-sm font-bold w-64 outline-none"
                >
                  <option value="NA">NA</option>
                  {/* Parties mapping would go here */}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Tax Type</label>
                <select 
                  value={formData.tax_type}
                  onChange={(e) => setFormData({...formData, tax_type: e.target.value})}
                  className="bg-white border border-slate-200 rounded px-3 py-1.5 text-sm font-bold outline-none"
                >
                  <option value="Include">Include</option>
                  <option value="Exclude">Exclude</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase">S.T. No :</label>
                <input type="text" className="bg-white border border-slate-200 rounded px-3 py-1.5 text-sm font-bold w-24 outline-none" />
              </div>
              <button className="bg-white border border-slate-300 text-slate-600 px-4 py-1.5 rounded text-xs font-bold shadow-sm hover:bg-slate-50">View Bill</button>
            </div>

            {/* Item Input Row */}
            <div className="grid grid-cols-12 gap-4 items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Item Name</label>
                <input 
                  type="text" 
                  placeholder="Search for items..." 
                  value={currentItem.name}
                  onChange={(e) => setCurrentItem({...currentItem, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-bold outline-none" 
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Barcode</label>
                <input 
                  type="text" 
                  value={currentItem.barcode}
                  onChange={(e) => setCurrentItem({...currentItem, barcode: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-bold outline-none" 
                />
              </div>
              <div className="col-span-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Qty</label>
                <input 
                  type="number" 
                  value={currentItem.qty}
                  onChange={(e) => setCurrentItem({...currentItem, qty: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-bold outline-none" 
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Purch Rate</label>
                <input 
                  type="number" 
                  value={currentItem.purch_rate}
                  onChange={(e) => setCurrentItem({...currentItem, purch_rate: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-bold outline-none" 
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Dis %</label>
                <input 
                  type="number" 
                  value={currentItem.dis_percent}
                  onChange={(e) => setCurrentItem({...currentItem, dis_percent: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-bold outline-none" 
                />
              </div>
              <div className="col-span-2">
                <button 
                  onClick={addItem}
                  className="w-full bg-[#FEB2B2] text-slate-800 py-2 rounded font-black text-xs uppercase flex items-center justify-center gap-2 shadow-sm border border-red-200 hover:bg-red-200"
                >
                  <PlusCircle size={14} className="text-red-600" /> Add
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#81E6D9] via-[#FEB2B2] to-[#81E6D9] border-b border-slate-200">
                    <th className="px-4 py-2 text-[10px] font-black text-slate-800 uppercase">Item Name</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-800 uppercase text-center">Barcode</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-800 uppercase text-center">Qty</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-800 uppercase text-center">Purc Rate</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-800 uppercase text-center">Dis %</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-800 uppercase text-center">Dis Amt</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-800 uppercase text-center">Gst</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-800 uppercase text-center">Gst Amt</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-800 uppercase text-center">Amount</th>
                    <th className="px-4 py-2 text-[10px] font-black text-slate-800 uppercase text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors font-bold text-[10px] text-slate-700">
                      <td className="px-4 py-2 uppercase">{item.name}</td>
                      <td className="px-4 py-2 text-center">{item.barcode}</td>
                      <td className="px-4 py-2 text-center">{item.qty}</td>
                      <td className="px-4 py-2 text-center">{item.purch_rate}</td>
                      <td className="px-4 py-2 text-center">{item.dis_percent}%</td>
                      <td className="px-4 py-2 text-center">0.00</td>
                      <td className="px-4 py-2 text-center">{item.gst}%</td>
                      <td className="px-4 py-2 text-center">{item.gst_amt.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center font-black">{item.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#1E293B] text-white font-black text-xs">
                    <td colSpan="2" className="px-4 py-2 text-right uppercase">Total :</td>
                    <td className="px-4 py-2 text-center">{totalQty.toFixed(2)}</td>
                    <td colSpan="4"></td>
                    <td className="px-4 py-2 text-center">{totalGst.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">{subTotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Summary */}
          <div className="bg-white border-t-2 border-slate-200 p-4 flex justify-between items-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <div className="flex gap-4">
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-10 py-2 rounded-lg font-black uppercase tracking-widest text-xs shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={() => setShowForm(false)}
                className="bg-white border-2 border-blue-400 text-blue-500 px-10 py-2 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-blue-50 transition-all"
              >
                Cancel
              </button>
            </div>
            <div className="bg-[#1E293B] text-white rounded-lg overflow-hidden flex shadow-lg">
              <div className="px-6 py-2 border-r border-slate-700 flex flex-col items-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Round-off :</span>
                <span className="text-sm font-black">{roundOff.toFixed(2)}</span>
              </div>
              <div className="px-10 py-2 flex flex-col items-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bill Amount :</span>
                <span className="text-xl font-black">{finalBillAmt.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
