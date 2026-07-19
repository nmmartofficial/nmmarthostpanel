import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, CheckCircle2, XCircle, Clock, Building2, User, Mail, Phone, Calendar, ShieldCheck, Users, Lock, Unlock, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabase';
import { DB_SCHEMA } from '../../dbSchema';
import { dbSync } from '../../dbSync';
import { toast } from 'sonner';
import { cn } from '../../utils/helpers';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';

export default function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    owner_name: '',
    email: '',
    mobile: '',
    subscription_plan: 'basic',
    expiry_date: '',
    country: 'India',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    max_users: 5,
    storage_limit: 10,
    status: 'active'
  });

  // Helper to generate company code
  const generateCompanyCode = () => {
    const num = companies.length + 1;
    return `NM${String(num).padStart(3, '0')}`;
  };

  // Helper to generate slug from company name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Fetch companies
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await dbSync.fetch(DB_SCHEMA.COMPANIES.table, { 
        order: { column: 'created_at', ascending: false } 
      });
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies:', err);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let companyData = { ...formData };
      
      if (editingCompany) {
        // Update existing company
        await dbSync.update(DB_SCHEMA.COMPANIES.table, editingCompany.id, companyData);
        toast.success('Company updated successfully');
      } else {
        // Create new company
        companyData.company_code = generateCompanyCode();
        companyData.company_slug = generateSlug(formData.company_name);
        await dbSync.insert(DB_SCHEMA.COMPANIES.table, companyData);
        toast.success('Company created successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchCompanies();
    } catch (err) {
      console.error('Error saving company:', err);
      toast.error('Failed to save company');
    }
  };

  // Handle delete
  const handleDelete = async (company) => {
    if (!window.confirm(`Are you sure you want to delete ${company.company_name}?`)) return;
    try {
      await dbSync.delete(DB_SCHEMA.COMPANIES.table, company.id, true);
      toast.success('Company deleted');
      fetchCompanies();
    } catch (err) {
      console.error('Error deleting company:', err);
      toast.error('Failed to delete company');
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (company) => {
    try {
      const newStatus = company.status === 'active' ? 'inactive' : 'active';
      await dbSync.update(DB_SCHEMA.COMPANIES.table, company.id, { status: newStatus });
      toast.success(`Company ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchCompanies();
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      owner_name: '',
      email: '',
      mobile: '',
      subscription_plan: 'basic',
      expiry_date: '',
      country: 'India',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      max_users: 5,
      storage_limit: 10,
      status: 'active'
    });
    setEditingCompany(null);
  };

  const openEditModal = (company) => {
    setEditingCompany(company);
    setFormData({
      company_name: company.company_name,
      owner_name: company.owner_name,
      email: company.email,
      mobile: company.mobile,
      subscription_plan: company.subscription_plan,
      expiry_date: company.expiry_date,
      country: company.country,
      timezone: company.timezone,
      currency: company.currency,
      max_users: company.max_users,
      storage_limit: company.storage_limit,
      status: company.status
    });
    setShowModal(true);
  };

  if (loading) {
    return <LoadingState title="Loading companies" subtitle="Fetching tenant organizations and account details." />;
  }

  return (
    <div className="h-full w-full p-8 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Company Management</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Manage all your tenant companies</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Plus size={18} />
            Add Company
          </button>
        </div>

        {/* Companies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Building2 className="text-white" size={24} />
                  </div>
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                      company.status === 'active'
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {company.status}
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-1">{company.company_name}</h3>
                <p className="text-slate-500 text-sm font-medium mb-4">{company.company_slug}</p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User size={14} />
                    <span>{company.owner_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={14} />
                    <span>{company.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone size={14} />
                    <span>{company.mobile}</span>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Plan</p>
                    <p className="text-lg font-black text-slate-900 capitalize">{company.subscription_plan}</p>
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Users</p>
                    <p className="text-lg font-black text-slate-900">{company.max_users}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(company)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(company)}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors",
                      company.status === 'active'
                        ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    )}
                    title={company.status === 'active' ? 'Deactivate' : 'Activate'}
                  >
                    {company.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(company)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-red-200 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {companies.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                title="No companies yet"
                description="Create your first tenant company to get started."
              />
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-slate-900">
                    {editingCompany ? 'Edit Company' : 'Add New Company'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X size={24} className="text-slate-500" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      value={formData.owner_name}
                      onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Mobile
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Subscription Plan
                    </label>
                    <select
                      value={formData.subscription_plan}
                      onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Timezone
                    </label>
                    <input
                      type="text"
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Max Users
                    </label>
                    <input
                      type="number"
                      value={formData.max_users}
                      onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Storage Limit (GB)
                    </label>
                    <input
                      type="number"
                      value={formData.storage_limit}
                      onChange={(e) => setFormData({ ...formData, storage_limit: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                  >
                    <Save size={16} className="inline mr-2" />
                    {editingCompany ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
