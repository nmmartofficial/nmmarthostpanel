import React, { useState, useMemo } from 'react';
import { 
  Users, Search, Plus, Edit2, Trash2, Phone, MapPin, Mail, CreditCard, RefreshCw, X, Save,
  TrendingUp, Clock, IndianRupee, ShoppingBag, Star, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, generateUUID } from '../../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../../erpController';
import { dbSync } from '../../dbSync';
import { DB_SCHEMA } from '../../dbSchema';
import PaginationFooter from '../../components/PaginationFooter';

// --- GST Validation Helper ---
const validateGSTIN = (gstin) => {
  if (!gstin) return { isValid: true, message: '' }; // Optional
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (gstin.length !== 15) return { isValid: false, message: 'GSTIN must be 15 characters long' };
  if (!gstinRegex.test(gstin)) return { isValid: false, message: 'Invalid GSTIN format' };
  return { isValid: true, message: '' };
};

export default function EnhancedSuppliersView({ accounts, purchases, fetchInitialData }) {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [formData, setFormData] = useState({ account_type: 'Supplier' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gstError, setGstError] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const suppliers = useMemo(() => {
    return accounts.filter(acc => acc.account_type === 'Supplier');
  }, [accounts]);

  // Calculate supplier performance
  const suppliersWithStats = useMemo(() => {
    return suppliers.map(supplier => {
      const supplierPurchases = purchases.filter(p => p.supplier_id === supplier.id);
      const totalPurchases = supplierPurchases.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
      const lastPurchase = supplierPurchases.length > 0 
        ? supplierPurchases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]?.created_at 
        : null;

      return {
        ...supplier,
        totalPurchases,
        purchaseCount: supplierPurchases.length,
        lastPurchaseDate: lastPurchase,
        rating: supplier.rating || 3 // Default rating
      };
    });
  }, [suppliers, purchases]);

  const filteredSuppliers = useMemo(() => {
    return suppliersWithStats.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.gst_no?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliersWithStats, searchTerm]);

  const totalPages = Math.ceil(filteredSuppliers.length / rowsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate GST
    const gstValidation = validateGSTIN(formData.gst_no?.trim() || '');
    if (!gstValidation.isValid) {
      setGstError(gstValidation.message);
      return;
    }
    setGstError('');

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
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Supplier Management</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Manage Vendors, Performance & Purchase History</p>
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
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Supplier Name</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Contact Info</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Performance</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Balance</th>
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
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={10} 
                              className={i < supplier.rating ? "text-amber-400 fill-amber-400" : "text-slate-300"} 
                            />
                          ))}
                        </div>
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
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600">
                        <ShoppingBag size={10} /> {supplier.purchaseCount} purchases
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                        <IndianRupee size={10} /> ₹{Math.round(supplier.totalPurchases).toLocaleString()} total
                      </div>
                      {supplier.lastPurchaseDate && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                          <Clock size={10} /> Last: {new Date(supplier.lastPurchaseDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[11px] font-black px-3 py-1 rounded-full",
                      (supplier.current_balance || 0) > 0 
                        ? "bg-amber-50 text-amber-700" 
                        : "bg-emerald-50 text-emerald-700"
                    )}>
                      ₹{parseFloat(supplier.current_balance || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setSelectedSupplier(supplier)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                        title="View Details"
                      >
                        <CheckCircle2 size={14} />
                      </button>
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
                  <td colSpan="5" className="px-4 py-12 text-center">
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
        
        <div className="flex-shrink-0">
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            setCurrentPage={setCurrentPage}
            totalRecords={filteredSuppliers.length}
          />
        </div>
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
                        placeholder="e.g. 27AAECF1234L1Z5"
                        className={cn(
                          "w-full bg-slate-50 border rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 uppercase",
                          gstError ? "border-red-300 focus:ring-red-500/20 text-red-800" : "border-slate-200 focus:ring-indigo-500/20"
                        )}
                        value={formData.gst_no || ''}
                        onChange={e => {
                          const val = e.target.value.toUpperCase();
                          setFormData({...formData, gst_no: val});
                          if (gstError) setGstError(validateGSTIN(val).message);
                        }}
                        onBlur={() => setGstError(validateGSTIN(formData.gst_no).message)}
                      />
                      {gstError && <p className="text-[9px] font-black text-red-500 flex items-center gap-1"><AlertCircle size={10}/> {gstError}</p>}
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
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Credit Days</label>
                      <input 
                        type="number" 
                        placeholder="30"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={formData.credit_days || ''}
                        onChange={e => setFormData({...formData, credit_days: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Rating</label>
                    <div className="flex items-center gap-2">
                      {[1,2,3,4,5].map(rating => (
                        <button 
                          key={rating}
                          type="button"
                          onClick={() => setFormData({...formData, rating})}
                          className="focus:outline-none"
                        >
                          <Star 
                            size={20}
                            className={(formData.rating || 0) >= rating ? "text-amber-400 fill-amber-400" : "text-slate-300"}
                          />
                        </button>
                      ))}
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

      {/* Supplier Details Drawer */}
      <AnimatePresence>
        {selectedSupplier && (
          <div className="fixed inset-0 z-[400] flex">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedSupplier(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
                <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800">Supplier Details</h3>
                <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6">
                {/* Supplier Info */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg">
                      {selectedSupplier.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase">{selectedSupplier.name}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            className={i < (selectedSupplier.rating || 3) ? "text-amber-400 fill-amber-400" : "text-slate-300"} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div>
                      <span className="text-slate-400 font-black uppercase tracking-widest block">Mobile</span>
                      <span className="text-slate-700 font-bold">{selectedSupplier.mobile || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-black uppercase tracking-widest block">GST</span>
                      <span className="text-slate-700 font-bold">{selectedSupplier.gst_no || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div>
                  <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Performance Overview</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                        <ShoppingBag size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Total Purchases</span>
                      </div>
                      <p className="text-lg font-black text-indigo-700">{selectedSupplier.purchaseCount}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                        <IndianRupee size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Total Amount</span>
                      </div>
                      <p className="text-lg font-black text-emerald-700">₹{Math.round(selectedSupplier.totalPurchases).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Purchase History (Mock) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Purchases</h5>
                    <span className="text-[9px] font-black text-slate-400">Last 5</span>
                  </div>
                  <div className="space-y-2">
                    {purchases
                      .filter(p => p.supplier_id === selectedSupplier.id)
                      .slice(0, 5)
                      .map(purchase => (
                        <div key={purchase.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div>
                            <p className="text-[10px] font-black text-slate-700 uppercase">#{purchase.invoice_no || purchase.id.slice(0, 8)}</p>
                            <p className="text-[9px] font-bold text-slate-400">{new Date(purchase.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className="text-[10px] font-black text-slate-700">₹{Math.round(parseFloat(purchase.total_amount || 0)).toLocaleString()}</span>
                        </div>
                      ))}
                    {purchases.filter(p => p.supplier_id === selectedSupplier.id).length === 0 && (
                      <p className="text-[10px] font-bold text-slate-400 text-center py-4">No purchases yet</p>
                    )}
                  </div>
                </div>

                {/* Balance Info */}
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">Current Balance</span>
                      <p className="text-xl font-black text-amber-700">₹{parseFloat(selectedSupplier.current_balance || 0).toLocaleString()}</p>
                    </div>
                    {selectedSupplier.credit_days && (
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Credit Days</span>
                        <p className="text-sm font-black text-slate-700">{selectedSupplier.credit_days} days</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
