import React, { useState } from 'react';
import { X, Search, User, Phone, Mail, MapPin, Plus, Star, Wallet, TrendingUp } from 'lucide-react';

const CustomerDialog = ({ isOpen, onClose, onSelectCustomer, onCreateCustomer }) => {
  const [mode, setMode] = useState('search'); // search or create
  const [searchQuery, setSearchQuery] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const mockCustomers = [
    { id: 1, name: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@example.com', loyaltyPoints: 1500, walletBalance: 500 },
    { id: 2, name: 'Priya Sharma', phone: '9876543211', email: 'priya@example.com', loyaltyPoints: 2500, walletBalance: 1200 },
    { id: 3, name: 'Amit Patel', phone: '9876543212', email: 'amit@example.com', loyaltyPoints: 800, walletBalance: 0 },
  ];

  if (!isOpen) return null;

  const filteredCustomers = mockCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const handleCreateCustomer = () => {
    onCreateCustomer(newCustomer);
    setNewCustomer({ name: '', phone: '', email: '', address: '' });
    setMode('search');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="w-7 h-7" />
            Customer Management
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setMode('search')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              mode === 'search'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Search Customer
          </button>
          <button
            onClick={() => setMode('create')}
            className={`flex-1 px-6 py-4 font-semibold transition-colors ${
              mode === 'create'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Create New
          </button>
        </div>

        <div className="p-6">
          {mode === 'search' ? (
            <div>
              {/* Search Input */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or phone number..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Customers List */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => {
                      onSelectCustomer(customer);
                      onClose();
                    }}
                    className="border border-gray-200 rounded-xl p-4 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {customer.phone}
                          </span>
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
                        <Star className="w-4 h-4" />
                        {customer.loyaltyPoints} Points
                      </div>
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                        <Wallet className="w-4 h-4" />
                        ₹{customer.walletBalance}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No customers found</p>
                    <button
                      onClick={() => setMode('create')}
                      className="mt-4 text-indigo-600 font-semibold hover:text-indigo-700"
                    >
                      Create a new customer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter address"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleCreateCustomer}
                disabled={!newCustomer.name || !newCustomer.phone}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Customer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDialog;
