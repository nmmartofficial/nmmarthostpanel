import React, { useState, useMemo } from 'react';
import { 
  Receipt, Search, Plus, Trash2, Edit2, X, Save, RefreshCw, Calendar, Tag, CreditCard, ArrowDownCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, generateUUID } from '../utils/helpers';
import { handleERPAction, ACTION_TYPES } from '../erpController';
import { dbSync } from '../dbSync';
import { DB_SCHEMA } from '../dbSchema';
import PaginationFooter from '../components/PaginationFooter';

export default function ExpensesView({ expenses, fetchInitialData }) {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({ 
    category: 'Electricity', 
    date: new Date().toISOString().split('T')[0],
    amount: '',
    remarks: '',
    payment_method: 'Cash'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const expenseCategories = [
    'Electricity', 'Rent', 'Salaries', 'Water Bill', 'Internet', 
    'Marketing', 'Maintenance', 'Cleaning', 'Taxes', 'Others'
  ];

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => 
      e.category?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.amount?.toString().includes(searchTerm)
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, searchTerm]);

  const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage);
  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) return alert("Please enter valid amount");
    
    setIsSubmitting(true);
    try {
      let res;
      if (editingExpense) {
        res = await handleERPAction(DB_SCHEMA.EXPENSES.table, ACTION_TYPES.UPDATE, { id: editingExpense.id, ...formData });
      } else {
        const payload = { ...formData, id: generateUUID() };
        res = await handleERPAction(DB_SCHEMA.EXPENSES.table, ACTION_TYPES.INSERT, payload);
      }

      if (res && !res.success) throw new Error(res.error);

      setShowForm(false);
      setEditingExpense(null);
      setFormData({ 
        category: 'Electricity', 
        date: new Date().toISOString().split('T')[0],
        amount: '',
        remarks: '',
        payment_method: 'Cash'
      });
      fetchInitialData();
      alert(editingExpense ? "Expense updated!" : "Expense recorded!");
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await handleERPAction(DB_SCHEMA.EXPENSES.table, ACTION_TYPES.DELETE, { id });
      fetchInitialData();
    } catch (error) {
      alert("Delete failed: " + error.message);
    }
  };

  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  }, [filteredExpenses]);

  return (
    <div className="space-y-4">
      {/* Header & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg text-white shadow-md">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Expense Management</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Track Business Overheads & Utilities</p>
            </div>
          </div>
          
          <button 
            onClick={() => { setEditingExpense(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100"
          >
            <Plus size={16} /> Record Expense
          </button>
        </div>

        <div className="bg-red-600 p-4 rounded-xl text-white shadow-lg flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Expenses</p>
            <h3 className="text-xl font-black tracking-tighter">₹{totalExpenseAmount.toLocaleString()}</h3>
          </div>
          <ArrowDownCircle size={32} className="opacity-20" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search by category or remarks..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-red-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Date</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Category</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Remarks</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedExpenses.length > 0 ? paginatedExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-600">
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-600 uppercase tracking-widest">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px] font-medium text-slate-500 max-w-[200px] truncate">
                    {expense.remarks || '-'}
                  </td>
                  <td className="px-4 py-3 text-[11px] font-black text-red-600">
                    ₹{parseFloat(expense.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingExpense(expense); setFormData(expense); setShowForm(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => deleteExpense(expense.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-all"
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
                      <Receipt size={48} strokeWidth={1} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No expenses recorded</p>
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
          totalRecords={filteredExpenses.length}
        />
      </div>

      {/* Expense Form Overlay */}
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
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="bg-red-600 p-6 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter">
                    {editingExpense ? 'Edit Expense' : 'Record Expense'}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Business Outflow Tracking</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500/20"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      >
                        {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Date</label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Amount *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input 
                          required
                          type="number" 
                          placeholder="0.00"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500/20"
                          value={formData.amount}
                          onChange={e => setFormData({...formData, amount: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Payment Method</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                        value={formData.payment_method}
                        onChange={e => setFormData({...formData, payment_method: e.target.value})}
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI/Online">UPI/Online</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Remarks / Note</label>
                    <textarea 
                      placeholder="What was this expense for?"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none h-24 resize-none"
                      value={formData.remarks}
                      onChange={e => setFormData({...formData, remarks: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-red-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-red-200 flex items-center justify-center gap-3 hover:translate-y-[-1px] transition-all"
                >
                  {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  {editingExpense ? 'Update Entry' : 'Save Expense'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
