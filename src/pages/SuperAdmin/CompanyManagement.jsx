import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, CheckCircle2, XCircle, Clock, Building2, Mail, Phone, Calendar, ShieldCheck, Users, Lock, Unlock, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabase';
import { DB_SCHEMA } from '../../dbSchema';
import { dbSync } from '../../dbSync';
import { toast } from 'sonner';
import { cn } from '../../utils/helpers';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import { useAuthContext } from '../../context/AuthContext';

export default function CompanyManagement() {
  const { currentUser } = useAuthContext();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    subscription_plan: 'starter',
    status: 'active'
  });

  const generateCompanyCode = () => {
    const usedCodes = new Set(companies.map((company) => String(company.company_code || '').toUpperCase()));
    let candidate = 1;
    while (usedCodes.has(`NM${String(candidate).padStart(3, '0')}`)) candidate += 1;
    return `NM${String(candidate).padStart(3, '0')}`;
  };

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
        includeDeleted: true,
        order: { column: 'created_at', ascending: false } 
      });
      setCompanies(data);
      setLoadError('');
    } catch (err) {
      console.error('Error fetching companies:', err);
      const message = `Failed to load companies: ${err.message || 'Unknown database error'}`;
      setLoadError(message);
      toast.error(message);
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
    setSaving(true);
    try {
      const companyName = formData.name.trim();
      const email = formData.email.trim();
      const phone = formData.phone.trim();
      if (!companyName || !email || !phone) {
        throw new Error('Company name, email, and phone are required.');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid company email address.');
      if (companyName.length > 160 || phone.length > 40 || formData.address.length > 2000) {
        throw new Error('Company details exceed the allowed length.');
      }
      const status = formData.status;
      const slug = generateSlug(companyName);
      if (!slug) throw new Error('Company name must contain letters or numbers to create a URL slug.');
      if (!editingCompany && companies.some((company) => company.company_slug === slug)) {
        throw new Error('A company with this URL slug already exists.');
      }

      const companyData = {
        name: companyName,
        email,
        phone,
        address: formData.address.trim() || null,
        subscription_plan: formData.subscription_plan,
        status,
        is_active: status === 'active'
      };

      if (editingCompany) {
        const updated = await dbSync.update(DB_SCHEMA.COMPANIES.table, editingCompany.id, companyData);
        if (!updated?.id) throw new Error('The database did not confirm the company update.');
        toast.success('Company updated successfully');
      } else {
        companyData.company_code = generateCompanyCode();
        companyData.company_slug = slug;
        const created = await dbSync.insert(DB_SCHEMA.COMPANIES.table, companyData);
        if (!created?.id) throw new Error('The database did not confirm company creation.');
        toast.success('Company created successfully');
      }

      setShowModal(false);
      resetForm();
      await fetchCompanies();
    } catch (err) {
      console.error('Error saving company:', err);
      toast.error(`Failed to save company: ${err.message || 'Unknown database error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (company) => {
    if (!window.confirm(`Are you sure you want to delete ${company.name}?`)) return;
    try {
      await dbSync.delete(DB_SCHEMA.COMPANIES.table, company.id, true);
      toast.success('Company deleted');
      await fetchCompanies();
    } catch (err) {
      console.error('Error deleting company:', err);
      toast.error(`Failed to delete company: ${err.message || 'Unknown database error'}`);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (company) => {
    try {
      const newStatus = company.status === 'active' ? 'inactive' : 'active';
      const updated = await dbSync.update(DB_SCHEMA.COMPANIES.table, company.id, {
        status: newStatus,
        is_active: newStatus === 'active'
      });
      if (!updated?.id) throw new Error('The database did not confirm the status update.');
      toast.success(`Company ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      await fetchCompanies();
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error(`Failed to update status: ${err.message || 'Unknown database error'}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      subscription_plan: 'starter',
      status: 'active'
    });
    setEditingCompany(null);
  };

  const openEditModal = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      email: company.email,
      phone: company.phone || '',
      address: company.address || '',
      subscription_plan: company.subscription_plan || 'starter',
      status: company.status
    });
    setShowModal(true);
  };

  if (currentUser?.role !== 'super_admin') {
    return <div role="alert" className="m-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Company Management is restricted to platform administrators.</div>;
  }

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
          {loadError && (
            <div role="alert" className="col-span-full rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {loadError}
              <button type="button" onClick={fetchCompanies} className="ml-3 font-bold underline">Retry</button>
            </div>
          )}
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

                <h3 className="text-xl font-black text-slate-900 mb-1">{company.name}</h3>
                <p className="text-slate-500 text-sm font-medium mb-4">{company.company_slug}</p>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail size={14} />
                    <span>{company.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone size={14} />
                    <span>{company.phone}</span>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Plan</p>
                    <p className="text-lg font-black text-slate-900 capitalize">{company.subscription_plan || '—'}</p>
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Code</p>
                    <p className="text-lg font-black text-slate-900">{company.company_code}</p>
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

          {companies.length === 0 && !loadError && (
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
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      maxLength={160}
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
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      maxLength={40}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      maxLength={2000}
                      rows={3}
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
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
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
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save size={16} className="inline mr-2" />
                    {saving ? 'Saving…' : editingCompany ? 'Update' : 'Create'}
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
