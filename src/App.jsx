import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { 
  Package, Layers, Grid, List, Tag, Building2, 
  Users, UserPlus, Image as ImageIcon, CreditCard, 
  Truck, UserCircle, Search, Plus, Edit2, Trash2, 
  Save, X, ChevronDown, Menu, Phone, ShieldCheck,
  LayoutDashboard, LogOut, Home, ShoppingCart, 
  Wallet, Eye, FileText, Store, Repeat, Settings, 
  Maximize, Bell, User, TrendingUp, XCircle, 
  Database, History as HistoryIcon, BookOpen, Download,
  Copy
} from 'lucide-react';

// --- Global Constants ---
const BRAND_NAME = "NM MART";
const SUPPORT_PHONE = "+917081154604";

// --- Helper for Local Storage (optimized to skip large picture data) ---
const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch (error) {
      console.error('Error reading from LocalStorage:', error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      // Don't save picture data to LocalStorage (to save space)
      let toSave = value;
      if (key === 'nm_item_master' && Array.isArray(value)) {
        toSave = value.map(item => {
          const { picture, pictureName, ...rest } = item;
          return rest;
        });
      }
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving to LocalStorage:', error);
    }
  }, [key, value]);

  return [value, setValue];
};

const MasterView = ({ title, fields, data, onSave, onDelete, icon, searchPlaceholder, mediaSubfolder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = data.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData(item);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    const dataToSave = { ...formData, id: editingId || Date.now() };
    
    // Check all fields for files to upload
    for (const field of fields) {
      const fileKey = `${field.name}File`;
      if (dataToSave[fileKey]) {
        const uploadedUrl = await uploadMediaToSupabase(dataToSave[fileKey], 'nm-media', mediaSubfolder);
        if (uploadedUrl) {
          dataToSave[field.name] = uploadedUrl;
        }
        delete dataToSave[fileKey]; // Remove the temporary file object
      }
    }
    
    onSave(dataToSave);
    setShowForm(false);
    setEditingId(null);
    setFormData({});
  };

  if (showForm) {
    return (
      <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="text-blue-600">{icon || <Package size={24} />}</div>
            <h2 className="text-xl font-bold text-blue-600 tracking-tight">
              {title.replace(' Master', '')} [ {editingId ? 'EDIT' : 'NEW'} ]
            </h2>
          </div>

          <div className="space-y-4">
            {fields.map(field => (
              <div key={field.name} className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</label>
                {field.type === 'select' ? (
                  <select 
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-blue-500 rounded-md px-3 py-2 text-sm outline-none transition-all shadow-sm"
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'toggle' ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, [field.name]: !formData[field.name] })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${formData[field.name] ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData[field.name] ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{formData[field.name] ? 'Active' : 'Inactive'}</span>
                  </div>
                ) : field.type === 'image' || field.name.toLowerCase().includes('image') || field.name.toLowerCase().includes('picture') || field.name.toLowerCase().includes('photo') ? (
                  <div className="flex flex-col gap-2">
                    {formData[field.name] && (
                      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <img src={formData[field.name]} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden">
                        <input 
                          type="file" 
                          className="hidden" 
                          id={`master-field-${field.name}`}
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setFormData({
                                  ...formData, 
                                  [field.name]: event.target.result, 
                                  [`${field.name}File`]: file 
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label 
                          htmlFor={`master-field-${field.name}`} 
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer hover:bg-slate-200 transition-all border-r border-slate-300 dark:border-slate-700"
                        >
                          Choose file
                        </label>
                        <span className="px-3 py-1.5 bg-white dark:bg-slate-900 text-xs text-slate-500 min-w-[120px]">
                          {formData[`${field.name}File`]?.name || formData[field.name] ? 'File selected' : 'No file chosen'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <input 
                    type={field.type || 'text'}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-md px-3 py-2.5 text-sm outline-none transition-all shadow-sm"
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              onClick={handleSubmit}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              Save
            </button>
            <button 
              onClick={() => { setShowForm(false); setFormData({}); setEditingId(null); }}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Centered Search Bar & Create Button */}
      <div className="flex flex-col items-center gap-6">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-slate-700 dark:text-slate-300">{icon || <Package size={28} />}</div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{title}</h2>
          </div>
          <button 
            onClick={() => { setShowForm(true); setEditingId(null); setFormData({}); }}
            className="flex items-center gap-2 px-6 py-2 border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-bold transition-all"
          >
            <Plus size={18} /> Create New
          </button>
        </div>

        <div className="w-full max-w-xl relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search"
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold">SNo</th>
                {fields.map(field => (
                  <th key={field.name} className="px-6 py-4 font-bold">{field.label}</th>
                ))}
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {paginatedData.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4 text-slate-500 font-medium">{startIndex + index + 1}</td>
                  {fields.map(field => (
                    <td key={field.name} className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                      {item[field.name]}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleEdit(item)} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <button 
                      onClick={() => onDelete(item.id)} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-all shadow-sm"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="py-20 text-center opacity-30">
              <Database size={48} className="mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">No records found</p>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-6 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select 
              className="bg-transparent border border-slate-300 dark:border-slate-600 px-2 py-1 rounded outline-none cursor-pointer"
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <span>{startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredData.length)} of {filteredData.length}</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded border transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed border-slate-200' : 'hover:bg-slate-100 border-slate-300 dark:border-slate-600 dark:hover:bg-slate-800'}`}
            >
              ❮
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || totalPages === 0}
              className={`px-3 py-1 rounded border transition-all ${currentPage >= totalPages || totalPages === 0 ? 'opacity-30 cursor-not-allowed border-slate-200' : 'hover:bg-slate-100 border-slate-300 dark:border-slate-600 dark:hover:bg-slate-800'}`}
            >
              ❯
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  // Clear old LocalStorage data on first load to fix quota issue
  useEffect(() => {
    try {
      const oldItemMaster = localStorage.getItem('nm_item_master');
      if (oldItemMaster && oldItemMaster.length > 1000000) { // If larger than ~1MB
        localStorage.removeItem('nm_item_master');
        console.log('Cleared old large item master from LocalStorage!');
      }
    } catch (e) {
      console.error('Error clearing LocalStorage:', e);
    }
  }, []);

  const [saleLogs, setSaleLogs] = useLocalStorage('nm_sale_logs', []);
  const [activeTab, setActiveTab] = useLocalStorage('nm_active_view', 'dashboard');
  const [isMasterOpen, setIsMasterOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isToolOpen, setIsToolOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- Item Master Custom States ---
  const [isItemGridMode, setIsItemGridMode] = useLocalStorage('nm_item_grid_mode', true);
  const [isItemImportMode, setIsItemImportMode] = useLocalStorage('nm_item_import_mode', false);
  const [itemPageMode, setItemPageMode] = useState('NEW');
  const [itemFormData, setItemFormData] = useState({});
  const [itemSearch, setItemSearch] = useState('');
  const [itemFilter, setItemFilter] = useState({ category: 'All', brand: 'All' });
  const [importedItems, setImportedItems] = useState([]);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [itemGridPage, setItemGridPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // --- Banner Master Custom States ---
  const [isBannerGridMode, setIsBannerGridMode] = useState(true);
  const [bannerPageMode, setBannerPageMode] = useState('NEW');
  const [bannerFormData, setBannerFormData] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [redirectMode, setRedirectMode] = useState('custom'); // 'custom' or 'products'
  const [selectedProducts, setSelectedProducts] = useState([]);

  // --- Dynamic Options from Masters ---
  const getItemGroupOptions = () => [
    { value: '28', label: '28: NM MART' },
    { value: '33', label: '33: FG' },
    ...groupMaster.map(g => ({ value: g.id.toString(), label: `${g.id}: ${g.name}` }))
  ];
  
  const getSubCategoryOptions = () => [
    { value: '405', label: '405: Chocolate' },
    { value: '406', label: '406: Popcorn' },
    { value: '407', label: '407: Creamfill' },
    { value: '408', label: '408: Rusk & Khari' },
    { value: '409', label: '409: Detergent Powders & Bars' },
    ...subCatMaster.map(s => ({ value: s.id.toString(), label: `${s.id}: ${s.name}` }))
  ];
  
  const getBrandOptions = () => [
    { value: '11', label: 'NESTLE (11)' },
    { value: '12', label: 'ACT II (12)' },
    { value: '13', label: 'CADBURY (13)' },
    { value: '14', label: 'BRITANNIA (14)' },
    { value: '15', label: 'RIN (15)' },
    { value: '16', label: 'PARLE (16)' },
    { value: '113', label: 'NM MART (113)' },
    ...brandMaster.map(b => ({ value: b.id.toString(), label: `${b.name} (${b.id})` }))
  ];
  
  const getUnitOptions = () => [
    { value: '0', label: '0: NA' },
    { value: '72', label: '72: Nos' },
    { value: '73', label: '73: Kg' },
    { value: '74', label: '74: NULL' },
    ...unitMaster.map(u => ({ value: u.id.toString(), label: `${u.id}: ${u.name}` }))
  ];

  // --- States for each Master ---
  const [itemMaster, setItemMaster] = useLocalStorage('nm_item_master', [
    { id: 1, name: 'NESTLE KITKAT 16.4 GM', barcode: '8901058005233', hsnCode: '18063200', sellingPrice: 10, mrp: 10, purchaseRate: 8, gst: 12, cess: 0, discount: 0, openingStock: 100, stockQty: 100, unit: '72', group: '28', mainCategory: 'Chocolates', subCategory: '405', brand: '11', isFavourite: 1, isDiscountable: 0, description: '' },
    { id: 2, name: 'ACT II MAGIC BUTTER', barcode: '8901512540805', hsnCode: '200819', sellingPrice: 10, mrp: 10, purchaseRate: 7, gst: 5, cess: 0, discount: 0, openingStock: 50, stockQty: 50, unit: '72', group: '28', mainCategory: 'Snacks', subCategory: '406', brand: '12', isFavourite: 0, isDiscountable: 0, description: '' },
    { id: 3, name: 'DAIRY MILK RS10.', barcode: '7622202334009', hsnCode: '18063200', sellingPrice: 10, mrp: 10, purchaseRate: 8.5, gst: 12, cess: 0, discount: 0, openingStock: 200, stockQty: 200, unit: '72', group: '28', mainCategory: 'Chocolates', subCategory: '405', brand: '13', isFavourite: 1, isDiscountable: 0, description: '' },
    { id: 4, name: 'BRITANNIYA JIMJAM 62g', barcode: '8901063029408', hsnCode: '190590', sellingPrice: 10, mrp: 10, purchaseRate: 7.5, gst: 18, cess: 0, discount: 0, openingStock: 80, stockQty: 80, unit: '72', group: '28', mainCategory: 'Biscuits', subCategory: '408', brand: '14', isFavourite: 0, isDiscountable: 0, description: '' },
  ]);
  const [unitMaster, setUnitMaster] = useLocalStorage('nm_unit_master', [
    { id: 1, name: 'Nos' }, 
    { id: 2, name: 'Kg' }, 
    { id: 3, name: 'NULL' }
  ]);
  const [groupMaster, setGroupMaster] = useLocalStorage('nm_group_master', []);
  const [mainCatMaster, setMainCatMaster] = useLocalStorage('nm_main_cat_master', [
    { id: 1, name: 'Chocolates' },
    { id: 2, name: 'Snacks' },
    { id: 3, name: 'Biscuits' }
  ]);
  const [subCatMaster, setSubCatMaster] = useLocalStorage('nm_sub_cat_master', []);
  const [brandMaster, setBrandMaster] = useLocalStorage('nm_brand_master', []);
  const [deptMaster, setDeptMaster] = useLocalStorage('nm_dept_master', []);
  const [accountMaster, setAccountMaster] = useLocalStorage('nm_account_master', []);
  const [userMaster, setUserMaster] = useLocalStorage('nm_user_master', []);
  const [bannerMaster, setBannerMaster] = useLocalStorage('nm_banner_master', []);
  const [creditMaster, setCreditMaster] = useLocalStorage('nm_credit_master', []);
  const [deliveryBoyMaster, setDeliveryBoyMaster] = useLocalStorage('nm_dboy_master', []);
  const [deliveryCustMaster, setDeliveryCustMaster] = useLocalStorage('nm_dcust_master', []);

  const masters = [
    { id: 'ItemMaster', label: 'Item Master', icon: <Package size={16} /> },
    { id: 'ItemUnit_View', label: 'Item Unit Master', icon: <Layers size={16} /> },
    { id: 'ItemGroupMaster', label: 'Item Group Master', icon: <Grid size={16} /> },
    { id: 'Item-main-Category', label: 'Item Main Category', icon: <List size={16} /> },
    { id: 'Item-Sub-Category', label: 'Item Sub Category', icon: <Tag size={16} /> },
    { id: 'BrandMaster', label: 'Brand Master', icon: <Building2 size={16} /> },
    { id: 'DepartmentMas', label: 'Department Master', icon: <Users size={16} /> },
    { id: 'AccountMaster', label: 'Account Master', icon: <UserPlus size={16} /> },
    { id: 'UserPermission', label: 'User Master', icon: <UserCircle size={16} /> },
    { id: 'BannerMaster', label: 'Banner Master', icon: <ImageIcon size={16} /> },
    { id: 'CreditMaster', label: 'Credit Master', icon: <CreditCard size={16} /> },
    { id: 'DeliveryBoyMaster', label: 'Delivery Boy Master', icon: <Truck size={16} /> },
    { id: 'Delivery_cust_Master', label: 'Delivery Customer Master', icon: <Users size={16} /> },
  ];

  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
  const [saleSearch, setSaleSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [billType, setBillType] = useState('Counter Sale');
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('');

  // --- Purchase Entry States ---
  const [purchaseLogs, setPurchaseLogs] = useLocalStorage('nm_purchase_logs', []);
  const [isCreatingPurchase, setIsCreatingPurchase] = useLocalStorage('nm_is_creating_purchase', false);
  const [purchaseHeader, setPurchaseHeader] = useState({
    billNo: '',
    date: new Date().toISOString().split('T')[0],
    party: '',
    department: '',
    taxType: 'Exclude'
  });
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [tempPurchaseItem, setTempPurchaseItem] = useState({
    id: '',
    name: '',
    barcode: '',
    qty: 1,
    rate: 0,
    discount: 0,
    gst: 0
  });

  // --- Purchase Filters ---
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // --- View States ---
  const [onlineOrders, setOnlineOrders] = useLocalStorage('nm_online_orders', [
    { id: 'ORD001', customer: 'Rahul Kumar', items: '2x Milk, 1x Bread', total: 120, status: 'Pending', time: '10:30 AM' },
    { id: 'ORD002', customer: 'Sita Devi', items: '5x Maggi, 2x Coke', total: 350, status: 'Preparing', time: '10:45 AM' }
  ]);
  const [walletBalances, setWalletBalances] = useLocalStorage('nm_wallet_balances', {});
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [rechargeSearch, setRechargeSearch] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [viewSearch, setViewSearch] = useState('');
  const [viewDates, setViewDates] = useState({ from: '', to: '' });

  // --- Report States ---
  const [reportFilters, setReportFilters] = useState({ search: '', from: '', to: '' });

  // --- Store States ---
  const [bomMaster, setBomMaster] = useLocalStorage('nm_bom_master', []);
  const [productionLogs, setProductionLogs] = useLocalStorage('nm_production_logs', []);
  const [stockTransfers, setStockTransfers] = useLocalStorage('nm_stock_transfers', []);
  const [wastageLogs, setWastageLogs] = useLocalStorage('nm_wastage_logs', []);
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage('nm_purchase_orders', []);
  const [isCreatingPO, setIsCreatingPO] = useLocalStorage('nm_is_creating_po', false);
  const [poHeader, setPoHeader] = useState({ vendor: '', date: new Date().toISOString().split('T')[0], status: 'Draft' });
  const [poItems, setPoItems] = useState([]);

  // --- Transaction States ---
  const [transactionLogs, setTransactionLogs] = useLocalStorage('nm_transaction_logs', []);
  const [isCreatingTransaction, setIsCreatingTransaction] = useLocalStorage('nm_is_creating_transaction', false);
  const [transHeader, setTransHeader] = useState({
    type: 'Payment', // Payment (Value 4) or Receipt (Value 3)
    typeValue: 4,
    account: 'CASH',
    date: new Date().toISOString().split('T')[0],
    vNo: ''
  });
  const [transEntries, setTransEntries] = useState([]);
  const [tempTransEntry, setTempTransEntry] = useState({ party: '', amount: '', remarks: '' });
  const [transFilters, setTransFilters] = useState({ search: '', from: '', to: '' });

  // --- Tool States ---
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [printerStatus, setPrinterStatus] = useState('Disconnected');
  const [printerLogs, setPrinterLogs] = useState([]);
  const [mobileDisplaySettings, setMobileDisplaySettings] = useLocalStorage('nm_mobile_display', {
    items: {},
    subCats: {},
    mainCats: {}
  });

  const toolRoutes = [
    { id: 'ToolPass', label: 'Admin Security', icon: <ShieldCheck size={16} /> },
    { id: 'LocationItemDisplay', label: 'Mobile Item Ranker', icon: <Package size={16} /> },
    { id: 'Location-sub-category', label: 'Mobile Sub-Cat Ranker', icon: <Tag size={16} /> },
    { id: 'Location-main-category', label: 'Mobile Main-Cat Ranker', icon: <List size={16} /> },
    { id: 'BluetoothTerminal', label: 'Bluetooth Terminal', icon: <Repeat size={16} /> },
  ];

  const handleSystemReset = () => {
    if (window.confirm("CRITICAL: This will clear all transactional logs and reset inventory. Continue?")) {
      setSaleLogs([]);
      setPurchaseLogs([]);
      setTransactionLogs([]);
      setOnlineOrders([]);
      setWastageLogs([]);
      alert("System Data Reset Successfully!");
    }
  };

  const handlePrinterTest = () => {
    setPrinterLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Printing Test Receipt...`]);
    setTimeout(() => {
      alert(`${BRAND_NAME} - POS RECEIPT\n------------------\nSupport: ${SUPPORT_PHONE}\nStatus: Printed Successfully`);
    }, 500);
  };

  const handleSaveTransaction = async () => {
    if (transEntries.length === 0) return alert("Add at least one entry!");
    
    const totalAmount = transEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    const vNo = transHeader.vNo || `VCH-${Date.now().toString().slice(-6)}`;
    
    // Map entries to Dr/Cr based on transaction type
    const mappedEntries = transEntries.map(entry => ({
      ...entry,
      dr: transHeader.type === 'Payment' ? Number(entry.amount) : 0,
      cr: transHeader.type === 'Receipt' ? Number(entry.amount) : 0
    }));

    const newTransaction = {
      ...transHeader,
      vNo,
      entries: mappedEntries,
      totalAmount,
      id: generateUUID()
    };

    setTransactionLogs([newTransaction, ...transactionLogs]);

    // Update Account Master balances
    setAccountMaster(prev => prev.map(acc => {
      const entriesForAcc = mappedEntries.filter(e => e.party === acc.name);
      if (entriesForAcc.length > 0) {
        const totalDr = entriesForAcc.reduce((s, e) => s + e.dr, 0);
        const totalCr = entriesForAcc.reduce((s, e) => s + e.cr, 0);
        const updatedAcc = { 
          ...acc, 
          balance: (Number(acc.balance) || 0) + (transHeader.type === 'Receipt' ? totalCr : -totalDr)
        };
        // Also sync the updated account to Supabase
        handleSave('AccountMaster', updatedAcc, setAccountMaster);
        return updatedAcc;
      }
      return acc;
    }));

    // Sync to Supabase
    try {
      const cleanTransaction = {
        id: String(newTransaction.id),
        type: String(newTransaction.type),
        type_value: Number(newTransaction.typeValue),
        account: String(newTransaction.account),
        date: String(newTransaction.date),
        v_no: String(newTransaction.vNo),
        entries: JSON.stringify(newTransaction.entries),
        total_amount: parseFloat(newTransaction.totalAmount)
      };
      await supabase.from('transaction_logs').upsert(cleanTransaction, { onConflict: 'id' });
    } catch (error) {
      console.error('Error syncing transaction log to Supabase:', error);
    }

    alert(`${transHeader.type} (Value: ${transHeader.typeValue}) Voucher ${vNo} Saved Successfully!`);
    
    // Reset
    setIsCreatingTransaction(false);
    setTransEntries([]);
    setTransHeader({ type: 'Payment', typeValue: 4, account: 'CASH', date: new Date().toISOString().split('T')[0], vNo: '' });
  };

  const storeRoutes = [
    { id: 'Bom', label: 'Bill of Materials', icon: <Layers size={16} /> },
    { id: 'Production', label: 'Production Entry', icon: <Repeat size={16} /> },
    { id: 'StockTRF', label: 'Stock Transfer', icon: <Truck size={16} /> },
    { id: 'StockTRFWastage', label: 'Wastage Entry', icon: <Trash2 size={16} /> },
    { id: 'PoEntry', label: 'Purchase Order Entry', icon: <ShoppingCart size={16} /> },
    { id: 'Rpt_CostingReport', label: 'Costing Report', icon: <TrendingUp size={16} /> },
    { id: 'Rpt_StockTRf', label: 'Stock Transfer Report', icon: <FileText size={16} /> },
    { id: 'Rpt_Stockwastage', label: 'Wastage Report', icon: <FileText size={16} /> },
    { id: 'Rpt_RO_Detail', label: 'Purchase Report (RO)', icon: <FileText size={16} /> },
    { id: 'Rpt_Po_Item_Report', label: 'Requisition Report', icon: <List size={16} /> },
  ];

  const reportRoutes = [
    { id: 'Rpt_SaleSummary', label: 'Sale Summary', icon: <TrendingUp size={16} /> },
    { id: 'Rpt_SaleReport', label: 'Sale Bill-wise', icon: <FileText size={16} /> },
    { id: 'Rpt_SaleReportItem_wise', label: 'Sale Item-wise', icon: <Package size={16} /> },
    { id: 'RptSaleItemSummary', label: 'Sale Item-Summary', icon: <Layers size={16} /> },
    { id: 'RestBillViewTrash', label: 'Sale-Trash Bill', icon: <Trash2 size={16} /> },
    { id: 'RestBillViewCancelled', label: 'Sale-Cancelled Bill', icon: <XCircle size={16} /> },
    { id: 'Rpt_PurchaseReport', label: 'Purchase Report', icon: <ShoppingCart size={16} /> },
    { id: 'Rpt_Stock_Report', label: 'Stock Report', icon: <Database size={16} /> },
    { id: 'Rpt_Item_Statement_report', label: 'Item Statement', icon: <HistoryIcon size={16} /> },
    { id: 'Logbook', label: 'Logbook', icon: <ShieldCheck size={16} /> },
    { id: 'LedgerView', label: 'Ledger View', icon: <BookOpen size={16} /> },
    { id: 'Rpt_Delivery_boy_Payment', label: 'Delivery Boy Payment', icon: <Truck size={16} /> },
    { id: 'Rpt_CreditCustomer_Report', label: 'Credit Report', icon: <CreditCard size={16} /> },
    { id: 'Payment_remind', label: 'Payment Reminder', icon: <Bell size={16} /> },
  ];

  const viewRoutes = [
    { id: 'KotView', label: 'Online Orders', icon: <Bell size={16} /> },
    { id: 'RestBillView', label: 'General Bill View', icon: <FileText size={16} /> },
    { id: 'RestBillViewDelivery', label: 'Bill View Delivery', icon: <Truck size={16} /> },
    { id: 'BranchBill', label: 'Branch Bill Records', icon: <Store size={16} /> },
    { id: 'Payment_View', label: 'Payment Lookup', icon: <Search size={16} /> },
    { id: 'WalletRecharge', label: 'Wallet Recharge', icon: <Wallet size={16} /> },
  ];

  const handleUpdateOrderStatus = (id, status, rider = null) => {
    setOnlineOrders(prev => prev.map(order => 
      order.id === id ? { ...order, status, rider: rider || order.rider } : order
    ));
  };

  const handleRecharge = (phone, amount) => {
    if (!phone || !amount) return alert("Enter valid details");
    setWalletBalances(prev => ({
      ...prev,
      [phone]: (Number(prev[phone]) || 0) + Number(amount)
    }));
    alert(`Wallet Recharged Successfully for ${phone}!`);
    setRechargeAmount('');
  };

  const calculatePurchaseLine = (item, taxType) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const discPercent = Number(item.discount) || 0;
    const gstPercent = Number(item.gst) || 0;

    const discAmt = (qty * rate) * (discPercent / 100);
    const taxableBasis = (qty * rate) - discAmt;
    
    let gstAmt = 0;
    if (taxType === 'Exclude') {
      gstAmt = taxableBasis * (gstPercent / 100);
    } else {
      gstAmt = taxableBasis - (taxableBasis / (1 + (gstPercent / 100)));
    }

    const gross = taxType === 'Exclude' ? taxableBasis + gstAmt : taxableBasis;
    
    return { ...item, discAmt, taxableBasis, gstAmt, gross };
  };

  const handleSavePurchase = () => {
    if (!purchaseHeader.party || purchaseItems.length === 0) return alert("Missing Party or Items!");

    const totalQty = purchaseItems.reduce((s, i) => s + Number(i.qty), 0);
    const totalTax = purchaseItems.reduce((s, i) => s + i.gstAmt, 0);
    const netAmount = purchaseItems.reduce((s, i) => s + i.gross, 0);

    const newLog = {
      ...purchaseHeader,
      id: Date.now(),
      items: purchaseItems,
      totalQty,
      totalTax,
      netAmount,
      roundOff: Math.round(netAmount) - netAmount
    };

    // 1. Save Log
    setPurchaseLogs([newLog, ...purchaseLogs]);

    // 2. Increment Stock in Item Master
    setItemMaster(prev => prev.map(masterItem => {
      const purchased = purchaseItems.find(pi => pi.barcode === masterItem.barcode);
      if (purchased) {
        return { ...masterItem, stockQty: Number(masterItem.stockQty) + Number(purchased.qty) };
      }
      return masterItem;
    }));

    alert(`Inventory Stock Updated Successfully for ${BRAND_NAME}!`);
    setIsCreatingPurchase(false);
    setPurchaseItems([]);
    setPurchaseHeader({
      billNo: '',
      date: new Date().toISOString().split('T')[0],
      party: '',
      department: '',
      taxType: 'Exclude'
    });
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    const gross = cart.reduce((sum, item) => sum + (item.sellingPrice * item.qty), 0);
    const tax = cart.reduce((sum, item) => sum + ((item.sellingPrice * item.qty) * (item.gst / 100)), 0);
    return { gross, tax, total: Math.round(gross + tax) };
  };

  const handleSaveBill = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    
    // Play audio feedback
    const audio = new Audio('./ready-tone.mp3');
    audio.play().catch(e => console.log("Audio play failed", e));
    
    // Reset state
    const newBill = {
      id: generateUUID(),
      billNo: `NM-${Date.now().toString().slice(-6)}`,
      customer: customerInfo,
      items: cart,
      totals: calculateTotal(),
      paymentMode,
      billType,
      rider: selectedDeliveryBoy,
      date: new Date().toISOString()
    };
    setSaleLogs([newBill, ...saleLogs]);
    setCart([]);
    setCustomerInfo({ name: '', phone: '', address: '' });
    setSelectedDeliveryBoy('');
    
    // Sync to Supabase
    try {
      const cleanSaleLog = {
        id: String(newBill.id),
        bill_no: String(newBill.billNo),
        customer: JSON.stringify(newBill.customer),
        items: JSON.stringify(newBill.items),
        totals: JSON.stringify(newBill.totals),
        payment_mode: String(newBill.paymentMode),
        bill_type: String(newBill.billType),
        rider: newBill.rider ? String(newBill.rider) : null,
        date: newBill.date
      };
      await supabase.from('sale_logs').upsert(cleanSaleLog, { onConflict: 'id' });
    } catch (error) {
      console.error('Error syncing sale log to Supabase:', error);
    }
    
    alert(`Bill Generated Successfully for ${BRAND_NAME}!`);
  };

  // --- Helper to convert Admin Item to NM App Product format
  const convertItemToProduct = (item) => ({ 
    id: String(item.id), 
    name: item.name || 'Unknown', 
    "ItemGroupName": item.main_category || item.item_group || item.mainCategory || item.group || '', 
    "MRP": Number(item.mrp) || 0, 
    "Rate": Number(item.selling_price) || Number(item.sellingPrice) || 0, 
    "discountPerc": Number(item.discount) || 0, 
    "ImageUrl": item.picture || item.image_url || '', 
    "RawCodeNew": item.barcode || '', 
    "RawName": item.name || '', 
    unit: item.unit || '', 
    stock: parseInt(item.stock_qty || item.stockQty || item.stock) || 0, 
    is_featured: item.is_favourite || item.is_featured || false, 
    badge: item.badge || '' 
  });



  // Helper to generate valid UUID v4
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // UUID validation regex
  const isValidUUID = (str) => { 
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i; 
    return regex.test(str); 
  };

  // --- Universal Excel Export Utility ---
  const exportToExcel = (data, filename = 'export') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  // --- Universal Media Upload to Supabase Storage ---
  const uploadMediaToSupabase = async (file, bucketName = 'nm-media', subFolder = '') => { 
    try { 
      if (!file) return null; 
      
      // Clean and generate a completely unique filename 
      const fileExt = file.name.split('.').pop(); 
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = subFolder ? `${subFolder}/${fileName}` : fileName;
      
      // Upload file to the specified Supabase storage bucket 
      const { data, error } = await supabase.storage 
        .from(bucketName) 
        .upload(filePath, file); 

      if (error) throw error; 

      // Retrieve and return the permanent Public URL 
      const { data: { publicUrl } } = supabase.storage 
        .from(bucketName) 
        .getPublicUrl(filePath); 

      return publicUrl; 
    } catch (err) { 
      console.error(`Supabase Storage upload error [Bucket: ${bucketName}]:`, err.message); 
      return null; 
    } 
  };

  // --- Auto-Sync Function (re-usable for bulk sync) ---
  const autoSyncItemsToSupabase = async (items) => {
    try {
      const CHUNK_SIZE = 200;
      
      // First ensure all items have valid UUIDs
      const itemsWithValidUUIDs = items.map(item => {
        if (!item.id || !isValidUUID(item.id)) {
          return { ...item, id: generateUUID() };
        }
        return item;
      });

      // Update local state if any UUIDs were generated
      const hasUUIDUpdates = itemsWithValidUUIDs.some(item => !items.find(i => i.id === item.id)?.id || !isValidUUID(items.find(i => i.id === item.id)?.id));
      if (hasUUIDUpdates) {
        setItemMaster(itemsWithValidUUIDs);
      }

      // Sync in chunks
      for (let i = 0; i < itemsWithValidUUIDs.length; i += CHUNK_SIZE) {
        const chunk = itemsWithValidUUIDs.slice(i, i + CHUNK_SIZE);

        // Map to item_master schema
        const cleanItemMasterChunk = chunk.map(item => ({
          id: String(item.id),
          name: String(item.name || 'Unknown Item'),
          barcode: item.barcode ? String(item.barcode) : null,
          hsn_code: item.hsn_code || item.hsnCode || null,
          selling_price: parseFloat(item.selling_price || item.sellingPrice) || 0,
          mrp: parseFloat(item.mrp) || 0,
          purchase_rate: parseFloat(item.purchase_rate || item.purchaseRate) || 0,
          gst: parseFloat(item.gst) || 0,
          cess: parseFloat(item.cess) || 0,
          discount: parseFloat(item.discount) || 0,
          opening_stock: parseFloat(item.opening_stock || item.openingStock) || 0,
          stock_qty: parseFloat(item.stock_qty || item.stockQty) || 0,
          unit: item.unit ? String(item.unit) : null,
          item_group: item.item_group || item.group || null,
          main_category: item.main_category || item.mainCategory || null,
          sub_category: item.sub_category || item.subCategory || null,
          brand: item.brand ? String(item.brand) : null,
          is_favourite: Boolean(item.is_favourite || item.isFavourite),
          is_discountable: Boolean(item.is_discountable || item.isDiscountable),
          description: item.description ? String(item.description) : null
        }));

        // Map to products schema (NM App)
        const cleanProductsChunk = chunk.map(item => ({
          id: String(item.id),
          name: String(item.name || 'Unknown Item'),
          description: item.description ? String(item.description) : null,
          "ItemGroupName": item.main_category || item.mainCategory || item.item_group || item.group || '',
          "MRP": parseFloat(item.mrp) || 0,
          "Rate": parseFloat(item.selling_price || item.sellingPrice) || 0,
          "discountPerc": parseFloat(item.discount) || 0,
          "ImageUrl": item.picture || item.image_url || item.ImageUrl || '',
          "RawCodeNew": item.barcode ? String(item.barcode) : '',
          "RawName": String(item.name || 'Unknown Item'),
          unit: item.unit ? String(item.unit) : '',
          stock: parseInt(item.stock_qty || item.stockQty || item.stock) || 0,
          is_featured: Boolean(item.is_favourite || item.isFavourite || item.is_featured),
          badge: item.badge ? String(item.badge) : ''
        }));

        // Upsert both in parallel
        await Promise.all([
          supabase.from('item_master').upsert(cleanItemMasterChunk, { onConflict: 'id' }),
          supabase.from('products').upsert(cleanProductsChunk, { onConflict: 'id' })
        ]);
      }
    } catch (error) {
      console.error('Error during auto-sync:', error);
    }
  };

  // --- Initial Load from Supabase + Migration ---
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Fetch items from Supabase (source of truth)
        console.log("Fetching items from Supabase...");
        const { data: itemsFromDB, error: fetchError } = await supabase
          .from('item_master')
          .select('*');

        if (fetchError) throw fetchError;

        console.log(`Fetched ${itemsFromDB.length} items from Supabase`);

        // 2. Update itemMaster with Supabase data if available
        if (itemsFromDB.length > 0) {
          setItemMaster(itemsFromDB);
        } else {
          // 3. If no items in Supabase, check localStorage
          console.log("No items in Supabase, checking localStorage...");
          const localItems = JSON.parse(localStorage.getItem('nm_item_master')) || [];
          if (localItems.length > 0) {
            setItemMaster(localItems);
            // Sync local items to Supabase
            await autoSyncItemsToSupabase(localItems);
          }
        }

        // 4. Also sync other masters if needed (optional, but let's keep the migration for older items)
        const localItems = JSON.parse(localStorage.getItem('nm_item_master')) || [];
        if (localItems.length > 0 && itemsFromDB.length < localItems.length) {
          console.log("Migrating older items from localStorage to Supabase...");
          await autoSyncItemsToSupabase(localItems);
        }
      } catch (err) {
        console.error("Initialization failed:", err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []); // Run once on mount

  // --- Close product dropdown when clicking outside ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.product-dropdown-container')) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSave = async (tab, data, setter) => {
    // Ensure data has a valid UUID
    const processedData = { ...data };
    if (!processedData.id || !isValidUUID(processedData.id)) {
      processedData.id = generateUUID();
    }

    // Update local state first
    setter(prev => {
      const exists = prev.find(i => i.id === processedData.id);
      if (exists) return prev.map(i => i.id === processedData.id ? processedData : i);
      return [processedData, ...prev];
    });

    try {
      // Handle different tabs
      if (tab === 'ItemMaster') {
        // 1. item_master के लिए 100% सेफ डेटा टाइप्स
        const cleanItem = {
          id: String(processedData.id),
          name: String(processedData.name || 'Unknown Item'),
          barcode: processedData.barcode ? String(processedData.barcode) : null,
          hsn_code: processedData.hsn_code || processedData.hsnCode || null,
          selling_price: parseFloat(processedData.selling_price || processedData.sellingPrice) || 0,
          mrp: parseFloat(processedData.mrp) || 0,
          purchase_rate: parseFloat(processedData.purchase_rate || processedData.purchaseRate) || 0,
          gst: parseFloat(processedData.gst) || 0,
          cess: parseFloat(processedData.cess) || 0,
          discount: parseFloat(processedData.discount) || 0,
          opening_stock: parseFloat(processedData.opening_stock || processedData.openingStock) || 0,
          stock_qty: parseFloat(processedData.stock_qty || processedData.stockQty) || 0,
          unit: processedData.unit ? String(processedData.unit) : null,
          item_group: processedData.item_group || processedData.group || null,
          main_category: processedData.main_category || processedData.mainCategory || null,
          sub_category: processedData.sub_category || processedData.subCategory || null,
          brand: processedData.brand ? String(processedData.brand) : null,
          is_favourite: Boolean(processedData.is_favourite || processedData.isFavourite),
          is_discountable: Boolean(processedData.is_discountable || processedData.isDiscountable),
          description: processedData.description ? String(processedData.description) : null
        };

        // 2. products के लिए 100% सेफ डेटा टाइप్స (NM App के लिए)
        const cleanProduct = {
          id: String(processedData.id),
          name: String(processedData.name || 'Unknown Item'),
          description: processedData.description ? String(processedData.description) : null,
          "ItemGroupName": processedData.main_category || processedData.mainCategory || processedData.item_group || processedData.group || '',
          "MRP": parseFloat(processedData.mrp) || 0,
          "Rate": parseFloat(processedData.selling_price || processedData.sellingPrice) || 0,
          "discountPerc": parseFloat(processedData.discount) || 0,
          "ImageUrl": processedData.picture || processedData.image_url || processedData.ImageUrl || '',
          "RawCodeNew": processedData.barcode ? String(processedData.barcode) : '',
          "RawName": String(processedData.name || 'Unknown Item'),
          unit: processedData.unit ? String(processedData.unit) : '',
          stock: parseInt(processedData.stock_qty || processedData.stockQty || processedData.stock) || 0,
          is_featured: Boolean(processedData.is_favourite || processedData.isFavourite || processedData.is_featured),
          badge: processedData.badge ? String(processedData.badge) : ''
        };
        
        // Upsert to item_master and products in parallel for speed
        await Promise.all([
          supabase.from('item_master').upsert(cleanItem, { onConflict: 'id' }),
          supabase.from('products').upsert(cleanProduct, { onConflict: 'id' })
        ]);
      } else if (tab === 'AccountMaster') {
        const cleanAccount = {
          id: String(processedData.id),
          name: String(processedData.name || ''),
          phone: processedData.phone ? String(processedData.phone) : null,
          type: processedData.type ? String(processedData.type) : null,
          address: processedData.address ? String(processedData.address) : null,
          balance: parseFloat(processedData.balance) || 0
        };
        await supabase.from('account_master').upsert(cleanAccount, { onConflict: 'id' });
      } else if (tab === 'UserPermission') {
        const cleanUser = {
          id: String(processedData.id),
          username: String(processedData.username || ''),
          role: processedData.role ? String(processedData.role) : null,
          profile: processedData.profile ? String(processedData.profile) : null
        };
        await supabase.from('user_master').upsert(cleanUser, { onConflict: 'id' });
      } else if (tab === 'BannerMaster') {
        const cleanBanner = {
          id: String(processedData.id),
          title: String(processedData.title || ''),
          image_url: processedData.imageUrl ? String(processedData.imageUrl) : null,
          redirect: processedData.redirect ? String(processedData.redirect) : null,
          active: Boolean(processedData.active)
        };
        await supabase.from('banner_master').upsert(cleanBanner, { onConflict: 'id' });
      } else if (tab === 'CreditMaster') {
        const cleanCredit = {
          id: String(processedData.id),
          customer: String(processedData.customer || ''),
          threshold: parseFloat(processedData.threshold) || 0,
          due_date: processedData.dueDate ? String(processedData.dueDate) : null
        };
        await supabase.from('credit_master').upsert(cleanCredit, { onConflict: 'id' });
      }
    } catch (error) {
      console.error('Error saving to Supabase:', error);
    }
  };

  const handleDelete = async (id, setter, tab) => {
    setter(prev => prev.filter(i => i.id !== id));
    
    try {
      if (tab === 'ItemMaster') {
        await Promise.all([
          supabase.from('item_master').delete().eq('id', String(id)),
          supabase.from('products').delete().eq('id', String(id))
        ]);
      } else if (tab === 'AccountMaster') {
        await supabase.from('account_master').delete().eq('id', String(id));
      } else if (tab === 'UserPermission') {
        await supabase.from('user_master').delete().eq('id', String(id));
      } else if (tab === 'BannerMaster') {
        await supabase.from('banner_master').delete().eq('id', String(id));
      } else if (tab === 'CreditMaster') {
        await supabase.from('credit_master').delete().eq('id', String(id));
      }
    } catch (error) {
      console.error('Error deleting from Supabase:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="relative min-h-[calc(100vh-120px)] w-full overflow-hidden flex flex-col items-center justify-center">
            {/* Background Image */}
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40"
              style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop")' }}
            ></div>
            
            {/* Overlay Content */}
            <div className="relative z-10 w-full max-w-6xl px-10 flex flex-col md:flex-row justify-between items-start gap-12 text-slate-900 dark:text-white">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight uppercase">Call for support..</h2>
                <div className="text-2xl font-bold space-y-1">
                  <p>{SUPPORT_PHONE}</p>
                </div>
              </div>

              <div className="max-w-md space-y-8">
                <h2 className="text-4xl font-black leading-tight tracking-tighter">
                  We have multiple software products with us with all required modules.
                </h2>
                
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tight uppercase">Call for enquiry..</h3>
                  <p className="text-3xl font-bold">{SUPPORT_PHONE}</p>
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-10 right-10 text-right opacity-20">
              <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">{BRAND_NAME}</h1>
              <p className="text-xs font-black uppercase tracking-[0.5em]">{SUPPORT_PHONE}</p>
            </div>
          </div>
        );

      case 'ToolPass':
        return (
          <div className="p-6 max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[40px] shadow-2xl space-y-8 mt-12">
            <div className="text-center space-y-2">
              <div className="inline-flex p-4 bg-blue-600/10 text-blue-600 rounded-3xl mb-4"><ShieldCheck size={48} /></div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Admin Security Gate</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Verify Master PIN to Unlock Utilities</p>
            </div>
            {!isAdminAuthorized ? (
              <div className="space-y-6">
                <input 
                  type="password" 
                  placeholder="ENTER MASTER PIN" 
                  className="w-full text-center tracking-[1em] py-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[24px] text-2xl font-black focus:ring-4 focus:ring-blue-500/10 transition-all"
                  maxLength={4}
                  id="admin-pin"
                />
                <button 
                  onClick={() => {
                    const pin = document.getElementById('admin-pin').value;
                    if (pin === '1234') {
                      setIsAdminAuthorized(true);
                      alert("Authorization Successful!");
                    } else {
                      alert("Invalid PIN!");
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-500/20 transition-all"
                >
                  Authorize Access
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] text-center">
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">System Authorized</p>
                </div>
                <button onClick={handleSystemReset} className="w-full bg-rose-600/10 text-rose-600 hover:bg-rose-600 hover:text-white py-4 rounded-2xl font-black uppercase text-xs transition-all border border-rose-600/20">Clear All Transactional Logs</button>
                <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-black uppercase text-xs transition-all">Factory Reset Cache</button>
                <button onClick={() => setIsAdminAuthorized(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs transition-all mt-4">Lock Utilities</button>
              </div>
            )}
          </div>
        );

      case 'LocationItemDisplay':
      case 'Location-sub-category':
      case 'Location-main-category':
        const typeKey = activeTab === 'LocationItemDisplay' ? 'items' : activeTab === 'Location-sub-category' ? 'subCats' : 'mainCats';
        const dataSource = activeTab === 'LocationItemDisplay' ? itemMaster : activeTab === 'Location-sub-category' ? subCatMaster : mainCatMaster;
        
        return (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Mobile UI Display Ranker</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Control client-side visibility</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataSource.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-[32px] flex items-center justify-between group hover:border-blue-500 transition-all">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{activeTab === 'LocationItemDisplay' ? item.barcode : 'Category'}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setMobileDisplaySettings(prev => ({
                        ...prev,
                        [typeKey]: { ...prev[typeKey], [item.id]: !prev[typeKey][item.id] }
                      }));
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${mobileDisplaySettings[typeKey][item.id] ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                  >
                    {mobileDisplaySettings[typeKey][item.id] ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'BluetoothTerminal':
        return (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 text-emerald-500 font-mono p-8 rounded-[40px] shadow-2xl border-4 border-slate-800 relative overflow-hidden">
              <div className="absolute top-4 right-8 flex gap-2">
                <div className={`w-3 h-3 rounded-full ${printerStatus === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              </div>
              <h2 className="text-xl font-black uppercase tracking-[0.2em] mb-6 border-b border-emerald-500/20 pb-4">BT Thermal POS Emulator</h2>
              
              <div className="h-64 overflow-y-auto space-y-1 mb-8 scrollbar-hide">
                {printerLogs.map((log, i) => <p key={i} className="text-xs">{log}</p>)}
                {printerLogs.length === 0 && <p className="text-xs opacity-40">System Idle. Waiting for hardware handshake...</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => {
                    setPrinterLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Scanning for local devices...`]);
                    setTimeout(() => {
                      setPrinterLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Connected via Bluetooth to Star-Print58`]);
                      setPrinterStatus('Connected');
                    }, 1500);
                  }}
                  className="bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-900 border border-emerald-500/50 text-emerald-500 py-4 rounded-2xl font-black uppercase text-xs transition-all"
                >
                  Scan & Connect
                </button>
                <button 
                  onClick={handlePrinterTest}
                  className="bg-blue-500/10 hover:bg-blue-50 hover:text-slate-900 border border-blue-500/50 text-blue-400 py-4 rounded-2xl font-black uppercase text-xs transition-all disabled:opacity-30"
                  disabled={printerStatus !== 'Connected'}
                >
                  Print Test Receipt
                </button>
                <button 
                  onClick={() => { setPrinterStatus('Disconnected'); setPrinterLogs([]); }}
                  className="bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/50 text-rose-500 py-4 rounded-2xl font-black uppercase text-xs transition-all"
                >
                  Kill Connection
                </button>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{BRAND_NAME} - Hardware Interface v1.0.2 | {SUPPORT_PHONE}</p>
            </div>
          </div>
        );

      case 'transaction':
        if (!isCreatingTransaction) {
          // --- View Form (Dashboard Logs) ---
          const filteredTrans = transactionLogs.filter(log => {
            const matchesSearch = log.vNo.toLowerCase().includes(transFilters.search.toLowerCase()) || 
                                 log.entries.some(e => e.party.toLowerCase().includes(transFilters.search.toLowerCase()));
            const matchesFrom = !transFilters.from || new Date(log.date) >= new Date(transFilters.from);
            const matchesTo = !transFilters.to || new Date(log.date) <= new Date(transFilters.to);
            return matchesSearch && matchesFrom && matchesTo;
          });

          return (
            <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Transaction Details</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Financial Vouchers</p>
                </div>
                <button 
                  onClick={() => setIsCreatingTransaction(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Plus size={18} /> New Transaction
                </button>
              </div>

              {/* Search & Filters */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[32px] shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search Voucher No or Party..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs"
                    value={transFilters.search}
                    onChange={(e) => setTransFilters({...transFilters, search: e.target.value})}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">From</label>
                  <input type="date" className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs" value={transFilters.from} onChange={(e) => setTransFilters({...transFilters, from: e.target.value})} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">To</label>
                  <input type="date" className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs" value={transFilters.to} onChange={(e) => setTransFilters({...transFilters, to: e.target.value})} />
                </div>
              </div>

              {/* Logs Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm table-striped">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Voucher No</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Mode</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTrans.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold">{log.date}</td>
                        <td className="px-6 py-4 text-xs font-black text-blue-600 uppercase">{log.vNo}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${log.type === 'Payment' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold uppercase">{log.account}</td>
                        <td className="px-6 py-4 text-xs font-black text-right">₹{log.totalAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <button className="p-2 text-slate-400 hover:text-blue-500"><Eye size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {filteredTrans.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center opacity-30">
                          <div className="flex flex-col items-center">
                            <Repeat size={48} />
                            <p className="text-[10px] font-black uppercase mt-4">No Transactions Found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        } else {
          // --- New Form (Voucher Formulation) ---
          const currentTotal = transEntries.reduce((s, e) => s + Number(e.amount), 0);

          return (
            <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">New Transaction Voucher</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Entry Formulation</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsCreatingTransaction(false)} className="px-6 py-3 rounded-2xl text-sm font-black uppercase text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all">Cancel</button>
                  <button onClick={handleSaveTransaction} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">Save Voucher</button>
                </div>
              </div>

              {/* Voucher Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher Type</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold text-blue-600"
                    value={transHeader.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      setTransHeader({
                        ...transHeader, 
                        type, 
                        typeValue: type === 'Payment' ? 4 : 3
                      });
                    }}
                  >
                    <option value="Payment">Payment (Value 4)</option>
                    <option value="Receipt">Receipt (Value 3)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mode / Account</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold"
                    value={transHeader.account}
                    onChange={(e) => setTransHeader({...transHeader, account: e.target.value})}
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="WALLET">WALLET</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher Date</label>
                  <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm" value={transHeader.date} onChange={(e) => setTransHeader({...transHeader, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual V-No (Optional)</label>
                  <input type="text" placeholder="Auto-generated if empty" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm" value={transHeader.vNo} onChange={(e) => setTransHeader({...transHeader, vNo: e.target.value})} />
                </div>
              </div>

              {/* Entry Matrix */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Party / Account Name</label>
                    <input 
                      list="trans-parties"
                      type="text" 
                      placeholder="Search from Account Master..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm"
                      value={tempTransEntry.party}
                      onChange={(e) => setTempTransEntry({...tempTransEntry, party: e.target.value})}
                    />
                    <datalist id="trans-parties">
                      {accountMaster.map(acc => <option key={acc.id} value={acc.name} />)}
                    </datalist>
                  </div>
                  <div className="md:col-span-1 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Amount (₹)</label>
                    <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-black text-blue-600" value={tempTransEntry.amount} onChange={(e) => setTempTransEntry({...tempTransEntry, amount: e.target.value})} />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Remarks</label>
                    <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm" value={tempTransEntry.remarks} onChange={(e) => setTempTransEntry({...tempTransEntry, remarks: e.target.value})} />
                  </div>
                  <button 
                    onClick={() => {
                      if (!tempTransEntry.party || !tempTransEntry.amount) return;
                      setTransEntries([...transEntries, tempTransEntry]);
                      setTempTransEntry({ party: '', amount: '', remarks: '' });
                    }}
                    className="bg-blue-600 text-white h-9 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-3">Party Name</th>
                        <th className="px-6 py-3">Remarks</th>
                        <th className="px-6 py-3 text-right">Debit (DR)</th>
                        <th className="px-6 py-3 text-right">Credit (CR)</th>
                        <th className="px-6 py-3 text-center">X</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {transEntries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-6 py-3 text-xs font-black uppercase">{entry.party}</td>
                          <td className="px-6 py-3 text-xs text-slate-500">{entry.remarks}</td>
                          <td className="px-6 py-3 text-right font-black text-rose-500">{transHeader.type === 'Payment' ? `₹${Number(entry.amount).toFixed(2)}` : '-'}</td>
                          <td className="px-6 py-3 text-right font-black text-emerald-500">{transHeader.type === 'Receipt' ? `₹${Number(entry.amount).toFixed(2)}` : '-'}</td>
                          <td className="px-6 py-3 text-center">
                            <button onClick={() => setTransEntries(transEntries.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500 transition-all"><X size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                      <tr className="font-black text-xs text-slate-900 dark:text-white uppercase">
                        <td colSpan={2} className="px-6 py-4">Aggregate Voucher Total</td>
                        <td className="px-6 py-4 text-right text-rose-600">{transHeader.type === 'Payment' ? `₹${currentTotal.toFixed(2)}` : '-'}</td>
                        <td className="px-6 py-4 text-right text-emerald-600">{transHeader.type === 'Receipt' ? `₹${currentTotal.toFixed(2)}` : '-'}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Summary Box */}
              <div className="flex justify-end">
                <div className="w-full md:w-96 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span>{transHeader.type} Account</span>
                    <span>{transHeader.account}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-black text-blue-600 dark:text-blue-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>FINAL BALANCE</span>
                    <span>₹{currentTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }

      case 'Bom':
        return (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Bill of Materials (BOM)</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Recipe Management</p>
              </div>
              <button 
                onClick={() => {
                  const name = prompt("Enter Composite Item Name (Finished Good):");
                  if (!name) return;
                  const materialsStr = prompt("Enter Raw Materials (Format: Item1:Qty,Item2:Qty):");
                  if (!materialsStr) return;
                  
                  const materials = materialsStr.split(',').map(m => {
                    const [itemName, qty] = m.split(':');
                    return { name: itemName.trim(), qty: Number(qty) };
                  });

                  setBomMaster([...bomMaster, { id: Date.now(), finishedItem: name, materials }]);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <Plus size={18} /> Create New Recipe
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bomMaster.map(bom => (
                <div key={bom.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[32px] shadow-sm space-y-4 hover:border-blue-500 transition-all">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-black text-blue-600 uppercase tracking-tighter">{bom.finishedItem}</h3>
                    <Layers className="text-slate-300" size={24} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Ingredients / Raw Materials</p>
                    {bom.materials.map((m, i) => (
                      <div key={i} className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span>{m.name}</span>
                        <span className="text-blue-500">{m.qty} Units</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button 
                      onClick={() => setBomMaster(bomMaster.filter(b => b.id !== bom.id))}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {bomMaster.length === 0 && (
                <div className="col-span-full py-20 text-center opacity-30">
                  <Layers size={48} className="mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No BOM Recipes Defined</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'Production':
        return (
          <div className="p-6 max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[40px] shadow-xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Production Entry</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">NM MART Manufacturing Log</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select BOM Recipe</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-sm font-bold" id="prod-bom">
                  <option value="">Select Recipe</option>
                  {bomMaster.map(bom => <option key={bom.id} value={bom.id}>{bom.finishedItem}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Produced Quantity</label>
                <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 text-lg font-black text-blue-600" id="prod-qty" placeholder="Enter Units Produced" />
              </div>
              <button 
                onClick={() => {
                  const bomId = document.getElementById('prod-bom').value;
                  const qty = Number(document.getElementById('prod-qty').value);
                  if (!bomId || !qty) return alert("Select Recipe and Qty");
                  
                  const bom = bomMaster.find(b => String(b.id) === bomId);
                  
                  // 1. Deduct Materials
                  setItemMaster(prev => prev.map(item => {
                    const material = bom.materials.find(m => m.name === item.name);
                    if (material) {
                      return { ...item, stockQty: Number(item.stockQty) - (material.qty * qty) };
                    }
                    // 2. Increment Finished Good
                    if (item.name === bom.finishedItem) {
                      return { ...item, stockQty: Number(item.stockQty) + qty };
                    }
                    return item;
                  }));

                  setProductionLogs([{ id: Date.now(), bom: bom.finishedItem, qty, date: new Date().toLocaleString() }, ...productionLogs]);
                  alert(`Production Completed! ${qty} ${bom.finishedItem} added to stock.`);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-500/20 transition-all"
              >
                Finalize Production
              </button>
            </div>
          </div>
        );

      case 'StockTRF':
        return (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-xl space-y-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Inter-Branch Stock Transfer</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination Branch</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold" id="trf-branch">
                    <option>Select Branch</option>
                    <option>Warehouse-B</option>
                    <option>Central-Outlet</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Item</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold" id="trf-item">
                    <option>Select Item</option>
                    {itemMaster.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.stockQty})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transfer Quantity</label>
                  <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold" id="trf-qty" />
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      const branch = document.getElementById('trf-branch').value;
                      const itemId = document.getElementById('trf-item').value;
                      const qty = Number(document.getElementById('trf-qty').value);
                      
                      if (!itemId || !qty) return alert("Fill details");
                      
                      setItemMaster(prev => prev.map(i => 
                        String(i.id) === itemId ? { ...i, stockQty: Number(i.stockQty) - qty } : i
                      ));

                      setStockTransfers([{ id: Date.now(), branch, item: itemMaster.find(i => String(i.id) === itemId).name, qty, date: new Date().toLocaleString() }, ...stockTransfers]);
                      alert("Stock Transferred Successfully!");
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-500/20"
                  >
                    Confirm Transfer
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'StockTRFWastage':
        return (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-xl space-y-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter text-rose-500">Wastage & Damage Entry</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Item</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold" id="waste-item">
                    <option>Select Item</option>
                    {itemMaster.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Wastage Quantity</label>
                  <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold" id="waste-qty" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold" id="waste-cat">
                    <option>Expired</option>
                    <option>Broken</option>
                    <option>Leakage</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      const itemId = document.getElementById('waste-item').value;
                      const qty = Number(document.getElementById('waste-qty').value);
                      const cat = document.getElementById('waste-cat').value;
                      
                      if (!itemId || !qty) return alert("Fill details");
                      
                      setItemMaster(prev => prev.map(i => 
                        String(i.id) === itemId ? { ...i, stockQty: Number(i.stockQty) - qty } : i
                      ));

                      setWastageLogs([{ id: Date.now(), item: itemMaster.find(i => String(i.id) === itemId).name, qty, category: cat, date: new Date().toLocaleString() }, ...wastageLogs]);
                      alert("Wastage Recorded and Stock Adjusted.");
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-rose-500/20"
                  >
                    Confirm Wastage
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'PoEntry':
        return (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Purchase Order (PO)</h2>
              <div className="flex gap-3">
                <button onClick={() => setPoItems([])} className="px-6 py-3 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100">Reset</button>
                <button 
                  onClick={() => {
                    if (!poHeader.vendor || poItems.length === 0) return alert("Missing details");
                    setPurchaseOrders([{ ...poHeader, id: Date.now(), items: poItems }, ...purchaseOrders]);
                    alert("PO Saved Successfully!");
                    setPoItems([]);
                  }}
                  className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-500/20"
                >
                  Save PO
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold" value={poHeader.vendor} onChange={(e) => setPoHeader({...poHeader, vendor: e.target.value})}>
                  <option value="">Select Vendor</option>
                  {accountMaster.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PO Date</label>
                <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm" value={poHeader.date} onChange={(e) => setPoHeader({...poHeader, date: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold" value={poHeader.status} onChange={(e) => setPoHeader({...poHeader, status: e.target.value})}>
                  <option>Draft</option>
                  <option>Sent to Vendor</option>
                </select>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 flex gap-4">
                <select className="flex-1 bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-sm font-bold" id="po-item">
                  <option value="">Select Item</option>
                  {itemMaster.map(i => <option key={i.id} value={JSON.stringify(i)}>{i.name}</option>)}
                </select>
                <input type="number" className="w-24 bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-sm font-bold" id="po-qty" placeholder="Qty" />
                <button 
                  onClick={() => {
                    const itemData = JSON.parse(document.getElementById('po-item').value);
                    const qty = document.getElementById('po-qty').value;
                    if (!itemData || !qty) return;
                    setPoItems([...poItems, { ...itemData, orderQty: qty }]);
                  }}
                  className="bg-blue-600 text-white px-6 rounded-xl font-black uppercase text-[10px]"
                >
                  Add
                </button>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">Barcode</th>
                    <th className="px-6 py-4 text-center">Order Qty</th>
                    <th className="px-6 py-4 text-right">Est. Rate</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {poItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 font-bold">{item.name}</td>
                      <td className="px-6 py-4 text-slate-400">{item.barcode}</td>
                      <td className="px-6 py-4 text-center font-black text-blue-600">{item.orderQty}</td>
                      <td className="px-6 py-4 text-right">₹{item.costPrice}</td>
                      <td className="px-6 py-4 text-right font-black">₹{item.orderQty * item.costPrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'Rpt_CostingReport':
      case 'Rpt_StockTRf':
      case 'Rpt_Stockwastage':
      case 'Rpt_RO_Detail':
      case 'Rpt_Po_Item_Report':
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              {storeRoutes.find(r => r.id === activeTab)?.label}
            </h2>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm table-striped table-hover">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Ref/Date</th>
                    <th className="px-6 py-4">Entity/Branch</th>
                    <th className="px-6 py-4">Status/Cat</th>
                    <th className="px-6 py-4 text-right">Impact Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeTab === 'Rpt_Stockwastage' ? (
                    wastageLogs.map(log => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 font-bold">{log.date}</td>
                        <td className="px-6 py-4 uppercase">{log.item}</td>
                        <td className="px-6 py-4 text-rose-500 font-black">{log.category}</td>
                        <td className="px-6 py-4 text-right font-black">-{log.qty} Units</td>
                      </tr>
                    ))
                  ) : activeTab === 'Rpt_StockTRf' ? (
                    stockTransfers.map(log => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 font-bold">{log.date}</td>
                        <td className="px-6 py-4 uppercase">→ {log.branch}</td>
                        <td className="px-6 py-4 text-blue-500 font-black">{log.item}</td>
                        <td className="px-6 py-4 text-right font-black">{log.qty} Units</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center opacity-30">
                        <div className="flex flex-col items-center">
                          <Database size={48} />
                          <p className="text-[10px] font-black uppercase mt-4">No Store Records Found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Warehouse Management: {SUPPORT_PHONE}</p>
          </div>
        );

      case 'Rpt_SaleSummary':
      case 'Rpt_SaleReport':
      case 'Rpt_SaleReportItem_wise':
      case 'RptSaleItemSummary':
      case 'RestBillViewTrash':
      case 'RestBillViewCancelled':
      case 'Rpt_PurchaseReport':
      case 'Rpt_Stock_Report':
      case 'Rpt_Item_Statement_report':
      case 'Logbook':
      case 'LedgerView':
      case 'Rpt_Delivery_boy_Payment':
      case 'Rpt_CreditCustomer_Report':
      case 'Payment_remind':
        return (
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                  {reportRoutes.find(r => r.id === activeTab)?.label}
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">NM MART Analytical Engine</p>
              </div>
              <div className="flex items-center gap-3">
              {activeTab === 'Rpt_SaleSummary' && (
                <button 
                  onClick={() => exportToExcel(
                    saleLogs.map(s => ({
                      BillNo: s.billNo,
                      Customer: s.customer.name || 'Walk-in',
                      Date: new Date(s.date).toLocaleDateString(),
                      GrossTotal: s.totals.gross,
                      Tax: s.totals.tax,
                      NetTotal: s.totals.total,
                      PaymentMode: s.paymentMode
                    })), 
                    'sale-summary'
                  )}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all"
                >
                  <Download size={16} /> Export to Excel
                </button>
              )}
              {activeTab === 'Rpt_Stock_Report' && (
                <button 
                  onClick={() => exportToExcel(
                    itemMaster.map(i => ({
                      ItemName: i.name,
                      Barcode: i.barcode,
                      MRP: i.mrp,
                      SellingPrice: i.sellingPrice,
                      StockQty: i.stockQty,
                      Unit: i.unit,
                      Group: i.group,
                      Brand: i.brand
                    })), 
                    'stock-report'
                  )}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all"
                >
                  <Download size={16} /> Export to Excel
                </button>
              )}
              {activeTab === 'LedgerView' && (
                <button 
                  onClick={() => exportToExcel(
                    transactionLogs.map(t => ({
                      VoucherNo: t.vNo,
                      Date: t.date,
                      Type: t.type,
                      Account: t.account,
                      TotalAmount: t.totalAmount
                    })), 
                    'ledger-view'
                  )}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all"
                >
                  <Download size={16} /> Export to Excel
                </button>
              )}
              {activeTab === 'Rpt_CreditCustomer_Report' && (
                <button 
                  onClick={() => exportToExcel(
                    creditMaster.map(c => ({
                      Customer: c.customer,
                      CreditThreshold: c.threshold,
                      DueDate: c.dueDate
                    })), 
                    'credit-report'
                  )}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all"
                >
                  <Download size={16} /> Export to Excel
                </button>
              )}
              <button className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-slate-700 transition-all">
                <Download size={16} /> Export PDF
              </button>
            </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[32px] shadow-sm flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Global Search..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs"
                  value={reportFilters.search}
                  onChange={(e) => setReportFilters({...reportFilters, search: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">From</label>
                <input type="date" className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs" value={reportFilters.from} onChange={(e) => setReportFilters({...reportFilters, from: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">To</label>
                <input type="date" className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs" value={reportFilters.to} onChange={(e) => setReportFilters({...reportFilters, to: e.target.value})} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm table-striped table-hover">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-widest">
                    {activeTab === 'Rpt_Stock_Report' ? (
                      <tr>
                        <th className="px-6 py-4">Item Name</th>
                        <th className="px-6 py-4">Barcode</th>
                        <th className="px-6 py-4 text-center">Opening</th>
                        <th className="px-6 py-4 text-center">Stock In</th>
                        <th className="px-6 py-4 text-center">Stock Out</th>
                        <th className="px-6 py-4 text-right">Balance</th>
                      </tr>
                    ) : activeTab === 'Rpt_SaleSummary' ? (
                      <tr>
                        <th className="px-6 py-4">Metric</th>
                        <th className="px-6 py-4 text-right">Value</th>
                        <th className="px-6 py-4">Notes</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-6 py-4">Date/Ref</th>
                        <th className="px-6 py-4">Identity/Name</th>
                        <th className="px-6 py-4">Category/Type</th>
                        <th className="px-6 py-4 text-right">Amount/Qty</th>
                        <th className="px-6 py-4 text-right">Net Value</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeTab === 'Rpt_Stock_Report' ? (
                      itemMaster.map(item => (
                        <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${item.stockQty < 5 ? 'bg-rose-50 dark:bg-rose-500/10' : ''}`}>
                          <td className="px-6 py-4 text-xs font-black uppercase">{item.name}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">{item.barcode}</td>
                          <td className="px-6 py-4 text-xs font-bold text-center">0</td>
                          <td className="px-6 py-4 text-xs font-bold text-center text-emerald-500">{item.stockQty}</td>
                          <td className="px-6 py-4 text-xs font-bold text-center text-rose-500">0</td>
                          <td className={`px-6 py-4 text-xs font-black text-right ${item.stockQty < 5 ? 'text-rose-600' : 'text-blue-600'}`}>{item.stockQty}</td>
                        </tr>
                      ))
                    ) : activeTab === 'Rpt_SaleSummary' ? (
                      <>
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-xs font-bold">Total Bills Issued</td>
                          <td className="px-6 py-4 text-xs font-black text-right">0</td>
                          <td className="px-6 py-4 text-[10px] text-slate-400">Total volume of sales</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-xs font-bold">Gross Revenue</td>
                          <td className="px-6 py-4 text-xs font-black text-right">₹0.00</td>
                          <td className="px-6 py-4 text-[10px] text-slate-400">Before discounts & tax</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-xs font-bold">Total GST Collected</td>
                          <td className="px-6 py-4 text-xs font-black text-right text-blue-500">₹0.00</td>
                          <td className="px-6 py-4 text-[10px] text-slate-400">Aggregated tax value</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center opacity-30">
                          <div className="flex flex-col items-center">
                            <Database size={48} />
                            <p className="text-[10px] font-black uppercase mt-4">No Data in Selected Range</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Support: {SUPPORT_PHONE} | {BRAND_NAME} Retail OS</p>
            </div>
          </div>
        );

      case 'KotView':
        return (
          <div className="p-6 space-y-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Online Order Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {onlineOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[32px] shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{order.time}</span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">{order.customer}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${order.status === 'Pending' ? 'bg-amber-500/10 text-amber-600' : order.status === 'Preparing' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">{order.items}</p>
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                    {order.status === 'Pending' && (
                      <button onClick={() => handleUpdateOrderStatus(order.id, 'Preparing')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Accept Order</button>
                    )}
                    {order.status === 'Preparing' && (
                      <select 
                        className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-[10px] font-black uppercase"
                        onChange={(e) => handleUpdateOrderStatus(order.id, 'Dispatched', e.target.value)}
                      >
                        <option>Assign Rider</option>
                        {deliveryBoyMaster.map(boy => <option key={boy.id} value={boy.name}>{boy.name}</option>)}
                      </select>
                    )}
                    <span className="ml-auto text-lg font-black text-slate-900 dark:text-white">₹{order.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'RestBillView':
      case 'RestBillViewDelivery':
        const isDelivery = activeTab === 'RestBillViewDelivery';
        return (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{isDelivery ? 'Delivery Bills' : 'Historical Bills'}</h2>
              <div className="flex gap-4">
                <input type="date" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs" value={viewDates.from} onChange={(e) => setViewDates({...viewDates, from: e.target.value})} />
                <input type="date" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs" value={viewDates.to} onChange={(e) => setViewDates({...viewDates, to: e.target.value})} />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Bill No</th>
                    <th className="px-6 py-4">Customer</th>
                    {isDelivery && <th className="px-6 py-4">Rider</th>}
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {saleLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-black">#{log.billNo}</td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold uppercase">{log.customer.name || 'Walk-in'}</p>
                          <p className="text-[10px] text-slate-400">{log.customer.phone || 'No Phone'}</p>
                        </td>
                        {isDelivery && <td className="px-6 py-4 text-xs font-bold uppercase">{log.rider || 'Unassigned'}</td>}
                        <td className="px-6 py-4 font-black">₹{log.totals.total}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setSelectedInvoice(log)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg"><Eye size={18} /></button>
                        </td>
                      </tr>
                    ))}
                    {saleLogs.length === 0 && (
                      <tr>
                        <td colSpan={isDelivery ? 5 : 4} className="px-6 py-20 text-center opacity-30">
                          <div className="flex flex-col items-center">
                            <Database size={48} />
                            <p className="text-[10px] font-black uppercase mt-4">No Bills Found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
              </table>
            </div>
          </div>
        );

      case 'Payment_View':
        return (
          <div className="p-6 max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Payment Lookup</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Search by Mobile Number</p>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
              <input 
                type="text" 
                placeholder="Enter Customer Mobile Number..." 
                className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] text-lg font-black focus:ring-4 focus:ring-blue-500/10 transition-all shadow-xl"
                value={viewSearch}
                onChange={(e) => setViewSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3,4,5,6,7,8,9,'C',0,'<'].map(key => (
                <button 
                  key={key} 
                  onClick={() => {
                    if (key === 'C') setViewSearch('');
                    else if (key === '<') setViewSearch(prev => prev.slice(0, -1));
                    else setViewSearch(prev => prev + key);
                  }}
                  className="h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xl font-black hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        );

      case 'WalletRecharge':
        return (
          <div className="p-6 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-xl space-y-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Loyalty Credits</h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Phone</label>
                  <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold" value={rechargeSearch} onChange={(e) => setRechargeSearch(e.target.value)} />
                </div>
                <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Current Balance</span>
                  <span className="text-2xl font-black text-blue-600">₹{walletBalances[rechargeSearch] || 0}</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Add Amount</label>
                  <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-lg font-black text-blue-600" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} />
                </div>
                <button 
                  onClick={() => handleRecharge(rechargeSearch, rechargeAmount)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-500/20 transition-all"
                >
                  Process Recharge
                </button>
              </div>
            </div>
            <div className="hidden md:flex flex-col items-center justify-center text-center p-8 opacity-40">
              <Wallet size={120} className="text-slate-300 mb-6" />
              <h3 className="text-xl font-black uppercase tracking-widest">Recharge Desk</h3>
              <p className="text-xs font-bold text-slate-500 uppercase mt-2">Manage customer loyalty and wallet balances</p>
            </div>
          </div>
        );

      case 'purchase':
        if (!isCreatingPurchase) {
          // --- View Form Dashboard ---
          const filteredLogs = purchaseLogs.filter(log => {
            const matchesSearch = log.billNo.toLowerCase().includes(purchaseSearch.toLowerCase()) || log.party.toLowerCase().includes(purchaseSearch.toLowerCase());
            const matchesFrom = !fromDate || new Date(log.date) >= new Date(fromDate);
            const matchesTo = !toDate || new Date(log.date) <= new Date(toDate);
            return matchesSearch && matchesFrom && matchesTo;
          });

          return (
            <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Purchase Logs</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Historical Records</p>
                </div>
                <button 
                  onClick={() => setIsCreatingPurchase(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Plus size={18} /> New Purchase
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[32px] shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search Bill No or Party..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs"
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">From</label>
                  <input type="date" className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">To</label>
                  <input type="date" className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Bill No</th>
                      <th className="px-6 py-4">Party/Supplier</th>
                      <th className="px-6 py-4 text-center">Qty</th>
                      <th className="px-6 py-4 text-right">Net Amount</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold">{log.date}</td>
                        <td className="px-6 py-4 text-xs font-black text-blue-600">#{log.billNo}</td>
                        <td className="px-6 py-4 text-xs font-bold uppercase">{log.party}</td>
                        <td className="px-6 py-4 text-xs font-bold text-center">{log.totalQty}</td>
                        <td className="px-6 py-4 text-xs font-black text-right">₹{Math.round(log.netAmount)}</td>
                        <td className="px-6 py-4 text-right"><button className="p-2 text-slate-400 hover:text-blue-500"><Eye size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        } else {
          // --- New Form Entry ---
          const totals = {
            qty: purchaseItems.reduce((s, i) => s + Number(i.qty), 0),
            tax: purchaseItems.reduce((s, i) => s + i.gstAmt, 0),
            net: purchaseItems.reduce((s, i) => s + i.gross, 0)
          };

          return (
            <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">New Purchase Invoice</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Entry Board</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsCreatingPurchase(false)} className="px-6 py-3 rounded-2xl text-sm font-black uppercase text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all">Cancel</button>
                  <button onClick={handleSavePurchase} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">Save Invoice</button>
                </div>
              </div>

              {/* Header Details */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bill Number</label>
                  <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm" value={purchaseHeader.billNo} onChange={(e) => setPurchaseHeader({...purchaseHeader, billNo: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Date</label>
                  <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm" value={purchaseHeader.date} onChange={(e) => setPurchaseHeader({...purchaseHeader, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Party</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold" value={purchaseHeader.party} onChange={(e) => setPurchaseHeader({...purchaseHeader, party: e.target.value})}>
                    <option value="">Select Party</option>
                    <option value="Cash">Cash Purchase</option>
                    {accountMaster.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                  <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold" value={purchaseHeader.department} onChange={(e) => setPurchaseHeader({...purchaseHeader, department: e.target.value})}>
                    <option value="">Select Dept</option>
                    {deptMaster.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax Type</label>
                  <select className="w-full bg-blue-600 text-white border-none rounded-xl px-4 py-2 text-sm font-bold" value={purchaseHeader.taxType} onChange={(e) => setPurchaseHeader({...purchaseHeader, taxType: e.target.value})}>
                    <option value="Exclude">GST Exclude</option>
                    <option value="Include">GST Include</option>
                  </select>
                </div>
              </div>

              {/* Item Entry Matrix */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-8 gap-3 items-end">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Item Name</label>
                    <input 
                      list="purchase-items"
                      type="text" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm"
                      value={tempPurchaseItem.name}
                      onChange={(e) => {
                        const item = itemMaster.find(i => i.name === e.target.value);
                        if (item) {
                          setTempPurchaseItem({
                            ...tempPurchaseItem,
                            name: item.name,
                            barcode: item.barcode,
                            rate: item.costPrice,
                            gst: item.gst
                          });
                        } else {
                          setTempPurchaseItem({...tempPurchaseItem, name: e.target.value});
                        }
                      }}
                    />
                    <datalist id="purchase-items">
                      {itemMaster.map(i => <option key={i.id} value={i.name} />)}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Barcode</label>
                    <input type="text" readOnly className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-xl px-4 py-2 text-sm opacity-50" value={tempPurchaseItem.barcode} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Qty</label>
                    <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm" value={tempPurchaseItem.qty} onChange={(e) => setTempPurchaseItem({...tempPurchaseItem, qty: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Purc Rate</label>
                    <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold text-blue-600" value={tempPurchaseItem.rate} onChange={(e) => setTempPurchaseItem({...tempPurchaseItem, rate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Disc%</label>
                    <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm" value={tempPurchaseItem.discount} onChange={(e) => setTempPurchaseItem({...tempPurchaseItem, discount: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">GST%</label>
                    <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm" value={tempPurchaseItem.gst} onChange={(e) => setTempPurchaseItem({...tempPurchaseItem, gst: e.target.value})} />
                  </div>
                  <button 
                    onClick={() => {
                      if (!tempPurchaseItem.name) return;
                      const calculated = calculatePurchaseLine(tempPurchaseItem, purchaseHeader.taxType);
                      setPurchaseItems([...purchaseItems, calculated]);
                      setTempPurchaseItem({ id: '', name: '', barcode: '', qty: 1, rate: 0, discount: 0, gst: 0 });
                    }}
                    className="bg-blue-600 text-white h-9 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-3">Item Details</th>
                        <th className="px-6 py-3 text-center">Qty</th>
                        <th className="px-6 py-3 text-right">Rate</th>
                        <th className="px-6 py-3 text-right">Disc</th>
                        <th className="px-6 py-3 text-right">Taxable</th>
                        <th className="px-6 py-3 text-right">GST</th>
                        <th className="px-6 py-3 text-right">Gross</th>
                        <th className="px-6 py-3 text-center">X</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {purchaseItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="px-6 py-3">
                            <p className="text-xs font-black uppercase">{item.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold">{item.barcode}</p>
                          </td>
                          <td className="px-6 py-3 text-center font-bold">{item.qty}</td>
                          <td className="px-6 py-3 text-right font-medium">₹{item.rate}</td>
                          <td className="px-6 py-3 text-right text-rose-500">₹{item.discAmt.toFixed(2)}</td>
                          <td className="px-6 py-3 text-right font-medium">₹{item.taxableBasis.toFixed(2)}</td>
                          <td className="px-6 py-3 text-right text-blue-500">₹{item.gstAmt.toFixed(2)}</td>
                          <td className="px-6 py-3 text-right font-black">₹{item.gross.toFixed(2)}</td>
                          <td className="px-6 py-3 text-center">
                            <button onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500 transition-all"><X size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                      <tr className="font-black text-xs text-slate-900 dark:text-white uppercase">
                        <td className="px-6 py-4">Total Summary</td>
                        <td className="px-6 py-4 text-center">{totals.qty}</td>
                        <td colSpan={3}></td>
                        <td className="px-6 py-4 text-right text-blue-500">₹{totals.tax.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-blue-600">₹{totals.net.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Footer Summary */}
              <div className="flex justify-end">
                <div className="w-full md:w-96 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>ITEM NET TOTAL</span>
                    <span>₹{totals.net.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>ROUND-OFF</span>
                    <span>₹{(Math.round(totals.net) - totals.net).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-black text-blue-600 dark:text-blue-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>BILL AMOUNT</span>
                    <span>₹{Math.round(totals.net)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }
      
      case 'ItemMaster':
        if (isItemImportMode) {
          // --- Import Item Master View ---
          
          const handleFileUpload = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            console.log('File selected:', file.name, file.type);
            setSelectedFileName(file.name);
            
            const reader = new FileReader();
            
            const processData = (data) => {
              try {
                let items = [];
                
                // Check if it's Excel file or CSV
                if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                  // Excel file - use XLSX library
                  const workbook = XLSX.read(data, { type: 'array' });
                  const firstSheetName = workbook.SheetNames[0];
                  const worksheet = workbook.Sheets[firstSheetName];
                  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                  
                  console.log('Excel data:', jsonData);
                  
                  if (jsonData.length < 2) {
                    alert('Excel file mein kam se kam 2 rows honi chahiye (headers + data)!');
                    return;
                  }
                  
                  const headers = jsonData[0].map(h => String(h).trim().toLowerCase());
                  console.log('Excel headers:', headers);
                  
                  for (let index = 1; index < jsonData.length; index++) {
                    const row = jsonData[index];
                    if (!row || row.length === 0) continue;
                    
                    const item = { id: Date.now() + index };
                    
                    headers.forEach((header, i) => {
                      if (i >= row.length) return;
                      const value = row[i];
                      
                      if (header.includes('item') && header.includes('name')) item.name = String(value);
                      else if (header.includes('barcode')) item.barcode = String(value);
                      else if (header.includes('hsn')) item.hsnCode = String(value);
                      else if (header.includes('main') && header.includes('category')) item.mainCategory = String(value);
                      else if (header.includes('sub') && header.includes('category')) item.subCategory = String(value);
                      else if (header.includes('mrp')) item.mrp = parseFloat(value) || 0;
                      else if (header.includes('sale') || header.includes('rate')) item.sellingPrice = parseFloat(value) || 0;
                      else if (header.includes('purc') || header.includes('purchase')) item.purchaseRate = parseFloat(value) || 0;
                      else if (header.includes('gst')) item.gst = parseFloat(value) || 0;
                      else if (header.includes('unit')) item.unit = String(value);
                      else if (header.includes('group')) item.group = String(value);
                      else if (header.includes('brand')) item.brand = String(value);
                      else if (header.includes('stock')) {
                        item.openingStock = parseInt(value) || 0;
                        item.stockQty = parseInt(value) || 0;
                      }
                    });
                    
                    // Default values
                    if (!item.cess) item.cess = 0;
                    if (!item.discount) item.discount = 0;
                    if (!item.isFavourite) item.isFavourite = 0;
                    if (!item.isDiscountable) item.isDiscountable = 0;
                    
                    if (item.name) {
                      items.push(item);
                    }
                  }
                } else {
                  // CSV file - existing logic
                  const text = new TextDecoder('utf-8').decode(data);
                  console.log('File content loaded, length:', text.length);
                  
                  let lines = text.split(/\r?\n/).filter(line => line.trim());
                  console.log('Total lines:', lines.length);
                  
                  if (lines.length < 2) {
                    alert('File mein kam se kam 2 lines honi chahiye (headers + data)!');
                    return;
                  }
                  
                  let delimiter = ',';
                  if (lines[0].includes('\t') && !lines[0].includes(',')) {
                    delimiter = '\t';
                  }
                  
                  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
                  console.log('Headers:', headers);
                  
                  for (let index = 1; index < lines.length; index++) {
                    const line = lines[index].trim();
                    if (!line) continue;
                    
                    const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
                    const item = { id: Date.now() + index };
                    
                    headers.forEach((header, i) => {
                      if (i >= values.length) return;
                      
                      if (header.includes('item') && header.includes('name')) item.name = values[i];
                      else if (header.includes('barcode')) item.barcode = values[i];
                      else if (header.includes('hsn')) item.hsnCode = values[i];
                      else if (header.includes('main') && header.includes('category')) item.mainCategory = values[i];
                      else if (header.includes('sub') && header.includes('category')) item.subCategory = values[i];
                      else if (header.includes('mrp')) item.mrp = parseFloat(values[i]) || 0;
                      else if (header.includes('sale') || header.includes('rate')) item.sellingPrice = parseFloat(values[i]) || 0;
                      else if (header.includes('purc') || header.includes('purchase')) item.purchaseRate = parseFloat(values[i]) || 0;
                      else if (header.includes('gst')) item.gst = parseFloat(values[i]) || 0;
                      else if (header.includes('unit')) item.unit = values[i];
                      else if (header.includes('group')) item.group = values[i];
                      else if (header.includes('brand')) item.brand = values[i];
                      else if (header.includes('stock')) {
                        item.openingStock = parseInt(values[i]) || 0;
                        item.stockQty = parseInt(values[i]) || 0;
                      }
                    });
                    
                    if (!item.cess) item.cess = 0;
                    if (!item.discount) item.discount = 0;
                    if (!item.isFavourite) item.isFavourite = 0;
                    if (!item.isDiscountable) item.isDiscountable = 0;
                    
                    if (item.name) {
                      items.push(item);
                    }
                  }
                }
                
                console.log('Parsed items:', items);
                
                if (items.length === 0) {
                  alert('File mein koi valid item nahi mila!');
                  return;
                }
                
                setImportedItems(items);
              } catch (error) {
                console.error('Error reading file:', error);
                alert('File read karte mein error aaya! Please check file format.');
              }
            };
            
            reader.onload = (event) => {
              const data = event.target.result;
              processData(data);
            };
            
            reader.onerror = (error) => {
              console.error('FileReader error:', error);
              alert('File read nahi ho pa rahi!');
            };
            
            // Read as arraybuffer for Excel, as text for CSV
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
              reader.readAsArrayBuffer(file);
            } else {
              reader.readAsArrayBuffer(file); // Use arraybuffer for both for consistency
            }
          };
          
          const handleImport = async () => {
            if (importedItems.length === 0) {
              alert('Pehle file upload karein!');
              return;
            }
            
            // Helper to find matching ID from masters
            const findIdFromName = (list, name) => {
              if (!name) return '';
              const exact = list.find(i => String(i.name).toLowerCase() === String(name).toLowerCase());
              if (exact) return String(exact.id);
              // Also check if it's already an ID
              if (list.find(i => String(i.id) === String(name))) return String(name);
              return name; // Keep as name if no match
            };
            
            // Convert imported items to proper format (supports both camelCase and snake_case
            const formattedItems = importedItems.map(item => ({
              id: generateUUID(),
              name: item.name || 'Unknown Item',
              barcode: item.barcode || '',
              hsn_code: item.hsnCode || item.hsn_code || item.hsncode || '',
              selling_price: Number(item.sellingPrice || item.sale_rate || item.mrp || 0),
              mrp: Number(item.mrp || 0),
              purchase_rate: Number(item.purchaseRate || item.purc_rate || 0),
              gst: Number(item.gst || 0),
              cess: 0,
              discount: 0,
              opening_stock: Number(item.openingStock || item.stockQty || item.stock || 0),
              stock_qty: Number(item.stockQty || item.openingStock || item.stock || 0),
              unit: findIdFromName(unitMaster, item.unit),
              item_group: findIdFromName(groupMaster, item.group),
              main_category: item.mainCategory || item.main_category || item.maincategory || '',
              sub_category: findIdFromName(subCatMaster, item.subCategory || item.sub_category || item.subcategory),
              brand: findIdFromName(brandMaster, item.brand),
              is_favourite: false,
              is_discountable: false,
              description: ''
            }));
            
            console.log('Formatted Items:', formattedItems);
            console.log('Before setItemMaster, current length:', itemMaster.length);
            
            // Update the item master locally
            setItemMaster(prev => {
              const newItems = [...prev, ...formattedItems];
              console.log('After setItemMaster, new length:', newItems.length);
              return newItems;
            });
            
            // Sync all imported items to both Supabase (item_master and products)
            await autoSyncItemsToSupabase(formattedItems);
            
            alert(`${formattedItems.length} items successfully import ho gaye! Now check Item Master & NM App!`);
            
            // Clear the form
            setImportedItems([]);
            setSelectedFileName('');
            setIsItemImportMode(false);
          };
          
          const downloadSample = () => {
            const sampleData = [
              ['Item Name', 'Barcode', 'HSNCODE', 'Main Category', 'Sub Category', 'MRP', 'Sale Rate', 'Purc Rate', 'GST%', 'Unit', 'Group', 'Brand', 'Stock'],
              ['NESTLE KITKAT 16.4GM', '8901058005233', '18063200', 'Chocolates', '405', '10', '10', '8', '12', '72', '28', '11', '100'],
              ['ACT II MAGIC BUTTER', '8901512540805', '200819', 'Snacks', '406', '10', '10', '7', '5', '72', '28', '12', '50']
            ];
            
            const csvContent = sampleData.map(row => row.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'item_master_sample.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          };
          
          return (
            <div className="p-8 space-y-8 animate-in fade-in duration-500">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600">
                  <Package size={32} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Import Item Master</h2>
                  <p className="text-sm text-slate-500 mt-1">CSV, XLS, XLSX files supported</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <input 
                      type="file" 
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-all cursor-pointer"
                    />
                    {selectedFileName && (
                      <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                        Selected: {selectedFileName}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={downloadSample}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-sm font-black uppercase tracking-widest"
                    >
                      <Download size={18} /> Download Sample
                    </button>
                    <button 
                      onClick={() => {
                        // Load sample data directly with proper format
                        const sampleItems = [
                          { 
                            id: Date.now() + 1, 
                            name: 'NESTLE KITKAT 16.4GM', 
                            barcode: '8901058005233', 
                            hsnCode: '18063200', 
                            mainCategory: 'Chocolates', 
                            subCategory: '405', 
                            mrp: 10, 
                            sellingPrice: 10, 
                            purchaseRate: 8, 
                            gst: 12, 
                            unit: '72', 
                            group: '28', 
                            brand: '11', 
                            stockQty: 100, 
                            openingStock: 100, 
                            cess: 0, 
                            discount: 0, 
                            isFavourite: 1, 
                            isDiscountable: 0 
                          },
                          { 
                            id: Date.now() + 2, 
                            name: 'ACT II MAGIC BUTTER', 
                            barcode: '8901512540805', 
                            hsnCode: '200819', 
                            mainCategory: 'Snacks', 
                            subCategory: '406', 
                            mrp: 10, 
                            sellingPrice: 10, 
                            purchaseRate: 7, 
                            gst: 5, 
                            unit: '72', 
                            group: '28', 
                            brand: '12', 
                            stockQty: 50, 
                            openingStock: 50, 
                            cess: 0, 
                            discount: 0, 
                            isFavourite: 0, 
                            isDiscountable: 0 
                          },
                        ];
                        setImportedItems(sampleItems);
                        setSelectedFileName('Sample Data (Loaded Directly)');
                      }}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-600 text-white hover:bg-green-700 transition-all text-sm font-black uppercase tracking-widest"
                    >
                      Load Sample Data
                    </button>
                  </div>
                </div>
                
                {importedItems.length > 0 && (
                  <>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                          Preview ({importedItems.length} items) - Showing first 50
                        </h3>
                        <button 
                          onClick={handleImport}
                          className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                        >
                          <Save size={18} /> Upload & Import
                        </button>
                      </div>
                      
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-800 text-white uppercase text-xs font-black tracking-widest">
                            <tr>
                              <th className="px-4 py-3">Item Name</th>
                              <th className="px-4 py-3">Barcode</th>
                              <th className="px-4 py-3">HSNCODE</th>
                              <th className="px-4 py-3">Main Category</th>
                              <th className="px-4 py-3">Sub Category</th>
                              <th className="px-4 py-3">MRP</th>
                              <th className="px-4 py-3">Sale Rate</th>
                              <th className="px-4 py-3">Purc Rate</th>
                              <th className="px-4 py-3">GST%</th>
                              <th className="px-4 py-3">Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {importedItems.slice(0, 50).map((item, index) => (
                              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{item.name}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.barcode}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.hsnCode}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.mainCategory}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.subCategory}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-bold">{item.mrp}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-bold text-blue-600 dark:text-blue-400">{item.sellingPrice}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-bold">{item.purchaseRate}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-bold">{item.gst}%</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-bold">{item.stockQty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importedItems.length > 50 && (
                          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center text-sm text-slate-500">
                            Only first 50 items shown - all {importedItems.length} will be imported!
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-start gap-4">
                <button 
                  onClick={() => { setIsItemImportMode(false); setImportedItems([]); setSelectedFileName(''); }}
                  className="px-8 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Back to Grid
                </button>
                {importedItems.length > 0 && (
                  <button 
                    onClick={() => { setImportedItems([]); setSelectedFileName(''); }}
                    className="px-8 py-3 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-black uppercase text-xs tracking-widest hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          );
        }

        if (isItemGridMode) {
          // --- #dataviewgrid (Screenshot 1) ---
          const filteredItems = itemMaster.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(itemSearch.toLowerCase()) || item.barcode.includes(itemSearch);
            return matchesSearch;
          });

          // Pagination
          const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
          const startIndex = (itemGridPage - 1) * itemsPerPage;
          const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

          return (
            <div id="dataviewgrid" className="p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <Layers className="text-slate-600 dark:text-slate-400" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Item Master</h2>
                    <p className="text-sm text-slate-500 mt-1">{filteredItems.length} items total</p>
                  </div>
                </div>

                <div className="flex-1 max-w-2xl relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    id="search"
                    type="text" 
                    placeholder="Search" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    value={itemSearch}
                    onChange={(e) => { setItemSearch(e.target.value); setItemGridPage(1); }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsItemImportMode(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/5"
                  >
                    <Download size={16} /> Import Item
                  </button>
                  <button 
                    onClick={async () => {
                      await autoSyncItemsToSupabase(itemMaster);
                      alert("All items synced to Supabase successfully!");
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-green-500/5"
                  >
                    <Repeat size={16} /> Sync All to Supabase
                  </button>
                  <button 
                    onClick={() => { setItemPageMode('NEW'); setItemFormData({}); setIsItemGridMode(false); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2"
                  >
                    <Plus size={18} /> Create New
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white uppercase text-[11px] font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-5">SNo</th>
                        <th className="px-6 py-5">Name</th>
                        <th className="px-6 py-5 hide-on-mobile">Barcode</th>
                        <th className="px-6 py-5 hide-on-mobile">HSN Code</th>
                        <th className="px-6 py-5">Rate</th>
                        <th className="px-6 py-5">Discount</th>
                        <th className="px-6 py-5 text-center">Picture</th>
                        <th className="px-6 py-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginatedItems.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                          <td className="px-6 py-5 text-xs font-black text-slate-900 dark:text-white">{startIndex + index + 1}</td>
                          <td className="px-6 py-5">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{item.name}</p>
                          </td>
                          <td className="px-6 py-5 text-xs font-medium text-slate-500 dark:text-slate-400 hide-on-mobile">{item.barcode}</td>
                          <td className="px-6 py-5 text-xs font-medium text-slate-500 dark:text-slate-400 hide-on-mobile">{item.hsnCode}</td>
                          <td className="px-6 py-5 text-xs font-black text-slate-900 dark:text-white">{item.sellingPrice}</td>
                          <td className="px-6 py-5 text-xs font-black text-slate-900 dark:text-white">{item.discount}</td>
                          <td className="px-6 py-5 text-center">
                            <div className="w-10 h-10 mx-auto bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden">
                              {item.picture ? (
                                <img src={item.picture} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={20} className="text-slate-400" />
                              )}
                            </div>
                            {item.picture ? null : (
                              <p className="text-[9px] text-slate-400 font-bold mt-1">600 x 600 2 KB</p>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right space-x-2 whitespace-nowrap">
                            <button 
                              onClick={() => { setItemFormData(item); setItemPageMode('EDIT'); setIsItemGridMode(false); }} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button 
                              onClick={() => { setItemFormData({...item, id: Date.now(), barcode: ''}); setItemPageMode('NEW'); setIsItemGridMode(false); }} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                            >
                              <Copy size={12} /> Copy
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id, setItemMaster, "ItemMaster")} 
                              className="inline-flex items-center gap-1.5 bg-rose-500 text-white rounded-lg text-[11px] font-black uppercase hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Rows per page:</span>
                    <select 
                      className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm"
                      value={itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setItemGridPage(1); }}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">
                      Page {itemGridPage} of {totalPages || 1}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setItemGridPage(p => Math.max(1, p - 1))}
                        disabled={itemGridPage === 1}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button 
                        onClick={() => setItemGridPage(p => Math.min(totalPages, p + 1))}
                        disabled={itemGridPage >= totalPages}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          // --- #frm_controll_Add_Edit (Screenshot 3 - Absolute Match) ---
          return (
            <div id="frm_controll_Add_Edit" className="p-4 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <Layers className="text-blue-500" size={20} />
                  <h2 id="pagemode" className="text-lg font-bold text-blue-500">Item [ {itemPageMode} ]</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-4">
                  {/* Row 1 */}
                  <div className="lg:col-span-6 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Item Name</label>
                    <input 
                      id="inputnameitem" 
                      type="text" 
                      className="w-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                      value={itemFormData.name || ''} 
                      onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})} 
                    />
                  </div>
                  <div className="lg:col-span-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Barcode</label>
                      <button 
                        onClick={() => setItemFormData({...itemFormData, barcode: Math.random().toString().slice(2, 15)})}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Generate code
                      </button>
                    </div>
                    <input 
                      id="inputnamebarcode" 
                      type="text" 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                      value={itemFormData.barcode || ''} 
                      onChange={(e) => setItemFormData({...itemFormData, barcode: e.target.value})} 
                    />
                  </div>
                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">HSN Code</label>
                    <input 
                      type="text" 
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
                      value={itemFormData.hsnCode || ''} 
                      onChange={(e) => setItemFormData({...itemFormData, hsnCode: e.target.value})} 
                    />
                  </div>

                  {/* Row 2 */}
                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Item Group Name</label>
                    <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-2 text-sm outline-none cursor-pointer" value={itemFormData.group || ''} onChange={(e) => setItemFormData({...itemFormData, group: e.target.value})}>
                      {getItemGroupOptions().map(o => <option key={o.value} value={o.value}>{o.label.split(': ')[1] || o.label}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Main Category</label>
                    <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-2 text-sm outline-none cursor-pointer" value={itemFormData.mainCategory || ''} onChange={(e) => setItemFormData({...itemFormData, mainCategory: e.target.value})}>
                      <option value="">Select Main Category</option>
                      {mainCatMaster.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Sub Category Name</label>
                    <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-2 text-sm outline-none cursor-pointer" value={itemFormData.subCategory || ''} onChange={(e) => setItemFormData({...itemFormData, subCategory: e.target.value})}>
                      {getSubCategoryOptions().map(o => <option key={o.value} value={o.value}>{o.label.split(': ')[1] || o.label}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Brand Name</label>
                    <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-2 text-sm outline-none cursor-pointer" value={itemFormData.brand || ''} onChange={(e) => setItemFormData({...itemFormData, brand: e.target.value})}>
                      {getBrandOptions().map(o => <option key={o.value} value={o.value}>{o.label.split(' (')[0]}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Unit Name</label>
                    <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-2 text-sm outline-none cursor-pointer" value={itemFormData.unit || ''} onChange={(e) => setItemFormData({...itemFormData, unit: e.target.value})}>
                      {getUnitOptions().map(o => <option key={o.value} value={o.value}>{o.label.split(': ')[1] || o.label}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-9"></div>

                  <div className="lg:col-span-12 py-2">
                    <hr className="border-slate-100 dark:border-slate-800" />
                  </div>

                  {/* Row 3 */}
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Sale Rate</label>
                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm outline-none" value={itemFormData.sellingPrice || 0} onChange={(e) => setItemFormData({...itemFormData, sellingPrice: e.target.value})} />
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mrp</label>
                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm outline-none" value={itemFormData.mrp || ''} onChange={(e) => setItemFormData({...itemFormData, mrp: e.target.value})} />
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Purchase Rate</label>
                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm outline-none" value={itemFormData.purchaseRate || ''} onChange={(e) => setItemFormData({...itemFormData, purchaseRate: e.target.value})} />
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Gst %</label>
                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm outline-none" value={itemFormData.gst || ''} onChange={(e) => setItemFormData({...itemFormData, gst: e.target.value})} />
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Cess %</label>
                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm outline-none" value={itemFormData.cess || ''} onChange={(e) => setItemFormData({...itemFormData, cess: e.target.value})} />
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Discount %</label>
                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm outline-none" value={itemFormData.discount || 0} onChange={(e) => setItemFormData({...itemFormData, discount: e.target.value})} />
                  </div>

                  {/* Row 4 */}
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Opening Stock</label>
                    <input type="number" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm outline-none" value={itemFormData.openingStock || ''} onChange={(e) => setItemFormData({...itemFormData, openingStock: e.target.value, stockQty: e.target.value})} />
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Is favourite</label>
                    <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-2 text-sm outline-none cursor-pointer" value={itemFormData.isFavourite || 0} onChange={(e) => setItemFormData({...itemFormData, isFavourite: Number(e.target.value)})}>
                      <option value={0}>No</option>
                      <option value={1}>Yes</option>
                    </select>
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Is Discountable</label>
                    <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-2 text-sm outline-none cursor-pointer" value={itemFormData.isDiscountable || 0} onChange={(e) => setItemFormData({...itemFormData, isDiscountable: Number(e.target.value)})}>
                      <option value={0}>Yes</option>
                      <option value={1}>No</option>
                    </select>
                  </div>

                  {/* Row 5 */}
                  <div className="lg:col-span-12 space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Item Description</label>
                    <input 
                      type="text"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm outline-none" 
                      value={itemFormData.description || ''} 
                      maxLength={250}
                      onChange={(e) => setItemFormData({...itemFormData, description: e.target.value})} 
                    />
                    <p className="text-[10px] text-slate-400 font-bold mt-1">{(itemFormData.description || '').length}/250 Characters</p>
                  </div>

                  {/* Footer */}
                  <div className="lg:col-span-12 flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
                    <div className="flex items-center gap-4">
                      {itemFormData.picture && (
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                          <img src={itemFormData.picture} alt="Item" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="flex border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden">
                          <input 
                            type="file" 
                            className="hidden" 
                            id="item-picture" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  // Keep both the preview URL and the actual File object for upload
                                  setItemFormData({
                                    ...itemFormData, 
                                    picture: event.target.result, 
                                    pictureFile: file, 
                                    pictureName: file.name
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <label htmlFor="item-picture" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer hover:bg-slate-200 transition-all border-r border-slate-300 dark:border-slate-700">Choose file</label>
                          <span className="px-3 py-1.5 bg-white dark:bg-slate-900 text-xs text-slate-500 min-w-[120px]">
                            {itemFormData.pictureName || 'No file chosen'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <button 
                        onClick={async () => {
                          if (!itemFormData.name || !itemFormData.barcode) return alert("Missing Name or Barcode!");
                          
                          let pictureUrl = itemFormData.picture;
                          // If we have a new file to upload, send it to Supabase first
                          if (itemFormData.pictureFile) {
                            const uploadedUrl = await uploadMediaToSupabase(itemFormData.pictureFile, 'nm-media', 'products');
                            if (uploadedUrl) {
                              pictureUrl = uploadedUrl;
                            }
                          }

                          const dataToSave = { 
                            ...itemFormData, 
                            id: itemFormData.id || Date.now(),
                            picture: pictureUrl
                          };
                          // Remove the temporary File object from the saved data
                          delete dataToSave.pictureFile;
                          
                          handleSave('ItemMaster', dataToSave, setItemMaster);
                          setIsItemGridMode(true);
                        }}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
                      >
                        Save
                      </button>
                      <button onClick={() => setIsItemGridMode(true)} className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-all shadow-md">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

      case 'ItemUnit_View':
        return <MasterView 
          title="Item Unit Master" 
          data={unitMaster}
          onSave={(d) => handleSave('ItemUnit_View', d, setUnitMaster)}
          onDelete={(id) => handleDelete(id, setUnitMaster, "ItemUnit_View")}
          fields={[{ name: 'name', label: 'Unit Name (Pcs, Kg, etc.)', fullWidth: true }]}
        />;

      case 'ItemGroupMaster':
        return <MasterView 
          title="Item Group Master" 
          data={groupMaster}
          onSave={(d) => handleSave('ItemGroupMaster', d, setGroupMaster)}
          onDelete={(id) => handleDelete(id, setGroupMaster, "ItemGroupMaster")}
          fields={[{ name: 'name', label: 'Group Name', fullWidth: true }]}
        />;

      case 'Item-main-Category':
        return <MasterView 
          title="Item Main Category" 
          data={mainCatMaster}
          onSave={(d) => handleSave('Item-main-Category', d, setMainCatMaster)}
          onDelete={(id) => handleDelete(id, setMainCatMaster, "Item-main-Category")}
          fields={[{ name: 'name', label: 'Category Name', fullWidth: true }]}
        />;

      case 'Item-Sub-Category':
        return <MasterView 
          title="Item Sub Category" 
          data={subCatMaster}
          onSave={(d) => handleSave('Item-Sub-Category', d, setSubCatMaster)}
          onDelete={(id) => handleDelete(id, setSubCatMaster, "Item-Sub-Category")}
          fields={[
            { name: 'mainCategory', label: 'Main Category', type: 'select', options: mainCatMaster.map(m => m.name) },
            { name: 'name', label: 'Sub Category Name' },
          ]}
        />;

      case 'BrandMaster':
        return <MasterView 
          title="Brand Master" 
          data={brandMaster}
          onSave={(d) => handleSave('BrandMaster', d, setBrandMaster)}
          onDelete={(id) => handleDelete(id, setBrandMaster, "BrandMaster")}
          fields={[{ name: 'name', label: 'Brand Name', fullWidth: true }]}
        />;

      case 'DepartmentMas':
        return <MasterView 
          title="Department Master" 
          data={deptMaster}
          onSave={(d) => handleSave('DepartmentMas', d, setDeptMaster)}
          onDelete={(id) => handleDelete(id, setDeptMaster, "DepartmentMas")}
          fields={[{ name: 'name', label: 'Department Name', fullWidth: true }]}
        />;

      case 'AccountMaster':
        return <MasterView 
          title="Account Master" 
          data={accountMaster}
          onSave={(d) => handleSave('AccountMaster', d, setAccountMaster)}
          onDelete={(id) => handleDelete(id, setAccountMaster, "AccountMaster")}
          fields={[
            { name: 'name', label: 'Name' },
            { name: 'phone', label: 'Phone' },
            { name: 'type', label: 'Type', type: 'select', options: ['Debit', 'Credit'] },
            { name: 'address', label: 'Address', fullWidth: true },
          ]}
        />;

      case 'UserPermission':
        return <MasterView 
          title="User Master" 
          data={userMaster}
          onSave={(d) => handleSave('UserPermission', d, setUserMaster)}
          onDelete={(id) => handleDelete(id, setUserMaster, "UserPermission")}
          fields={[
            { name: 'username', label: 'Username' },
            { name: 'role', label: 'Role', type: 'select', options: ['Admin', 'Manager', 'Cashier'] },
            { name: 'profile', label: 'Profile Info', fullWidth: true },
          ]}
        />;

      case 'BannerMaster':
        if (!isBannerGridMode) {
          return (
            <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <ImageIcon className="text-blue-500" size={20} />
                  <h2 className="text-xl font-bold text-blue-500">
                    Banner [{bannerPageMode}]
                  </h2>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Banner Title</label>
                  <input
                    type="text"
                    value={bannerFormData.title || ''}
                    onChange={(e) => setBannerFormData({ ...bannerFormData, title: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-blue-500 rounded-md px-3 py-2 text-sm outline-none transition-all shadow-sm"
                  />
                </div>

                {/* Image */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Banner Image</label>
                  {bannerFormData.imageUrl && (
                    <div className="w-32 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden mb-2">
                      <img src={bannerFormData.imageUrl} alt="Banner" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden">
                      <input
                        type="file"
                        id="banner-image"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setBannerFormData({
                                ...bannerFormData,
                                imageUrl: ev.target.result,
                                imageFile: file,
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="banner-image"
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer hover:bg-slate-200 transition-all border-r border-slate-300 dark:border-slate-700"
                      >
                        Choose file
                      </label>
                      <span className="px-3 py-1.5 bg-white dark:bg-slate-900 text-xs text-slate-500 min-w-[120px]">
                        {bannerFormData.imageFile?.name || bannerFormData.imageUrl ? 'File selected' : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Redirect Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Redirect Type</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setRedirectMode('custom');
                        setSelectedProducts([]);
                        setSearchQuery('');
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                        redirectMode === 'custom'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Custom Path
                    </button>
                    <button
                      onClick={() => {
                        setRedirectMode('products');
                        setSearchQuery('');
                        setShowProductDropdown(false);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                        redirectMode === 'products'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Link to Products (Multi-Select)
                    </button>
                  </div>
                </div>

                {/* Redirect Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Redirect Path</label>
                  {redirectMode === 'custom' ? (
                    <input
                      type="text"
                      value={bannerFormData.redirect || ''}
                      onChange={(e) => setBannerFormData({ ...bannerFormData, redirect: e.target.value })}
                      placeholder="/category/grocery or /"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-blue-500 rounded-md px-3 py-2 text-sm outline-none transition-all shadow-sm"
                    />
                  ) : (
                    <div className="relative product-dropdown-container">
                      {/* Chips Container */}
                      <div 
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 flex flex-wrap gap-2 items-center cursor-text"
                        onClick={() => {
                          setShowProductDropdown(true);
                        }}
                      >
                        {selectedProducts.map((product) => (
                          <span 
                            key={product.id} 
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold"
                          >
                            {product.name}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
                              }}
                              className="ml-1 text-white hover:text-blue-200 transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowProductDropdown(true);
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                          placeholder={selectedProducts.length === 0 ? "Search product by name or barcode..." : ""}
                          className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-white min-w-[150px]"
                        />
                      </div>
                      
                      {/* Search Dropdown */}
                      {showProductDropdown && (
                        <div className="absolute z-10 w-full max-h-80 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md shadow-lg mt-1">
                          {itemMaster
                            .filter((item) =>
                              !selectedProducts.some(p => p.id === item.id) &&
                              (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (item.barcode && item.barcode.includes(searchQuery)))
                            )
                            .slice(0, 10)
                            .map((item) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setSelectedProducts([...selectedProducts, item]);
                                  setSearchQuery('');
                                  setShowProductDropdown(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
                              >
                                <div className="text-sm font-bold text-slate-800 dark:text-white">
                                  {item.name}
                                </div>
                                <div className="text-xs text-slate-500 flex gap-4">
                                  {item.barcode && <span>Barcode: {item.barcode}</span>}
                                  <span>₹{item.sellingPrice || item.mrp}</span>
                                </div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Active Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setBannerFormData({ ...bannerFormData, active: !bannerFormData.active })
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        bannerFormData.active ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          bannerFormData.active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {bannerFormData.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={async () => {
                      let imageUrl = bannerFormData.imageUrl;
                      if (bannerFormData.imageFile) {
                        const uploadedUrl = await uploadMediaToSupabase(bannerFormData.imageFile, 'nm-media', 'banners');
                        if (uploadedUrl) imageUrl = uploadedUrl;
                      }
                      
                      // Format redirect path for products mode
                      let redirect = bannerFormData.redirect;
                      if (redirectMode === 'products' && selectedProducts.length > 0) {
                        const ids = selectedProducts.map(p => p.id).join(',');
                        redirect = `/products?ids=${ids}`;
                      }
                      
                      const dataToSave = {
                        ...bannerFormData,
                        id: bannerFormData.id || Date.now(),
                        imageUrl,
                        redirect,
                        selectedProducts: redirectMode === 'products' ? selectedProducts : undefined,
                      };
                      delete dataToSave.imageFile;

                      handleSave('BannerMaster', dataToSave, setBannerMaster);
                      setIsBannerGridMode(true);
                      setBannerFormData({});
                      setRedirectMode('custom');
                      setSearchQuery('');
                      setSelectedProducts([]);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsBannerGridMode(true);
                      setBannerFormData({});
                      setRedirectMode('custom');
                      setSearchQuery('');
                      setSelectedProducts([]);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div className="p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <ImageIcon className="text-slate-600 dark:text-slate-400" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                      Banner Master
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {bannerMaster.length} banners total
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setBannerPageMode('NEW');
                    setBannerFormData({});
                    setRedirectMode('custom');
                    setSearchQuery('');
                    setSelectedProducts([]);
                    setIsBannerGridMode(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  <Plus size={18} /> Create New
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white uppercase text-[11px] font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-5">SNo</th>
                        <th className="px-6 py-5">Title</th>
                        <th className="px-6 py-5 hide-on-mobile">Image</th>
                        <th className="px-6 py-5">Redirect</th>
                        <th className="px-6 py-5">Status</th>
                        <th className="px-6 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {bannerMaster.map((banner, index) => (
                        <tr key={banner.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                          <td className="px-6 py-5 text-xs font-black text-slate-900 dark:text-white">
                            {index + 1}
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                              {banner.title}
                            </p>
                          </td>
                          <td className="px-6 py-5 hide-on-mobile">
                            <div className="w-16 h-10 mx-auto bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden">
                              {banner.imageUrl ? (
                                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={18} className="text-slate-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              {banner.redirect || '-'}
                            </p>
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                banner.active
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {banner.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setBannerFormData(banner);
                                setBannerPageMode('EDIT');
                                
                                // Check if redirect is multi-product
                                if (banner.redirect && banner.redirect.startsWith('/products?ids=')) {
                                  const idsString = banner.redirect.split('/products?ids=')[1];
                                  const ids = idsString.split(',');
                                  const products = itemMaster.filter(p => ids.includes(p.id.toString()));
                                  setSelectedProducts(products);
                                  setRedirectMode('products');
                                } 
                                // Check if it's old single product
                                else if (banner.redirect && banner.redirect.startsWith('/product/')) {
                                  const productId = banner.redirect.split('/product/')[1];
                                  const product = itemMaster.find((p) => p.id.toString() === productId.toString());
                                  setRedirectMode('products');
                                  if (product) {
                                    setSelectedProducts([product]);
                                  }
                                } 
                                // Otherwise custom
                                else {
                                  setRedirectMode('custom');
                                }
                                
                                setIsBannerGridMode(false);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(banner.id, setBannerMaster, 'BannerMaster')}
                              className="inline-flex items-center gap-1.5 bg-rose-500 text-white rounded-lg text-[11px] font-black uppercase hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        }

      case 'CreditMaster':
        return <MasterView 
          title="Credit Master" 
          data={creditMaster}
          onSave={(d) => handleSave('CreditMaster', d, setCreditMaster)}
          onDelete={(id) => handleDelete(id, setCreditMaster, "CreditMaster")}
          fields={[
            { name: 'customer', label: 'Customer Name', type: 'select', options: accountMaster.filter(a => a.type === 'Credit').map(a => a.name) },
            { name: 'threshold', label: 'Credit Threshold', type: 'number' },
            { name: 'dueDate', label: 'Allowed Due Date', type: 'date' },
          ]}
        />;

      case 'DeliveryBoyMaster':
        return <MasterView 
          title="Delivery Boy Master" 
          data={deliveryBoyMaster}
          onSave={(d) => handleSave('DeliveryBoyMaster', d, setDeliveryBoyMaster)}
          onDelete={(id) => handleDelete(id, setDeliveryBoyMaster, "DeliveryBoyMaster")}
          fields={[
            { name: 'name', label: 'Rider Name' },
            { name: 'phone', label: 'Phone' },
            { name: 'status', label: 'Status', type: 'select', options: ['Available', 'Busy'] },
          ]}
        />;

      case 'Delivery_cust_Master':
        return <MasterView 
          title="Delivery Customer Master" 
          data={deliveryCustMaster}
          onSave={(d) => handleSave('Delivery_cust_Master', d, setDeliveryCustMaster)}
          onDelete={(id) => handleDelete(id, setDeliveryCustMaster, "Delivery_cust_Master")}
          fields={[
            { name: 'name', label: 'Customer Name' },
            { name: 'address', label: 'Address', fullWidth: true },
            { name: 'coordinates', label: 'Coordinates (Lat, Lng)' },
          ]}
        />;

      case 'sale':
        return (
          <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Left Sidebar - Categories & Items */}
            <div className="w-full lg:w-3/5 flex flex-col border-r border-slate-200 dark:border-slate-800">
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search for items or scan barcode..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                      value={saleSearch}
                      onChange={(e) => setSaleSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    id="dhcode"
                    className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-blue-600"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {mainCatMaster.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button 
                    onClick={() => setSelectedCategory('All')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${selectedCategory === 'All' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    All Items
                  </button>
                  {mainCatMaster.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all ${selectedCategory === cat.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {itemMaster
                    .filter(item => {
                      const matchesCat = selectedCategory === 'All' || item.mainCategory === selectedCategory;
                      const matchesSearch = item.name.toLowerCase().includes(saleSearch.toLowerCase()) || item.barcode.includes(saleSearch);
                      return matchesCat && matchesSearch;
                    })
                    .map(item => (
                      <button 
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-[24px] text-left hover:border-blue-500 transition-all hover:shadow-xl relative overflow-hidden"
                      >
                        <div className="absolute top-2 right-2 bg-blue-500/10 text-blue-500 text-[10px] font-black px-2 py-0.5 rounded-full">{item.unit}</div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase line-clamp-2 mb-2">{item.name}</h4>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Price</p>
                            <p className="text-sm font-black text-blue-600 dark:text-blue-500">₹{item.sellingPrice}</p>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Plus size={16} />
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Cart & Checkout */}
            <div className="w-full lg:w-2/5 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl">
              {/* Customer Info */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Customer Mapping</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="Customer Name"
                    className="col-span-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Mobile Number"
                    className="col-span-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Delivery Address"
                    className="col-span-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  />
                </div>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex-1">
                      <h5 className="text-[11px] font-black uppercase text-slate-900 dark:text-white">{item.name}</h5>
                      <p className="text-[10px] text-slate-500 font-bold">₹{item.sellingPrice} × {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCartQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:text-rose-500"><Minus size={14} /></button>
                      <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateCartQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:text-blue-500"><Plus size={14} /></button>
                      <button onClick={() => removeFromCart(item.id)} className="ml-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                    <ShoppingCart size={48} />
                    <p className="text-[10px] font-black uppercase mt-4">Cart is Empty</p>
                  </div>
                )}
              </div>

              {/* Grand Total & Actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Payment Mode</label>
                    <select className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Card</option>
                      <option>Credit Wallet</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Bill Type</label>
                    <select className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold" value={billType} onChange={(e) => setBillType(e.target.value)}>
                      <option>Counter Sale</option>
                      <option>Local Delivery</option>
                    </select>
                  </div>
                  {billType === 'Local Delivery' && (
                    <div className="col-span-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Delivery Boy Assignment</label>
                      <select className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-bold" value={selectedDeliveryBoy} onChange={(e) => setSelectedDeliveryBoy(e.target.value)}>
                        <option value="">Select Rider</option>
                        {deliveryBoyMaster.filter(b => b.status === 'Available').map(boy => <option key={boy.id} value={boy.name}>{boy.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1 py-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>GROSS AMOUNT</span>
                    <span>₹{calculateTotal().gross}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>TAX/GST AMOUNT</span>
                    <span>₹{calculateTotal().tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-blue-600 dark:text-blue-500 pt-1">
                    <span>PAYABLE</span>
                    <span>₹{calculateTotal().total}</span>
                  </div>
                </div>

                <button 
                  onClick={handleSaveBill}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3"
                >
                  <Save size={20} /> Save & Print Bill
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Loading Retail OS...</h2>
          <p className="text-slate-500">Syncing data from Supabase</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white font-sans selection:bg-blue-500/30">
      {/* --- Navbar --- */}
      <nav className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[80] flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`p-2 rounded-lg transition-all ${activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Home size={20} />
          </button>
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <h1 className="text-lg font-black italic tracking-tighter leading-none">{BRAND_NAME.split(' ')[0]} <span className="text-blue-500">{BRAND_NAME.split(' ')[1]}</span></h1>
          </div>
          
            <div className="hidden lg:flex items-center gap-1">
            {/* Master Dropdown */}
            <div className="relative">
              <button 
                onClick={() => { setIsMasterOpen(!isMasterOpen); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(false); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${masters.some(m => m.id === activeTab) ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Master <ChevronDown size={14} className={`transition-transform ${isMasterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isMasterOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 overflow-hidden z-[90]">
                  {masters.map(master => (
                    <button 
                      key={master.id}
                      onClick={() => { setActiveTab(master.id); setIsMasterOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all ${activeTab === master.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {master.icon} {master.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <NavItem active={activeTab === 'sale'} onClick={() => { setActiveTab('sale'); setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(false); }} icon={<ShoppingCart size={18} />} label="Sale Entry" />
            <NavItem active={activeTab === 'purchase'} onClick={() => { setActiveTab('purchase'); setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(false); }} icon={<Wallet size={18} />} label="Purchase" />
            
            <div className="relative">
              <button 
                onClick={() => { setIsMasterOpen(false); setIsViewOpen(!isViewOpen); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(false); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${viewRoutes.some(r => r.id === activeTab) ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Eye size={18} /> View <ChevronDown size={14} className={`transition-transform ${isViewOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isViewOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 overflow-hidden z-[90]">
                  {viewRoutes.map(route => (
                    <button 
                      key={route.id}
                      onClick={() => { setActiveTab(route.id); setIsViewOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all ${activeTab === route.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {route.icon} {route.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => { setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(!isReportOpen); setIsStoreOpen(false); setIsToolOpen(false); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${reportRoutes.some(r => r.id === activeTab) ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <FileText size={18} /> Report <ChevronDown size={14} className={`transition-transform ${isReportOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isReportOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-[90] scrollbar-hide">
                  {reportRoutes.map(route => (
                    <button 
                      key={route.id}
                      onClick={() => { setActiveTab(route.id); setIsReportOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all ${activeTab === route.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {route.icon} {route.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative">
              <button 
                onClick={() => { setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(!isStoreOpen); setIsToolOpen(false); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${storeRoutes.some(r => r.id === activeTab) ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Store size={18} /> Store <ChevronDown size={14} className={`transition-transform ${isStoreOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isStoreOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-[90] scrollbar-hide">
                  {storeRoutes.map(route => (
                    <button 
                      key={route.id}
                      onClick={() => { setActiveTab(route.id); setIsStoreOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all ${activeTab === route.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {route.icon} {route.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <NavItem active={activeTab === 'transaction'} onClick={() => { setActiveTab('transaction'); setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(false); }} icon={<Repeat size={18} />} label="Transaction" />
            
            <div className="relative">
              <button 
                onClick={() => { setIsMasterOpen(false); setIsViewOpen(false); setIsReportOpen(false); setIsStoreOpen(false); setIsToolOpen(!isToolOpen); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${toolRoutes.some(r => r.id === activeTab) ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Settings size={18} /> Tools <ChevronDown size={14} className={`transition-transform ${isToolOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isToolOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 z-[90] overflow-hidden">
                  {toolRoutes.map(route => (
                    <button 
                      key={route.id}
                      onClick={() => { setActiveTab(route.id); setIsToolOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-all ${activeTab === route.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {route.icon} {route.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="YOUR_SUPABASE_APK_PUBLIC_URL"
            target="_blank"
            rel="noopener noreferrer"
            download="nm-mart-app-release.apk"
            className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
          >
            📥 Download NM App
          </a>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"><Maximize size={20} /></button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
          <div className="flex items-center gap-2 pl-2 cursor-pointer group">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-blue-600 dark:text-blue-500 leading-none">{BRAND_NAME}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <User size={18} />
            </div>
          </div>
        </div>
      </nav>

      {/* --- Main Workspace --- */}
      <main className="flex-1 w-full bg-white dark:bg-transparent overflow-y-auto">
        {renderContent()}
      </main>

      {/* --- Footer Marquee --- */}
      <footer className="h-8 bg-slate-900 text-white flex items-center overflow-hidden z-[80]">
        <div className="marquee w-full">
          <div className="marquee-content flex items-center gap-10 whitespace-nowrap">
            <span className="text-[11px] font-medium tracking-wide">
              {BRAND_NAME} offering customized software solutions for your business according to your requirement. We have multiple software products with us with all required modules. (For more details, contact us at: <span className="text-blue-400 font-bold">{SUPPORT_PHONE}</span>)..........
            </span>
            <span className="text-[11px] font-medium tracking-wide">
              {BRAND_NAME} offering customized software solutions for your business according to your requirement. We have multiple software products with us with all required modules. (For more details, contact us at: <span className="text-blue-400 font-bold">{SUPPORT_PHONE}</span>)..........
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const NavItem = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all ${active ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
  >
    {icon} {label}
  </button>
);

const NavDropdown = ({ label, icon }) => (
  <button className="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
    {icon} {label} <ChevronDown size={14} />
  </button>
);
