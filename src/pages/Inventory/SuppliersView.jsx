import React, { useState, useMemo } from 'react';
import { 
  Users, Search, Plus, Edit2, Trash2, Phone, MapPin, Mail, CreditCard, RefreshCw, X, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, generateUUID } from '../../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../../erpController';
import { dbSync } from '../../dbSync';
import { DB_SCHEMA } from '../../dbSchema';
import PaginationFooter from '../../components/PaginationFooter';

export default function SuppliersView({ accounts, fetchInitialData }) {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({ account_type: 'Supplier' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const suppliers = useMemo(() => {
    return accounts.filter(acc => acc.account_type === 'Supplier');
  }, [accounts]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.gst_no?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  const totalPages = Math.ceil(filteredSuppliers.length / rowsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData, account_type: 'Supplier' };
      
      let res;
      if (editingSupplier) {
        res = await handleERPAction(DB_SCHEMA.ACCOUNTS.table, ACTION_TYPES.UPDATE, { id: editingSupplier.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(DB_SCHEMA.ACCOUNTS.table, ACTION_TYPES.INSERT, finalData);
      }

      if (res && !res.success) throw new Error(res.error);

      setShowForm(false);
      setEditingSupplier(null);
      setFormData({ account_type: 'Supplier' });
      fetchInitialData();
      alert(editingSupplier ? "Supplier updated!" : "Supplier added!");
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSupplier = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await handleERPAction(DB_SCHEMA.ACCOUNTS.table, ACTION_TYPES.DELETE, { id });
      fetchInitialData();
    } catch (error) {
      alert("Delete failed: " + error.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Supplier Management</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Manage Vendors & Purchase Accounts</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search Suppliers..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setEditingSupplier(null); setFormData({ account_type: 'Supplier' }); setShowForm(true); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      {/* Supplier List Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Supplier Name</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Contact Info</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">GST Details</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSuppliers.length > 0 ? paginatedSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs">
                        {supplier.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{supplier.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Balance: ₹{supplier.current_balance || 0}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                        <Phone size={10} className="text-slate-400" /> {supplier.mobile || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                        <MapPin size={10} className="text-slate-400" /> {supplier.city || supplier.address || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-black text-slate-700 uppercase">{supplier.gst_no || 'No GST'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingSupplier(supplier); setFormData(supplier); setShowForm(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => deleteSupplier(supplier.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <Users size={48} strokeWidth={1} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No suppliers found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <PaginationFooter 
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setCurrentPage={setCurrentPage}
          totalRecords={filteredSuppliers.length}
        />
      </div>

      {/* Supplier Form Overlay */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter">
                    {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Enter Vendor Details</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Supplier Name *</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. ABC Wholesalers"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Mobile Number</label>
                      <input 
                        type="text" 
                        placeholder="10-digit mobile"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={formData.mobile || ''}
                        onChange={e => setFormData({...formData, mobile: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">GST Number</label>
                      <input 
                        type="text" 
                        placeholder="GSTIN"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
                        value={formData.gst_no || ''}
                        onChange={e => setFormData({...formData, gst_no: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Full Address</label>
                    <textarea 
                      placeholder="Enter supplier address..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 h-24 resize-none"
                      value={formData.address || ''}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Opening Balance</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                          value={formData.opening_balance || ''}
                          onChange={e => setFormData({...formData, opening_balance: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Account Type</label>
                      <input 
                        readOnly
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none text-slate-500"
                        value="Supplier"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 hover:translate-y-[-1px] transition-all"
                >
                  {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
