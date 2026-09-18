import React, { useMemo, useState } from 'react';
import { FileText, Plus, Search } from 'lucide-react';

export default function PurchaseView({ title = 'Purchase History', data = [], accounts = [], onNewPurchase }) {
  const [searchTerm, setSearchTerm] = useState('');

  const supplierNames = useMemo(() => new Map(
    accounts.map((account) => [String(account.id), account.name])
  ), [accounts]);

  const filteredPurchases = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return data;
    return data.filter((purchase) => {
      const invoice = String(purchase.invoice_number || '').toLowerCase();
      const supplier = String(supplierNames.get(String(purchase.supplier_id)) || '').toLowerCase();
      return invoice.includes(query) || supplier.includes(query);
    });
  }, [data, searchTerm, supplierNames]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700 border border-slate-200">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Read-only purchase records</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search invoice or supplier"
              className="w-full bg-slate-100 border border-transparent rounded-xl pl-10 pr-4 py-2 text-xs font-black uppercase tracking-tighter focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={onNewPurchase}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={16} /> New Purchase
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase">Invoice Date</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase">Invoice No</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase">Supplier</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase text-right">Total</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase text-right">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length > 0 ? filteredPurchases.map((purchase) => (
                <tr key={purchase.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">{purchase.invoice_date || '-'}</td>
                  <td className="px-6 py-4 text-xs font-black text-slate-900 uppercase">{purchase.invoice_number || '-'}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600 uppercase">
                    {supplierNames.get(String(purchase.supplier_id)) || purchase.supplier_id || '-'}
                  </td>
                  <td className="px-6 py-4 text-xs font-black text-slate-700 uppercase">{purchase.status || '-'}</td>
                  <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">{purchase.total_amount ?? 0}</td>
                  <td className="px-6 py-4 text-xs font-black text-slate-700 text-right uppercase">{purchase.payment_status || '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="py-20 text-center text-slate-400 font-black uppercase text-[10px]">No purchase records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
