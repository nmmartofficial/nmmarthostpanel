import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Package, Layers, Grid, List, Tag, Building2, 
  Users, Image as ImageIcon, CreditCard, 
  Search, Plus, Edit2, Trash2, 
  Save, X, ChevronDown, Menu, ShieldCheck,
  LayoutDashboard, LogOut, Home, ShoppingCart, 
  Wallet, Eye, FileText, Settings, 
  Bell, User, Download, Zap, CheckCircle2,
  ArrowUp, ArrowDown, DollarSign, Clock,
  PlusCircle, RefreshCw, Database, Printer, 
  Trash, Activity, Lock, History, GitBranch,
  Calculator, PieChart, BarChart3, Receipt,
  Box, MapPin, Truck, XCircle, MessageCircle, Book,
  Monitor, Maximize2, ChevronRight, Circle, FileJson,
  Upload, ExternalLink, ShoppingBag, IndianRupee, Flag,
  Repeat, Wrench, ArrowLeftRight, Key, QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { dbSync } from './dbSync';
import { DB_SCHEMA } from './dbSchema';
import { handleERPAction, ERP_MODULES, ACTION_TYPES, parseERPCSV } from './erpController';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/** Utility for tailwind classes */
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Global Constants ---
const BRAND_NAME = "NM MART";
const PRIMARY_COLOR = "#FFC107"; // Orange
const SECONDARY_COLOR = "#212121"; // Dark Grey

// --- Helper: Generate UUID ---
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- Dropdown Component ---
function NavDropdown({ label, icon, items, activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = items.some(item => item.id === activeTab);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-black transition-all whitespace-nowrap uppercase tracking-tighter",
          isActive ? "text-blue-700 bg-blue-50" : "text-slate-900 hover:bg-slate-100"
        )}
      >
        <span className={cn(isActive ? "text-blue-700" : "text-slate-800")}>{icon}</span>
        <span>{label}</span>
        <ChevronDown size={12} className={cn("transition-transform opacity-70", isOpen && "rotate-180")} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={cn(
              "absolute left-0 mt-1 bg-white rounded-lg shadow-2xl border border-slate-200 py-1.5 z-[200] overflow-hidden w-64"
            )}
          >
            <div className={cn(
              "grid divide-slate-100 max-h-[85vh] overflow-y-auto grid-cols-1 divide-y"
            )}>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors group",
                    activeTab === item.id ? "bg-blue-50 text-blue-700" : "text-slate-800 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("transition-transform group-hover:scale-110", activeTab === item.id ? "text-blue-700" : "text-slate-900")}>
                      {item.icon}
                    </span>
                    {item.label}
                  </div>
                  {item.shortcut && <span className="text-[8px] text-slate-400 font-bold">{item.shortcut}</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- App Component ---
export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState(localStorage.getItem('nm_active_tab') || 'Dashboard');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });

  // Sync activeTab with localStorage so it persists on refresh during session
  useEffect(() => {
    localStorage.setItem('nm_active_tab', activeTab);
  }, [activeTab]);

  // --- Data States ---
  const [stats, setStats] = useState({ products: 0, categories: 0, orders: 0, users: 0 });
  const [appConfig, setAppConfig] = useState({});
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [credits, setCredits] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [deliveryCustomers, setDeliveryCustomers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [units, setUnits] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [offers, setOffers] = useState([]);
  const [pincodes, setPincodes] = useState([]);
  const [homeConfig, setHomeConfig] = useState([]);
  const [walletTx, setWalletTx] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // --- Refs for Stability (Infinite Loop Prevention) ---
  const isFetchingRef = useRef(false);
  const mountRef = useRef(false);
  const subscriptionsRef = useRef([]);

  // --- Auth Check ---
  const handleLogin = (e) => {
    e.preventDefault();
    const currentPin = appConfig?.security_pin || import.meta.env.VITE_ADMIN_SECURITY_PIN || '1234';
    if (pin === currentPin) {
      setIsAuthorized(true);
      localStorage.setItem('nm_admin_auth', 'true');
    } else {
      alert("Invalid Security PIN!");
    }
  };

  // --- Targeted State Updates (Infinite Loop Prevention) ---
  const handleRealtimeUpdate = useCallback((tableName, payload) => {
    console.log(`[Realtime Audit] ${tableName} event: ${payload.eventType}`);
    
    const { eventType, new: newRecord, old: oldRecord } = payload;

    const updateState = (setter) => {
      setter(prev => {
        if (!Array.isArray(prev)) return prev;
        
        if (eventType === 'INSERT' && newRecord) {
          if (prev.find(item => item.id === newRecord.id)) return prev;
          return [newRecord, ...prev];
        }
        if (eventType === 'UPDATE' && newRecord) {
          return prev.map(item => item.id === newRecord.id ? newRecord : item);
        }
        if (eventType === 'DELETE' && oldRecord) {
          return prev.filter(item => item.id !== oldRecord.id);
        }
        return prev;
      });
    };

    switch (tableName) {
      case DB_SCHEMA.ORDERS.table: updateState(setOrders); break;
      case DB_SCHEMA.PRODUCTS.table: updateState(setProducts); break;
      case DB_SCHEMA.NOTIFICATIONS.table: updateState(setNotifications); break;
      case DB_SCHEMA.BANNERS.table: updateState(setBanners); break;
      case DB_SCHEMA.CATEGORIES.table: updateState(setCategories); break;
      case DB_SCHEMA.SUBCATEGORIES.table: updateState(setSubcategories); break;
      case DB_SCHEMA.BRANDS.table: updateState(setBrands); break;
      case DB_SCHEMA.COUPONS.table: updateState(setCoupons); break;
      default: break;
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('nm_admin_auth') === 'true') {
      setIsAuthorized(true);
    }
    
    if (!mountRef.current) {
      fetchInitialData();
    }

    const setupSubscriptions = () => {
      subscriptionsRef.current.forEach(s => s.unsubscribe());
      
      const tablesToWatch = [
        DB_SCHEMA.ORDERS.table,
        DB_SCHEMA.PRODUCTS.table,
        DB_SCHEMA.NOTIFICATIONS.table,
        DB_SCHEMA.BANNERS.table
      ];

      subscriptionsRef.current = tablesToWatch.map(table => 
        dbSync.subscribe(table, (payload) => handleRealtimeUpdate(table, payload))
      );
    };

    setupSubscriptions();
    return () => subscriptionsRef.current.forEach(s => s.unsubscribe());
  }, [handleRealtimeUpdate]);

  const fetchInitialData = async (force = false) => {
    if (isFetchingRef.current) return;
    const now = Date.now();
    // Strict 5s debounce for global refetch to kill any lingering loops, unless forced
    if (!force && mountRef.current && (now - mountRef.current < 5000)) return; 
    
    isFetchingRef.current = true;
    mountRef.current = now; 

    setLoading(true);
    console.log("[Audit] Initializing Data Orchestration...");
    try {
      const results = await Promise.allSettled([
        dbSync.fetch(DB_SCHEMA.PRODUCTS.table),
        dbSync.fetch(DB_SCHEMA.CATEGORIES.table, { order: { column: 'name', ascending: true } }),
        dbSync.fetch(DB_SCHEMA.ORDERS.table, { order: { column: 'created_at', ascending: false } }),
        dbSync.fetch(DB_SCHEMA.APP_CONFIG.table),
        dbSync.fetch(DB_SCHEMA.BANNERS.table),
        dbSync.fetch(DB_SCHEMA.SUBCATEGORIES.table, { order: { column: 'name', ascending: true } }),
        dbSync.fetch(DB_SCHEMA.BRANDS.table, { order: { column: 'name', ascending: true } }),
        dbSync.fetch(DB_SCHEMA.COUPONS.table),
        dbSync.fetch(DB_SCHEMA.NOTIFICATIONS.table, { order: { column: 'created_at', ascending: false }, limit: 20 }),
        dbSync.fetch(DB_SCHEMA.WALLET_MASTER.table),
        dbSync.fetch(DB_SCHEMA.HOME_CONFIG.table),
        dbSync.fetch(DB_SCHEMA.OFFERS.table),
        dbSync.fetch(DB_SCHEMA.PINCODES.table),
        dbSync.fetch(DB_SCHEMA.WALLET_TRANSACTIONS.table, { order: { column: 'created_at', ascending: false } }),
        dbSync.fetch(DB_SCHEMA.ADDRESSES.table),
        dbSync.fetch(DB_SCHEMA.CART.table),
        dbSync.fetch(DB_SCHEMA.WISHLIST.table),
        dbSync.fetch(DB_SCHEMA.ADMIN_USERS.table),
        dbSync.fetch(DB_SCHEMA.CREDITS.table),
        dbSync.fetch(DB_SCHEMA.DELIVERY_BOYS.table),
        dbSync.fetch(DB_SCHEMA.DELIVERY_CUSTOMERS.table),
        dbSync.fetch(DB_SCHEMA.PURCHASES.table),
        dbSync.fetch(DB_SCHEMA.DEPARTMENTS.table),
        dbSync.fetch(DB_SCHEMA.UNITS.table),
        dbSync.fetch(DB_SCHEMA.ACCOUNTS.table)
      ]);

      const getData = (index, fallback = []) => {
        if (!results[index]) return fallback;
        return results[index].status === 'fulfilled' ? results[index].value : fallback;
      };

      const productsData = getData(0);
      const categoriesData = getData(1);
      const ordersData = getData(2);
      const appConfigData = getData(3, {});
      const bannersData = getData(4);
      const subcategoriesData = getData(5);
      const brandsData = getData(6);
      const couponsData = getData(7);
      const notificationsData = getData(8);
      const usersData = getData(9);
      const homeConfigData = getData(10);
      const offersData = getData(11);
      const pincodesData = getData(12);
      const walletTxData = getData(13);
      const addressesData = getData(14);
      const cartData = getData(15);
      const wishlistData = getData(16);
      const adminUsersData = getData(17);
      const creditsData = getData(18);
      const deliveryBoysData = getData(19);
      const deliveryCustomersData = getData(20);
      const purchasesData = getData(21);
      const departmentsData = getData(22);
      const unitsData = getData(23);
      const accountsData = getData(24);

      setProducts(productsData);
      setCategories(categoriesData);
      setOrders(ordersData);
      setAppConfig(Array.isArray(appConfigData) ? appConfigData[0] : appConfigData || {});
      setBanners(bannersData);
      setSubcategories(subcategoriesData);
      setBrands(brandsData);
      setCoupons(couponsData);
      setNotifications(notificationsData);
      setUsers(usersData);
      setHomeConfig(homeConfigData);
      setOffers(offersData);
      setPincodes(pincodesData);
      setWalletTx(walletTxData);
      setAddresses(addressesData);
      setCart(cartData);
      setWishlist(wishlistData);
      setAdminUsers(adminUsersData);
      setCredits(creditsData);
      setDeliveryBoys(deliveryBoysData);
      setDeliveryCustomers(deliveryCustomersData);
      setPurchases(purchasesData);
      setDepartments(departmentsData);
      setUnits(unitsData);
      setAccounts(accountsData);

      setStats({
        products: productsData.length,
        categories: categoriesData.length,
        orders: ordersData.length,
        users: usersData.length
      });
    } catch (error) {
      console.error("[Audit] Fetching Failed:", error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // --- Storage Helper ---
  const uploadImage = async (file, bucket) => {
    try {
      if (!file) throw new Error("No file selected");
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error(`Supabase Upload Error [Bucket: ${bucket}]:`, uploadError);
        throw new Error(`Upload failed: ${uploadError.message} (Bucket: ${bucket})`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!publicUrl) throw new Error("Failed to generate public URL for uploaded file");

      return { url: publicUrl, error: null };
    } catch (error) {
      console.error("Critical Upload error:", error);
      return { url: null, error: error.message };
    }
  };

  // --- UI Components ---
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-md text-center"
        >
          <div className="bg-primary w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
            <ShieldCheck size={40} className="text-secondary" />
          </div>
          <h1 className="text-3xl font-black text-secondary mb-2 tracking-tighter uppercase">{BRAND_NAME} ADMIN</h1>
          <p className="text-slate-800 font-black mb-8">Enter security PIN to access the panel</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full bg-slate-100 border-none rounded-2xl px-6 py-4 text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-primary transition-all font-black text-slate-900 placeholder-slate-400"
              autoFocus
            />
            <button 
              type="submit"
              className="w-full bg-secondary text-primary font-black py-4 rounded-2xl hover:bg-black transition-all uppercase tracking-widest shadow-xl"
            >
              Authorize Access
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // --- Menu Definitions (54+ Buttons Logic) ---
  const masterItems = [
    { id: 'Products', label: 'Item Master', icon: <Package size={14} />, shortcut: 'F1' },
    { id: 'Units', label: 'Item Unit Master', icon: <ShoppingCart size={14} /> },
    { id: 'Categories', label: 'Item Group Master', icon: <Grid size={14} />, shortcut: 'F2' },
    { id: 'MainCategories', label: 'Item Main Category', icon: <ShoppingBag size={14} /> },
    { id: 'Subcategories', label: 'Item Sub Category', icon: <Layers size={14} />, shortcut: 'F3' },
    { id: 'Brands', label: 'Brand Master', icon: <Tag size={14} />, shortcut: 'F4' },
    { id: 'Departments', label: 'Department Master', icon: <GitBranch size={14} /> },
    { id: 'Accounts', label: 'Account Master', icon: <User size={14} /> },
    { id: 'UserMaster', label: 'User Master', icon: <User size={14} /> },
    { id: 'Banners', label: 'Banner Master', icon: <ImageIcon size={14} /> },
    { id: 'Credits', label: 'Credit Master', icon: <CreditCard size={14} /> },
    { id: 'DeliveryBoys', label: 'Delivery Boy Master', icon: <Truck size={14} /> },
    { id: 'DeliveryCustomers', label: 'Delivery Customer Master', icon: <Users size={14} /> },
    { id: 'Coupons', label: 'Coupon Master', icon: <Tag size={14} /> },
    {id: 'Offers', label: 'Offers Master', icon: <Zap size={14} /> },
    { id: 'Pincodes', label: 'Pincode Master', icon: <MapPin size={14} /> },
    { id: 'Addresses', label: 'Address Master', icon: <MapPin size={14} /> },
    { id: 'WalletMaster', label: 'Wallet Master', icon: <Wallet size={14} /> },
  ];

  const viewItems = [
    { id: 'OnlineOrder', label: 'Online Order', icon: <Monitor size={14} /> },
    { id: 'BillView', label: 'Bill View', icon: <Database size={14} /> },
    { id: 'BillViewDelivery', label: 'Bill View (Delivery)', icon: <Database size={14} /> },
    { id: 'BranchBill', label: 'Branch Bill', icon: <GitBranch size={14} /> },
    { id: 'PaymentMobile', label: 'Payment (Mobile No)', icon: <IndianRupee size={14} /> },
    { id: 'WalletRecharge', label: 'Wallet recharge', icon: <IndianRupee size={14} /> },
  ];

  const reportItems = [
    { id: 'SaleSummary', label: 'Sale Summary', icon: <ExternalLink size={14} /> },
    { id: 'SaleReportBill', label: 'Sale Report Bill-wise', icon: <ExternalLink size={14} /> },
    { id: 'SaleReportItem', label: 'Sale Report Item-wise', icon: <ExternalLink size={14} /> },
    { id: 'SaleReportItemSummary', label: 'Sale Report Item-Summary', icon: <FileText size={14} /> },
    { id: 'SaleTrashBill', label: 'Sale-Trash Bill', icon: <Trash size={14} /> },
    { id: 'SaleCancelledBill', label: 'Sale-Cancelled Bill', icon: <XCircle size={14} /> },
    { id: 'PurchaseReport', label: 'Purchase Report', icon: <ShoppingCart size={14} /> },
    { id: 'StockReport', label: 'Stock Report', icon: <Activity size={14} /> },
    { id: 'ItemStatement', label: 'Item Statement Report', icon: <Zap size={14} /> },
    { id: 'Logbook', label: 'Logbook', icon: <Flag size={14} /> },
    { id: 'LedgerView', label: 'Ledger View', icon: <FileText size={14} /> },
    { id: 'PaymentReportDB', label: 'Payment Report (Delivery Boy)', icon: <RefreshCw size={14} /> },
    { id: 'CreditReport', label: 'Credit Report', icon: <RefreshCw size={14} /> },
    { id: 'PaymentReminder', label: 'Payment Reminder', icon: <RefreshCw size={14} /> },
  ];

  const storeItems = [
    { id: 'BOM', label: 'Bill of Materials (BOM)', icon: <Settings size={14} /> },
    { id: 'ProductionEntry', label: 'Production Entry', icon: <GitBranch size={14} /> },
    { id: 'CostingReport', label: 'Costing Report', icon: <BarChart3 size={14} /> },
    { id: 'StockTransfer', label: 'Stock Transfer', icon: <RefreshCw size={14} /> },
    { id: 'StockTransferReport', label: 'Stock Transfer Report', icon: <RefreshCw size={14} /> },
    { id: 'WastageEntry', label: 'Wastage Entry', icon: <Trash2 size={14} /> },
    { id: 'WastageReport', label: 'Wastage Report', icon: <Trash2 size={14} /> },
    { id: 'PurchaseOrderPO', label: '(PO) Purchase order', icon: <FileText size={14} /> },
    { id: 'PurchaseReportRO', label: '(RO) Purchase Report', icon: <FileText size={14} /> },
    { id: 'RequisitionReportRO', label: '(RO) Requisition Order Report', icon: <FileText size={14} /> },
  ];

  const toolsItems = [
    { id: 'AppConfig', label: 'CONFIGURATION', icon: <Settings size={14} /> },
    { id: 'StoreItemDisplay', label: 'STORE ITEM DISPLAY', icon: <ArrowLeftRight size={14} /> },
    { id: 'StoreSubCatDisplay', label: 'STORE SUB-CAT DISPLAY', icon: <ArrowLeftRight size={14} /> },
    { id: 'StoreMainCatDisplay', label: 'STORE MAIN-CAT DISPLAY', icon: <ArrowLeftRight size={14} /> },
    { id: 'TestBluetooth', label: 'TEST BLUETOOTH', icon: <ArrowLeftRight size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-sans antialiased">
      {/* --- Top Navigation Bar --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[100] shadow-sm select-none">
        <div className="max-w-full mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Home Icon */}
            <button 
              onClick={() => setActiveTab('Dashboard')}
              className={cn(
                "p-2 rounded-md transition-all",
                activeTab === 'Dashboard' ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:bg-slate-100"
              )}
              title="Home / Dashboard"
            >
              <Home size={18} />
            </button>

            {/* Desktop Navigation Menus (Hidden on Mobile) */}
            <nav className="hidden md:flex items-center gap-0.5 ml-1">
              <NavDropdown 
                label="Master" 
                icon={<Monitor size={14} className="mr-1.5" />} 
                items={masterItems} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
              />
              
              <button 
                onClick={() => setActiveTab('POS')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-black transition-all whitespace-nowrap uppercase tracking-tighter",
                  activeTab === 'POS' ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <ShoppingCart size={14} className="text-slate-500" />
                <span>Sale Entry</span>
              </button>

              <button 
                onClick={() => setActiveTab('Purchase')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-black transition-all whitespace-nowrap uppercase tracking-tighter",
                  activeTab === 'Purchase' ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Package size={14} className="text-slate-500" />
                <span>Purchase</span>
              </button>

              <NavDropdown 
                label="View" 
                icon={<List size={14} className="mr-1.5" />} 
                items={viewItems} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
              />

              <NavDropdown 
                label="Report" 
                icon={<FileText size={14} className="mr-1.5" />} 
                items={reportItems} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
              />

              <NavDropdown 
                label="Store" 
                icon={<Building2 size={14} className="mr-1.5" />} 
                items={storeItems} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
              />

              <button 
                onClick={() => setActiveTab('Transaction')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-black transition-all whitespace-nowrap uppercase tracking-tighter",
                  activeTab === 'Transaction' ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <RefreshCw size={14} className="text-slate-500" />
                <span>Transaction</span>
              </button>

              <NavDropdown 
                label="Tools" 
                icon={<Wrench size={14} className="mr-1.5" />} 
                items={toolsItems} 
                activeTab={activeTab} 
                setActiveTab={(tab) => {
                  if (tab === 'Logout') {
                    localStorage.removeItem('nm_admin_auth');
                    setIsAuthorized(false);
                  } else if (tab === 'DatabaseBackup') {
                    handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.MAINTENANCE_EXPORT, { fileName: 'Full_System_Backup' });
                  } else if (tab === 'ClearCache') {
                    // Immediate cache clear without confirmation
                    handleERPAction(null, ACTION_TYPES.CLEAR_CACHE);
                  } else {
                    setActiveTab(tab);
                  }
                }} 
              />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-all"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-1 border-r border-slate-200 pr-3 mr-1">
              <button 
                onClick={toggleFullscreen}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-all hidden md:flex"
                title="Toggle Fullscreen"
              >
                <Maximize2 size={16} />
              </button>
              <button 
                onClick={() => setActiveTab('Notifications')}
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-all relative"
              >
                <Bell size={16} />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 text-white text-[7px] font-black rounded-full border border-white flex items-center justify-center">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>
            </div>

            {/* Profile Section on Right */}
            <div 
              onClick={() => setShowProfileOverlay(true)}
              className="flex items-center gap-2 group cursor-pointer pl-2"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform ring-2 ring-blue-50">
                <User size={16} fill="currentColor" />
              </div>
              <div className="flex flex-col hidden md:flex">
                <span className="text-[11px] font-black text-blue-900 uppercase tracking-tighter leading-none">{BRAND_NAME}</span>
                <span className="text-[8px] font-black text-slate-800 uppercase tracking-widest leading-tight">Super Admin</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer/Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            {/* Backdrop to close menu on outside click */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[999] md:hidden"
              onClick={() => setShowMobileMenu(false)}
            />

            {/* Side Menu Drawer */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-[1000] flex flex-col md:hidden"
            >
              {/* Menu Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-800">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                    <ShieldCheck size={24} className="text-blue-700" />
                  </div>
                  <div>
                    <h2 className="text-white font-black text-lg">{BRAND_NAME} ADMIN</h2>
                    <p className="text-blue-200 text-xs font-bold">Super Admin</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 text-white hover:bg-white/20 rounded-md"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Menu Items - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Quick Links */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">QUICK ACTIONS</h3>
                  <div className="space-y-1">
                    <button 
                      onClick={() => { setActiveTab('Dashboard'); setShowMobileMenu(false); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-sm transition-all"
                    >
                      <Home size={18} /> Dashboard
                    </button>
                    <button 
                      onClick={() => { setActiveTab('POS'); setShowMobileMenu(false); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-sm transition-all"
                    >
                      <ShoppingCart size={18} /> Sale Entry
                    </button>
                    <button 
                      onClick={() => { setActiveTab('Purchase'); setShowMobileMenu(false); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-sm transition-all"
                    >
                      <Package size={18} /> Purchase
                    </button>
                  </div>
                </div>

                {/* Master Menu */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">MASTER</h3>
                  <div className="space-y-1">
                    {masterItems.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setShowMobileMenu(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                          activeTab === item.id ? "bg-blue-100 text-blue-700 font-black" : "text-slate-700 hover:bg-slate-100 font-medium"
                        )}
                      >
                        {item.icon} {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* View Menu */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">VIEW</h3>
                  <div className="space-y-1">
                    {viewItems.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setShowMobileMenu(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                          activeTab === item.id ? "bg-blue-100 text-blue-700 font-black" : "text-slate-700 hover:bg-slate-100 font-medium"
                        )}
                      >
                        {item.icon} {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Report Menu */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">REPORTS</h3>
                  <div className="space-y-1">
                    {reportItems.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setShowMobileMenu(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                          activeTab === item.id ? "bg-blue-100 text-blue-700 font-black" : "text-slate-700 hover:bg-slate-100 font-medium"
                        )}
                      >
                        {item.icon} {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Store Menu */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">STORE</h3>
                  <div className="space-y-1">
                    {storeItems.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setShowMobileMenu(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                          activeTab === item.id ? "bg-blue-100 text-blue-700 font-black" : "text-slate-700 hover:bg-slate-100 font-medium"
                        )}
                      >
                        {item.icon} {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tools Menu */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">TOOLS</h3>
                  <div className="space-y-1">
                    {toolsItems.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setShowMobileMenu(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                          activeTab === item.id ? "bg-blue-100 text-blue-700 font-black" : "text-slate-700 hover:bg-slate-100 font-medium"
                        )}
                      >
                        {item.icon} {item.label}
                      </button>
                    ))}
                    <button 
                      onClick={() => {
                        localStorage.removeItem('nm_admin_auth');
                        setIsAuthorized(false);
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-700 hover:text-red-800 font-bold text-sm transition-all"
                    >
                      <LogOut size={18} /> Logout
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Profile/Logout Overlay matching User Screenshot */}
      <AnimatePresence>
        {showProfileOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white/90 rounded-[32px] p-10 flex flex-col items-center gap-8 shadow-2xl border border-white/20 w-full max-w-sm"
            >
              {/* Print QR Button */}
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-1.5 border border-slate-400 rounded-lg text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all bg-white shadow-sm"
              >
                <QrCode size={14} /> Print QR
              </button>

              {/* Logout/Password Toggle View */}
              {!showChangePassword ? (
                <>
                  {/* Large Logout Icon & Text */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-4 text-slate-800">
                      <LogOut size={48} className="stroke-[2.5px]" />
                      <span className="text-5xl font-black tracking-tight">Logout</span>
                    </div>
                  </div>

                  {/* Change Password Toggle Button */}
                  <button 
                    onClick={() => setShowChangePassword(true)}
                    className="flex items-center gap-2 px-6 py-2 border border-slate-400 rounded-lg text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all bg-white shadow-sm"
                  >
                    <Key size={14} /> Change Password
                  </button>

                  {/* Action Buttons Row */}
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => {
                        localStorage.removeItem('nm_admin_auth');
                        setIsAuthorized(false);
                        setShowProfileOverlay(false);
                      }}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      <Lock size={14} fill="currentColor" /> Logout
                    </button>
                    <button 
                      onClick={() => setShowProfileOverlay(false)}
                      className="flex-1 bg-white border-2 border-slate-800 text-slate-800 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <LogOut size={14} className="rotate-180" /> Cancel
                    </button>
                  </div>
                </>
              ) : (
                /* Change Password Form View */
                <div className="w-full space-y-4">
                  <h3 className="text-xl font-black text-slate-800 text-center uppercase tracking-widest">Change Password</h3>
                  <div className="space-y-3">
                    <input 
                      type="password" 
                      placeholder="Old Password" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={passwordForm.old}
                      onChange={e => setPasswordForm({...passwordForm, old: e.target.value})}
                    />
                    <input 
                      type="password" 
                      placeholder="New Password" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={passwordForm.new}
                      onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                    />
                    <input 
                      type="password" 
                      placeholder="Confirm New Password" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={passwordForm.confirm}
                      onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={async () => {
                        if (!passwordForm.old || !passwordForm.new) return alert("Fill all fields");
                        if (passwordForm.new !== passwordForm.confirm) return alert("Passwords don't match");
                        
                        // Check if old password matches current security pin
                        const currentPin = appConfig?.security_pin || '1234';
                        if (passwordForm.old !== currentPin) return alert("Incorrect Old Password");

                        try {
                          const res = await handleERPAction(DB_SCHEMA.APP_CONFIG.table, ACTION_TYPES.BULK_UPSERT, [{ id: 'default', security_pin: passwordForm.new }]);
                          if (res.success) {
                            alert("Password Changed Successfully!");
                            setShowChangePassword(false);
                            setPasswordForm({ old: '', new: '', confirm: '' });
                            fetchInitialData();
                          } else throw new Error(res.error);
                        } catch (e) {
                          alert("Failed: " + e.message);
                        }
                      }}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg"
                    >
                      Update
                    </button>
                    <button 
                      onClick={() => setShowChangePassword(false)}
                      className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Main Dashboard Area --- */}
      <main className="flex-1 overflow-y-auto p-3 md:p-4 max-w-full mx-auto w-full">
        {/* Breadcrumb / Page Title */}
        <div className="mb-4 flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
              {activeTab}
              {loading && <RefreshCw size={14} className="animate-spin text-blue-400" />}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-900 uppercase tracking-widest">
            <Home size={10} />
            <span>ERP</span>
            <ChevronRight size={10} />
            <span className="text-blue-700 font-black">{activeTab}</span>
          </div>
        </div>

        {/* Tab Content Rendering */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
          >
            {renderTabContent(activeTab, { 
                stats, appConfig, banners, categories, subcategories, brands, products, orders, users, coupons,
                offers, pincodes, homeConfig, walletTx, addresses, cart, wishlist, adminUsers, credits, deliveryBoys, deliveryCustomers,
                purchases, departments, units, accounts,
                setAppConfig, setBanners, setCategories, setSubcategories, setBrands, setProducts, setOrders, setUsers, setCoupons,
                setAdminUsers, setCredits, setDeliveryBoys, setDeliveryCustomers, setPurchases, setDepartments, setUnits, setAccounts,
                uploadImage, fetchInitialData
              })}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* --- Footer Status Bar --- */}
      <footer className="bg-slate-800 text-white px-4 py-1 flex justify-between items-center text-[9px] font-black uppercase tracking-widest shadow-inner">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5"><Circle size={6} fill="#10B981" className="text-emerald-400" /> Server: Online</span>
          <span className="flex items-center gap-1.5"><Circle size={6} fill="#3B82F6" className="text-blue-400" /> DB: {stats.products} Records</span>
          <span className="flex items-center gap-1.5 opacity-50"><Clock size={10} /> Sync: Just Now</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-blue-300">{BRAND_NAME} ULTRA RETAIL ERP v1.0.2</span>
          <span className="bg-blue-600 px-2 py-0.5 rounded text-[8px]">LICENSE: ACTIVE</span>
        </div>
      </footer>
    </div>
  );
}

function TestBluetoothView() {
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    setIsSearching(true);
    // Bluetooth search logic placeholder
    setTimeout(() => {
      setIsSearching(false);
      alert("No Bluetooth printers found. Please ensure your device's Bluetooth is on.");
    }, 2000);
  };

  return (
    <div className="bg-white p-10 rounded-xl border border-slate-100 shadow-sm min-h-[400px]">
      <h1 className="text-4xl font-normal text-slate-800 mb-8">Bluetooth Printer</h1>
      
      <button 
        onClick={handleSearch}
        disabled={isSearching}
        className="px-6 py-3 bg-slate-100 border-2 border-slate-800 text-slate-800 text-base font-medium hover:bg-slate-200 transition-all flex items-center gap-3"
      >
        {isSearching ? <RefreshCw className="animate-spin" size={18} /> : null}
        {isSearching ? 'Searching...' : 'Search for Bluetooth Printer'}
      </button>
    </div>
  );
}

function StoreMainCatDisplayView({ categories, departments }) {
  const [selectedDept, setSelectedDept] = useState('Not Selected');
  const [selectAll, setSelectAll] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLoadData = () => {
    setLoading(true);
    // In this project, categories usually represent the main category level
    const filtered = categories.map(c => ({ ...c, isSelected: false }));
    setItems(filtered);
    setLoading(false);
  };

  const handleToggleSelect = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, isSelected: !item.isSelected } : item));
  };

  const handleSelectAll = (val) => {
    setSelectAll(val);
    setItems(items.map(item => ({ ...item, isSelected: val })));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
        {/* Header matching Screenshot */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-2">
            <h2 className="text-blue-600 font-bold underline text-sm cursor-pointer">Store Main-Cat Display</h2>
            <h1 className="text-2xl font-bold text-slate-800">Select</h1>
            <div className="flex items-center gap-2 mt-4">
              <input 
                type="checkbox" 
                id="selectAllMain" 
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
              />
              <label htmlFor="selectAllMain" className="text-sm font-medium text-slate-600">Select All</label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-12">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">Department</span>
              <select 
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-40 border border-slate-300 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
              >
                <option value="Not Selected">Not Selected</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>

            <button 
              onClick={handleLoadData}
              className="px-4 py-1.5 border border-slate-400 rounded-md text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
            >
              Load Data
            </button>
          </div>
        </div>

        {/* Item List Area */}
        <div className="min-h-[300px] border-t border-slate-100 pt-6">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-all">
                  <input 
                    type="checkbox" 
                    checked={item.isSelected}
                    onChange={() => handleToggleSelect(item.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600" 
                  />
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 italic text-sm">
              No main categories loaded. Click 'Load Data'.
            </div>
          )}
        </div>

        {/* Footer Buttons matching Screenshot */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button className="bg-blue-600 text-white px-6 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-all shadow-md">
            Save
          </button>
          <button className="bg-slate-500 text-white px-6 py-1.5 rounded-md text-sm font-medium hover:bg-slate-600 transition-all shadow-md">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function StoreSubCatDisplayView({ subcategories, departments }) {
  const [selectedDept, setSelectedDept] = useState('Not Selected');
  const [selectAll, setSelectAll] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLoadData = () => {
    setLoading(true);
    // Filter subcategories based on Department (if department logic exists in schema)
    const filtered = subcategories.map(s => ({ ...s, isSelected: false }));
    setItems(filtered);
    setLoading(false);
  };

  const handleToggleSelect = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, isSelected: !item.isSelected } : item));
  };

  const handleSelectAll = (val) => {
    setSelectAll(val);
    setItems(items.map(item => ({ ...item, isSelected: val })));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
        {/* Header matching Screenshot */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-2">
            <h2 className="text-blue-600 font-bold underline text-sm cursor-pointer">Store Sub-Cat Display</h2>
            <h1 className="text-2xl font-bold text-slate-800">Select</h1>
            <div className="flex items-center gap-2 mt-4">
              <input 
                type="checkbox" 
                id="selectAllSub" 
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
              />
              <label htmlFor="selectAllSub" className="text-sm font-medium text-slate-600">Select All</label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-12">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">Department</span>
              <select 
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-40 border border-slate-300 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
              >
                <option value="Not Selected">Not Selected</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>

            <button 
              onClick={handleLoadData}
              className="px-4 py-1.5 border border-slate-400 rounded-md text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
            >
              Load Data
            </button>
          </div>
        </div>

        {/* Item List Area */}
        <div className="min-h-[300px] border-t border-slate-100 pt-6">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-all">
                  <input 
                    type="checkbox" 
                    checked={item.isSelected}
                    onChange={() => handleToggleSelect(item.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600" 
                  />
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 italic text-sm">
              No sub-categories loaded. Click 'Load Data'.
            </div>
          )}
        </div>

        {/* Footer Buttons matching Screenshot */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button className="bg-blue-600 text-white px-6 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-all shadow-md">
            Save
          </button>
          <button className="bg-slate-500 text-white px-6 py-1.5 rounded-md text-sm font-medium hover:bg-slate-600 transition-all shadow-md">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function StoreItemDisplayView({ products, departments }) {
  const [findHsn, setFindHsn] = useState('');
  const [selectedDept, setSelectedDept] = useState('Not Selected');
  const [selectAll, setSelectAll] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLoadData = () => {
    setLoading(true);
    // Filter logic based on HSN and Department
    const filtered = products.filter(p => {
      const matchesHsn = !findHsn || p.hsn_code?.includes(findHsn);
      const matchesDept = selectedDept === 'Not Selected' || p.department === selectedDept;
      return matchesHsn && matchesDept;
    }).map(p => ({ ...p, isSelected: false }));
    
    setItems(filtered);
    setLoading(false);
  };

  const handleToggleSelect = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, isSelected: !item.isSelected } : item));
  };

  const handleSelectAll = (val) => {
    setSelectAll(val);
    setItems(items.map(item => ({ ...item, isSelected: val })));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
        {/* Header matching Screenshot */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-2">
            <h2 className="text-blue-600 font-bold underline text-sm cursor-pointer">Store Item Display</h2>
            <h1 className="text-2xl font-bold text-slate-800">Select Items</h1>
            <div className="flex items-center gap-2 mt-4">
              <input 
                type="checkbox" 
                id="selectAll" 
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
              />
              <label htmlFor="selectAll" className="text-sm font-medium text-slate-600">Select All</label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-12">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">Find</p>
                <p className="text-sm font-medium text-slate-700">HSN</p>
              </div>
              <input 
                type="text" 
                value={findHsn}
                onChange={e => setFindHsn(e.target.value)}
                className="w-32 border border-slate-300 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" 
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">Department</span>
              <select 
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-40 border border-slate-300 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
              >
                <option value="Not Selected">Not Selected</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>

            <button 
              onClick={handleLoadData}
              className="px-4 py-1.5 border border-slate-400 rounded-md text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
            >
              Load Data
            </button>
          </div>
        </div>

        {/* Item List Area */}
        <div className="min-h-[300px] border-t border-slate-100 pt-6">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-all">
                  <input 
                    type="checkbox" 
                    checked={item.isSelected}
                    onChange={() => handleToggleSelect(item.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600" 
                  />
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 italic text-sm">
              No items loaded. Adjust filters and click 'Load Data'.
            </div>
          )}
        </div>

        {/* Footer Buttons matching Screenshot */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button className="bg-blue-600 text-white px-6 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-all shadow-md">
            Save
          </button>
          <button className="bg-slate-500 text-white px-6 py-1.5 rounded-md text-sm font-medium hover:bg-slate-600 transition-all shadow-md">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function TransactionView({ users, fetchInitialData }) {
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form States matching Screenshot 2
  const [formData, setFormData] = useState({
    type: 'Receipt',
    date: new Date().toISOString().split('T')[0],
    account: 'Not Selected',
    items: []
  });
  const [currentItem, setCurrentItem] = useState({ party_id: '', name: '', amount: '', remarks: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleShow = async () => {
    setIsGenerating(true);
    try {
      const transactions = await dbSync.fetch(DB_SCHEMA.WALLET_TRANSACTIONS.table, {
        order: { column: 'created_at', ascending: false }
      });
      
      const mapped = (transactions || []).map(tx => {
        const user = users.find(u => u.id === tx.user_id);
        return {
          id: tx.id,
          date: new Date(tx.created_at).toLocaleDateString(),
          vNo: tx.id.substring(0, 8).toUpperCase(),
          type: tx.type === 'credit' ? 'CR' : 'DR',
          time: new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ledgerName: user ? (user.name || user.mobile) : 'Unknown',
          dr: tx.type === 'debit' ? parseFloat(tx.amount) : 0,
          cr: tx.type === 'credit' ? parseFloat(tx.amount) : 0,
        };
      });

      setReportData(mapped);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!showForm) handleShow();
  }, [fromDate, toDate, showForm]);

  const addItem = () => {
    if (!currentItem.party_id || !currentItem.amount) return alert("Select Party and Enter Amount");
    setFormData({
      ...formData,
      items: [...formData.items, { ...currentItem, amount: parseFloat(currentItem.amount) }]
    });
    setCurrentItem({ party_id: '', name: '', amount: '', remarks: '' });
  };

  const removeItem = (index) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const totalAmount = formData.items.reduce((sum, i) => sum + i.amount, 0);

  const handleSave = async (isPrint = false) => {
    if (formData.items.length === 0) return alert("Add at least one item");
    setIsSubmitting(true);
    try {
      // In a real scenario, this would create wallet_transactions for each party
      console.log("Saving Transaction:", formData);
      alert(isPrint ? "Transaction Saved & Print Triggered!" : "Transaction Saved Successfully!");
      setShowForm(false);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNew = () => {
    setShowForm(true);
  };

  if (showForm) {
    return (
      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
        {/* Form Header matching Screenshot 2 */}
        <div className="bg-slate-600 p-3 rounded-t-xl flex justify-between items-center text-white shadow-lg">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">Transaction</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest">Transaction Type</span>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="bg-white text-slate-800 rounded px-4 py-1.5 text-xs font-bold outline-none min-w-[200px]"
              >
                <option value="Receipt">Receipt</option>
                <option value="Payment">Payment</option>
                <option value="Contra">Contra</option>
                <option value="Journal">Journal</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-b-xl border border-slate-200 shadow-sm space-y-6">
          {/* Voucher Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex items-center justify-end gap-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Voucher Date</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="border border-slate-300 rounded-lg px-4 py-1.5 text-xs font-bold outline-none w-48"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Account</label>
              <select 
                value={formData.account}
                onChange={e => setFormData({...formData, account: e.target.value})}
                className="border border-slate-300 rounded-lg px-4 py-1.5 text-xs font-bold outline-none w-48 bg-white"
              >
                <option value="Not Selected">Not Selected</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
              </select>
            </div>
          </div>

          {/* Item Input Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Party Name</label>
              <select 
                value={currentItem.party_id}
                onChange={e => {
                  const u = users.find(user => user.id === e.target.value);
                  setCurrentItem({...currentItem, party_id: e.target.value, name: u?.name || u?.mobile || ''});
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Search for Party...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.mobile}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</label>
              <input 
                type="number" 
                value={currentItem.amount}
                onChange={e => setCurrentItem({...currentItem, amount: e.target.value})}
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remarks</label>
              <input 
                type="text" 
                value={currentItem.remarks}
                onChange={e => setCurrentItem({...currentItem, remarks: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
              />
            </div>
            <button 
              onClick={addItem}
              className="bg-red-300 text-black px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-red-400 transition-all flex items-center justify-center gap-2 mb-0.5"
            >
              <PlusCircle size={14} fill="black" /> Add
            </button>
          </div>

          {/* Items Table */}
          <div className="overflow-hidden border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-400/60 via-red-300/60 to-cyan-400/60">
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">Party Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-right">Amount</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">Remarks</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 text-[11px] font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-[11px] font-black text-right text-slate-900">₹{item.amount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-[11px] font-medium text-slate-500 italic">{item.remarks}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-700 text-white font-black">
                  <td className="px-4 py-2 text-right text-[10px] uppercase tracking-widest">Total :</td>
                  <td className="px-4 py-2 text-right text-[11px]">₹{totalAmount.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-100">
            <div className="flex gap-3">
              <button 
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-lg"
              >
                Save & Print
              </button>
              <button 
                onClick={() => handleSave(false)}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-8 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-lg"
              >
                Save
              </button>
              <button 
                onClick={() => setShowForm(false)}
                className="border-2 border-blue-600 text-blue-600 px-8 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all"
              >
                Cancel
              </button>
            </div>
            
            <div className="bg-black text-white p-3 rounded-lg min-w-[200px] text-right">
              <div className="flex justify-between items-center gap-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total :</span>
                <span className="text-xl font-black tracking-tighter">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* List View matching User Screenshot 1 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-50 rounded text-blue-600">
            <RefreshCw size={18} />
          </div>
          <h2 className="text-sm font-black text-blue-600 uppercase tracking-tighter">Transaction</h2>
        </div>

        <div className="flex flex-1 min-w-[300px] items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full bg-slate-100 border-none rounded-lg pl-9 pr-4 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">From :</span>
            <input 
              type="date" 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)} 
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none" 
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">To :</span>
            <input 
              type="date" 
              value={toDate} 
              onChange={e => setToDate(e.target.value)} 
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none" 
            />
          </div>
        </div>

        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-1.5 border-2 border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all shadow-sm"
        >
          <Plus size={14} /> Transaction
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-tight text-center">Date</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-tight text-center">V No</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-tight text-center">Type</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-tight text-center">Time</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-tight text-center">Ledger Name</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-tight text-center">Dr</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-tight text-center">Cr</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase tracking-tight text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest italic">
                    No transactions found
                  </td>
                </tr>
              ) : (
                reportData.filter(row => 
                  row.ledgerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  row.vNo.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-[11px] font-bold text-slate-600 text-center">{row.date}</td>
                    <td className="px-6 py-3 text-[11px] font-black text-blue-700 text-center">{row.vNo}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded",
                        row.type === 'CR' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                      )}>{row.type}</span>
                    </td>
                    <td className="px-6 py-3 text-[11px] font-medium text-slate-500 text-center">{row.time}</td>
                    <td className="px-6 py-3 text-[11px] font-black text-slate-800 uppercase text-center">{row.ledgerName}</td>
                    <td className="px-6 py-3 text-[11px] font-bold text-red-600 text-center">{row.dr > 0 ? row.dr.toFixed(2) : ''}</td>
                    <td className="px-6 py-3 text-[11px] font-bold text-emerald-600 text-center">{row.cr > 0 ? row.cr.toFixed(2) : ''}</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                        <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WastageReportView({ products }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShow = async () => {
    setIsGenerating(true);
    try {
      // Logic for fetching wastage report
      setReportData([]);
    } catch (error) {
      console.error("Error fetching wastage report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (reportData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Wastage Report");
    XLSX.writeFile(wb, `Wastage_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const handlePDF = () => {
    if (reportData.length === 0) return alert("No data to export");
    const doc = new jsPDF();
    doc.text("Wastage Report", 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["Date", "Item Name", "Qty", "Rate", "Amount", "Unit", "Remarks"];
    const tableRows = reportData.map(row => [
      row.date,
      row.itemName,
      row.qty,
      row.rate,
      row.amount,
      row.unit,
      row.remarks
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid'
    });
    doc.save(`Wastage_Report_${fromDate}_to_${toDate}.pdf`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Filter Header matching New Screenshot */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm">
            <Trash2 size={18} /> Wastage Report
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">From Date:</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">To Date:</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <Search size={14} /> Show
          </button>
          <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <FileJson size={14} /> Excel
          </button>
          <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <Printer size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Date</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Item Name</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Qty</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Rate</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Amount</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Unit</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-cyan-50/50 font-black text-slate-900">
                <td colSpan={2} className="px-4 py-2.5 text-right text-[10px] uppercase tracking-widest">Total QTY:</td>
                <td className="px-4 py-2.5 text-[11px] text-center">0</td>
                <td className="px-4 py-2.5 text-[11px] text-right">0</td>
                <td colSpan={3} />
              </tr>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest italic">
                    No records found
                  </td>
                </tr>
              ) : (
                reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    {/* Rows data */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RequisitionReportROView({ products }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchItem, setSearchItem] = useState('');
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShow = async () => {
    setIsGenerating(true);
    try {
      // Logic for fetching Requisition report data
      setReportData([]);
    } catch (error) {
      console.error("Error fetching Requisition report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (reportData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Requisition Report");
    XLSX.writeFile(wb, `Requisition_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Filter Header matching Screenshot */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm">
            <FileText size={18} /> Requisition Order Report
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">From Date:</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">To Date:</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 max-w-md">
            <input 
              type="text" 
              placeholder="Search for items..." 
              value={searchItem}
              onChange={e => setSearchItem(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" 
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <Search size={14} /> Show
            </button>
            <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <FileJson size={14} /> Excel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 bg-cyan-50/50">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Item Name</th>
                <th colSpan={2} className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Ord Qty Unit</th>
                <th colSpan={2} className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Rec Qty Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest italic">
                    No records found
                  </td>
                </tr>
              ) : (
                reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    {/* Rows */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PurchaseReportROView({ products }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShow = async () => {
    setIsGenerating(true);
    try {
      // Logic for fetching RO report data
      setReportData([]);
    } catch (error) {
      console.error("Error fetching RO report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (reportData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Report");
    XLSX.writeFile(wb, `Purchase_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const handlePDF = () => {
    if (reportData.length === 0) return alert("No data to export");
    const doc = new jsPDF();
    doc.text("(RO) Purchase Report", 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["Date", "RO No", "Item Name", "Qty", "Rate", "Amount"];
    const tableRows = reportData.map(row => [
      row.date,
      row.roNo,
      row.itemName,
      row.qty,
      row.rate,
      row.amount
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid'
    });
    doc.save(`Purchase_Report_${fromDate}_to_${toDate}.pdf`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Filter Header matching standard Report Style */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm">
            <FileText size={18} /> (RO) Purchase Report
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">From Date:</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">To Date:</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <Search size={14} /> Show
          </button>
          <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <FileJson size={14} /> Excel
          </button>
          <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <Printer size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 bg-cyan-50/50">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Date</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">RO No</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Item Name</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Qty</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Rate</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-cyan-50/30 font-black text-slate-900">
                <td colSpan={3} className="px-4 py-2.5 text-right text-[10px] uppercase tracking-widest">Total:</td>
                <td className="px-4 py-2.5 text-[11px] text-center">0</td>
                <td />
                <td className="px-4 py-2.5 text-[11px] text-right">0.00</td>
              </tr>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest italic">
                    No records found
                  </td>
                </tr>
              ) : (
                reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    {/* Rows */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PurchaseOrderView({ products, departments }) {
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]); // PO List
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    department: 'NA',
    items: []
  });
  const [currentItem, setCurrentItem] = useState({ product_id: '', name: '', barcode: '', qty: 1, unit: '', rate: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateNew = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      department: 'NA',
      items: []
    });
    setShowForm(true);
  };

  const addItem = () => {
    if (!currentItem.product_id) return alert("Select an item first");
    setFormData({
      ...formData,
      items: [...formData.items, { ...currentItem, amount: currentItem.qty * currentItem.rate }]
    });
    setCurrentItem({ product_id: '', name: '', barcode: '', qty: 1, unit: '', rate: 0 });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const totalQty = formData.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalAmount = formData.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (showForm) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Form Header matching Screenshot 2 */}
        <div className="bg-gradient-to-r from-cyan-400 to-blue-400 p-3 rounded-t-xl flex justify-between items-center text-white shadow-lg">
          <div className="flex items-center gap-2">
            <FileText size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">Purchase order</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase">Date :</span>
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-white/20 border border-white/30 rounded px-2 py-1 text-xs font-bold outline-none" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-b-xl border border-slate-200 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Department :</label>
              <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none">
                <option value="NA">NA</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {/* Item Add Section */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Item Name</label>
              <select 
                value={currentItem.product_id}
                onChange={e => {
                  const p = products.find(prod => prod.id === e.target.value);
                  setCurrentItem({...currentItem, product_id: e.target.value, name: p?.name || '', barcode: p?.barcode || '', unit: p?.unit || '', rate: p?.purchase_rate || 0});
                }}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="">Search for items...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Barcode</label>
              <input type="text" value={currentItem.barcode} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
              <input type="number" value={currentItem.qty} onChange={e => setCurrentItem({...currentItem, qty: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Unit</label>
              <input type="text" value={currentItem.unit} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 outline-none" />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rate</label>
                <input type="number" value={currentItem.rate} onChange={e => setCurrentItem({...currentItem, rate: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
              </div>
              <button onClick={addItem} className="bg-red-400 text-white p-2 rounded-lg hover:bg-red-500 transition-all flex items-center justify-center gap-1 text-[10px] font-black uppercase mb-0.5">
                <Circle size={10} fill="currentColor" /> Add
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-400/80 to-blue-400/80 text-white">
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">Item Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">Barcode</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Qty</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Unit</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-right">Rate</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-right">Amount</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-[11px] font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-[11px] font-medium text-slate-500">{item.barcode}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-center">{item.qty}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-center uppercase">{item.unit}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-right">₹{parseFloat(item.rate).toFixed(2)}</td>
                    <td className="px-4 py-2 text-[11px] font-black text-right text-blue-700">₹{parseFloat(item.amount).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800 text-white font-black">
                  <td colSpan={2} className="px-4 py-2 text-right text-[10px] uppercase tracking-widest">Total :</td>
                  <td className="px-4 py-2 text-center text-[11px]">{totalQty.toFixed(2)}</td>
                  <td colSpan={2} />
                  <td className="px-4 py-2 text-right text-[11px]">₹{totalAmount.toFixed(2)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => { alert("Purchase Order Saved!"); setShowForm(false); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">Save</button>
            <button onClick={() => setShowForm(false)} className="border border-blue-600 text-blue-600 px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* List View matching Screenshot 1 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-slate-800 font-black uppercase text-sm">
          <FileText size={18} /> Purchase order (PO)
        </div>

        <div className="flex flex-1 min-w-[300px] items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">From :</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">To :</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none" />
          </div>
        </div>

        <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
          <Plus size={14} /> Create New
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Po No</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Date</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">From</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Total Qty</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Total Amount</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest italic">No records found</td>
              </tr>
            ) : (
              reportData.map((po, index) => (
                <tr key={po.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-[11px] font-black text-blue-700 uppercase">{po.poNo}</td>
                  <td className="px-6 py-3 text-[11px] font-medium text-slate-600">{po.date}</td>
                  <td className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">{po.department}</td>
                  <td className="px-6 py-3 text-[11px] font-black text-slate-900">{po.totalQty.toFixed(2)}</td>
                  <td className="px-6 py-3 text-[11px] font-black text-right text-emerald-600">₹{po.totalAmount.toFixed(2)}</td>
                  <td className="px-6 py-3 text-center">
                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WastageEntryView({ products }) {
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]); // Wastage List
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    items: []
  });
  const [currentItem, setCurrentItem] = useState({ product_id: '', name: '', barcode: '', qty: 1, rate: 0, remarks: '', current_stock: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateNew = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      items: []
    });
    setShowForm(true);
  };

  const addItem = () => {
    if (!currentItem.product_id) return alert("Select an item first");
    setFormData({
      ...formData,
      items: [...formData.items, { ...currentItem }]
    });
    setCurrentItem({ product_id: '', name: '', barcode: '', qty: 1, rate: 0, remarks: '', current_stock: 0 });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const totalQty = formData.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  if (showForm) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Form Header matching Screenshot 2 */}
        <div className="bg-gradient-to-r from-cyan-400 to-blue-400 p-3 rounded-t-xl flex justify-between items-center text-white shadow-lg">
          <div className="flex items-center gap-2">
            <Trash2 size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">Wastage</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase">Date :</span>
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-white/20 border border-white/30 rounded px-2 py-1 text-xs font-bold outline-none" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-b-xl border border-slate-200 shadow-sm space-y-6">
          {/* Item Add Section */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Item Name</label>
              <select 
                value={currentItem.product_id}
                onChange={e => {
                  const p = products.find(prod => prod.id === e.target.value);
                  setCurrentItem({...currentItem, product_id: e.target.value, name: p?.name || '', barcode: p?.barcode || '', rate: p?.purchase_rate || 0, current_stock: p?.stock || 0});
                }}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="">Search for items...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Barcode</label>
              <input type="text" value={currentItem.barcode} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
              <input type="number" value={currentItem.qty} onChange={e => setCurrentItem({...currentItem, qty: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Rate</label>
              <input type="number" value={currentItem.rate} onChange={e => setCurrentItem({...currentItem, rate: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Remarks</label>
                <input type="text" value={currentItem.remarks} onChange={e => setCurrentItem({...currentItem, remarks: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
              </div>
              <button onClick={addItem} className="bg-red-400 text-white p-2 rounded-lg hover:bg-red-500 transition-all flex items-center justify-center gap-1 text-[10px] font-black uppercase mb-0.5">
                <Circle size={10} fill="currentColor" /> Add
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-400/80 to-blue-400/80 text-white">
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">Item Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">Barcode</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Qty</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-right">Rate</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Action</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Current Stock</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-[11px] font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-[11px] font-medium text-slate-500">{item.barcode}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-center">{item.qty}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-right">₹{parseFloat(item.rate).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </td>
                    <td className="px-4 py-2 text-[11px] font-bold text-center text-slate-500">{item.current_stock}</td>
                    <td className="px-4 py-2 text-[11px] font-medium text-slate-600 italic">{item.remarks}</td>
                  </tr>
                ))}
                <tr className="bg-slate-800 text-white font-black">
                  <td colSpan={2} className="px-4 py-2 text-right text-[10px] uppercase tracking-widest">Total :</td>
                  <td className="px-4 py-2 text-center text-[11px]">{totalQty.toFixed(2)}</td>
                  <td colSpan={4} />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => { alert("Wastage Entry Saved!"); setShowForm(false); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">Save</button>
            <button onClick={() => setShowForm(false)} className="border border-blue-600 text-blue-600 px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* List View matching Screenshot 1 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-slate-800 font-black uppercase text-sm">
          <Trash2 size={18} /> Wastage
        </div>

        <div className="flex flex-1 min-w-[300px] items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">From :</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">To :</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none" />
          </div>
        </div>

        <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
          <Plus size={14} /> Create New
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest w-24">Sr No</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Date</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Total Qty</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest italic">No records found</td>
              </tr>
            ) : (
              reportData.map((w, index) => (
                <tr key={w.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-[11px] font-bold text-slate-500">{index + 1}</td>
                  <td className="px-6 py-3 text-[11px] font-medium text-slate-600">{w.date}</td>
                  <td className="px-6 py-3 text-[11px] font-black text-slate-900">{w.totalQty.toFixed(2)}</td>
                  <td className="px-6 py-3 text-center">
                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockTransferReportView({ products, departments }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState('All');
  const [poNo, setPoNo] = useState('');
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShow = async () => {
    setIsGenerating(true);
    try {
      // Logic for fetching transfer report data
      setReportData([]);
    } catch (error) {
      console.error("Error fetching transfer report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (reportData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Transfer Report");
    XLSX.writeFile(wb, `Stock_Transfer_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Filter Header matching Screenshot */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm">
            <RefreshCw size={18} /> Stock Transfer Report
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">From Date</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">To Date</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Department</span>
              <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none min-w-[120px]">
                <option value="All">All</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">PO No</span>
            <input 
              type="text" 
              placeholder="Search PO No.." 
              value={poNo}
              onChange={e => setPoNo(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none w-48" 
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <Search size={14} /> Show
            </button>
            <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <FileJson size={14} /> Excel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 bg-cyan-50/50">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Date</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">from</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">To</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Po No</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Item Name</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Qty</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Unit</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Rate</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-cyan-50/30 font-black text-slate-900">
                <td colSpan={5} className="px-4 py-2.5 text-right text-[10px] uppercase tracking-widest">Total :</td>
                <td className="px-4 py-2.5 text-[11px] text-center">0.00</td>
                <td colSpan={2} />
                <td className="px-4 py-2.5 text-[11px] text-right">0.00</td>
              </tr>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-20 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest italic">
                    No records found
                  </td>
                </tr>
              ) : (
                reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    {/* Rows data */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StockTransferView({ products, departments }) {
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportData, setReportData] = useState([]); // List of transfers
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    from_dept: 'NA',
    to_dept: 'NA',
    po_no: '',
    items: []
  });
  const [currentItem, setCurrentItem] = useState({ product_id: '', name: '', barcode: '', qty: 1, rate: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateNew = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      from_dept: 'NA',
      to_dept: 'NA',
      po_no: '',
      items: []
    });
    setShowForm(true);
  };

  const handleLoadPO = () => {
    if (!formData.po_no) return alert("Please enter PO No first");
    alert("Loading items from PO No: " + formData.po_no);
  };

  const addItem = () => {
    if (!currentItem.product_id) return alert("Select an item first");
    setFormData({
      ...formData,
      items: [...formData.items, { ...currentItem, amount: currentItem.qty * currentItem.rate }]
    });
    setCurrentItem({ product_id: '', name: '', barcode: '', qty: 1, rate: 0 });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const totalQty = formData.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  if (showForm) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Form Header matching Screenshot 2 */}
        <div className="bg-gradient-to-r from-cyan-400 to-blue-400 p-3 rounded-t-xl flex justify-between items-center text-white shadow-lg">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">Stock Transfer</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase">Date :</span>
            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-white/20 border border-white/30 rounded px-2 py-1 text-xs font-bold outline-none" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-b-xl border border-slate-200 shadow-sm space-y-6">
          {/* Dept & PO Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">From Department :</label>
              <select value={formData.from_dept} onChange={e => setFormData({...formData, from_dept: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none">
                <option value="NA">NA</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">To :</label>
              <select value={formData.to_dept} onChange={e => setFormData({...formData, to_dept: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none">
                <option value="NA">NA</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Po No :</label>
              <input type="text" value={formData.po_no} onChange={e => setFormData({...formData, po_no: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
            </div>
            <button onClick={handleLoadPO} className="border border-slate-300 text-slate-700 px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-slate-50 transition-all h-[34px] flex items-center justify-center">
              Load (PO)
            </button>
          </div>

          {/* Item Add Section */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Item Name</label>
              <select 
                value={currentItem.product_id}
                onChange={e => {
                  const p = products.find(prod => prod.id === e.target.value);
                  setCurrentItem({...currentItem, product_id: e.target.value, name: p?.name || '', barcode: p?.barcode || '', rate: p?.purchase_rate || 0});
                }}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="">Search for items...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Barcode</label>
              <input type="text" value={currentItem.barcode} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
              <input type="number" value={currentItem.qty} onChange={e => setCurrentItem({...currentItem, qty: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rate</label>
                <input type="number" value={currentItem.rate} onChange={e => setCurrentItem({...currentItem, rate: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
              </div>
              <button onClick={addItem} className="bg-red-400 text-white p-2 rounded-lg hover:bg-red-500 transition-all flex items-center justify-center gap-1 text-[10px] font-black uppercase mb-0.5">
                <Circle size={10} fill="currentColor" /> Add
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-400/80 to-blue-400/80 text-white">
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">Item Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">Barcode</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Qty</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-right">Rate</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-[11px] font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-[11px] font-medium text-slate-500">{item.barcode}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-center">{item.qty}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-right">₹{parseFloat(item.rate).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800 text-white font-black">
                  <td colSpan={2} className="px-4 py-2 text-right text-[10px] uppercase tracking-widest">Total :</td>
                  <td className="px-4 py-2 text-center text-[11px]">{totalQty.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <div className="flex gap-3">
              <button onClick={() => { alert("Saved & Printing..."); setShowForm(false); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex items-center gap-2">
                <Printer size={14} /> Save & Print
              </button>
              <button onClick={() => { alert("Stock Transfer Saved!"); setShowForm(false); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex items-center gap-2">
                <Save size={14} /> Save
              </button>
              <button onClick={() => setShowForm(false)} className="border border-blue-600 text-blue-600 px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* List View matching Screenshot 1 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-slate-800 font-black uppercase text-sm">
          <RefreshCw size={18} /> Stock Transfer
        </div>

        <div className="flex flex-1 min-w-[300px] items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search V No" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">From :</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">To :</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none" />
          </div>
        </div>

        <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
          <Plus size={14} /> Create New
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest w-24">Sr No</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Date</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">PO No</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">From</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">To</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Total Qty</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest italic">No records found</td>
              </tr>
            ) : (
              reportData.map((tx, index) => (
                <tr key={tx.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-[11px] font-bold text-slate-500">{index + 1}</td>
                  <td className="px-6 py-3 text-[11px] font-medium text-slate-600">{tx.date}</td>
                  <td className="px-6 py-3 text-[11px] font-black text-blue-700 uppercase">{tx.poNo}</td>
                  <td className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">{tx.fromDept}</td>
                  <td className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">{tx.toDept}</td>
                  <td className="px-6 py-3 text-[11px] font-black text-center text-slate-900">{tx.totalQty.toFixed(2)}</td>
                  <td className="px-6 py-3 text-center">
                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CostingReportView({ products, departments }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState('All');
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShow = async () => {
    setIsGenerating(true);
    try {
      // In a real scenario, this would fetch Production and BOM data to calculate costing
      // For now, providing a structured empty state or mock data placeholder
      setReportData([]);
    } catch (error) {
      console.error("Error fetching costing report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (reportData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Costing Report");
    XLSX.writeFile(wb, `Costing_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const handlePDF = () => {
    if (reportData.length === 0) return alert("No data to export");
    const doc = new jsPDF('landscape');
    doc.text("Costing Report", 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["Sr No", "Department", "Finished Item", "Fg. Qty", "Raw Material", "Qty", "Rate", "GST%", "Amount", "Total Cost"];
    const tableRows = reportData.map((row, index) => [
      index + 1,
      row.department,
      row.finishedItem,
      row.fgQty,
      row.rawMaterial,
      row.qty,
      row.rate,
      row.gst,
      row.amount,
      row.totalCost
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8 }
    });
    doc.save(`Costing_Report_${fromDate}_to_${toDate}.pdf`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Filter Header matching Screenshot */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm">
            <BarChart3 size={18} /> Costing Report
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">From Date:</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">To Date:</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Department:</span>
              <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none min-w-[120px]">
                <option value="All">All</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <Search size={14} /> Show
          </button>
          <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <FileJson size={14} /> Excel
          </button>
          <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <Printer size={14} /> PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-slate-200 bg-cyan-50/50">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Sr No</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Department</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Finished Item</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Fg. Qty</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Raw Meterial</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Qty</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Rate</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">GST%</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Amount</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-20 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest italic">
                    No costing data found for the selected period
                  </td>
                </tr>
              ) : (
                reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2 text-[11px] font-bold text-slate-500">{index + 1}</td>
                    {/* Data rows will go here */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProductionEntryView({ products, departments, fetchInitialData }) {
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportData, setReportData] = useState([]); // Production List
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    department: 'NA',
    finished_item_id: '',
    qty: 1,
    items: []
  });
  const [currentItem, setCurrentItem] = useState({ product_id: '', name: '', barcode: '', qty: 1, rate: 0, dis_percent: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateNew = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      department: 'NA',
      finished_item_id: '',
      qty: 1,
      items: []
    });
    setShowForm(true);
  };

  const handleGenerate = async () => {
    if (!formData.finished_item_id) return alert("Select a finished item first");
    // In a real app, this would fetch BOM for the finished item and populate raw items
    alert("Generating raw items from BOM...");
  };

  const addItem = () => {
    if (!currentItem.product_id) return alert("Select an item first");
    const amount = (currentItem.qty * currentItem.rate) * (1 - currentItem.dis_percent / 100);
    const gst_amt = 0; // Simplified
    setFormData({
      ...formData,
      items: [...formData.items, { ...currentItem, gst_amt, amount }]
    });
    setCurrentItem({ product_id: '', name: '', barcode: '', qty: 1, rate: 0, dis_percent: 0 });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const totalGstAmt = formData.items.reduce((sum, item) => sum + Number(item.gst_amt || 0), 0);
  const totalAmount = formData.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (showForm) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Form Header matching Screenshot 2 */}
        <div className="bg-gradient-to-r from-cyan-400 to-blue-400 p-3 rounded-t-xl flex justify-between items-center text-white shadow-lg">
          <div className="flex items-center gap-2">
            <GitBranch size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">Production</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase">Date :</span>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-white/20 border border-white/30 rounded px-2 py-1 text-xs font-bold outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase">Department :</span>
              <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="bg-white/20 border border-white/30 rounded px-2 py-1 text-xs font-bold outline-none">
                <option value="NA">NA</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-b-xl border border-slate-200 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Finished Item</label>
              <select 
                value={formData.finished_item_id}
                onChange={e => setFormData({...formData, finished_item_id: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="">NA</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Qty :</label>
              <input type="number" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
            </div>
            <button onClick={handleGenerate} className="border border-slate-300 text-slate-700 px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-slate-50 transition-all">
              Generate
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Item Name</label>
              <select 
                value={currentItem.product_id}
                onChange={e => {
                  const p = products.find(prod => prod.id === e.target.value);
                  setCurrentItem({...currentItem, product_id: e.target.value, name: p?.name || '', barcode: p?.barcode || '', rate: p?.purchase_rate || 0});
                }}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="">Search for items...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Barcode</label>
              <input type="text" value={currentItem.barcode} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
              <input type="number" value={currentItem.qty} onChange={e => setCurrentItem({...currentItem, qty: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Rate</label>
              <input type="number" value={currentItem.rate} onChange={e => setCurrentItem({...currentItem, rate: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Dis %</label>
                <input type="number" value={currentItem.dis_percent} onChange={e => setCurrentItem({...currentItem, dis_percent: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
              </div>
              <button onClick={addItem} className="bg-red-400 text-white p-2 rounded-lg hover:bg-red-500 transition-all flex items-center justify-center gap-1 text-[10px] font-black uppercase mb-0.5">
                <Circle size={10} fill="currentColor" /> Add
              </button>
            </div>
          </div>

          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-400/80 to-blue-400/80 text-white">
                  <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest">Item Name</th>
                  <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest">Barcode</th>
                  <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-center">Qty</th>
                  <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-right">Rate</th>
                  <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-center">Dis %</th>
                  <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-right">Dis Amt</th>
                  <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-center">Gst</th>
                  <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-right">Gst Amt</th>
                  <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-right">Amount</th>
                  <th className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-[10px] font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-3 py-2 text-[10px] font-medium text-slate-500">{item.barcode}</td>
                    <td className="px-3 py-2 text-[10px] font-bold text-center">{item.qty}</td>
                    <td className="px-3 py-2 text-[10px] font-bold text-right">₹{parseFloat(item.rate).toFixed(2)}</td>
                    <td className="px-3 py-2 text-[10px] font-bold text-center">{item.dis_percent}%</td>
                    <td className="px-3 py-2 text-[10px] font-bold text-right">₹{((item.qty * item.rate) * item.dis_percent / 100).toFixed(2)}</td>
                    <td className="px-3 py-2 text-[10px] font-bold text-center">0%</td>
                    <td className="px-3 py-2 text-[10px] font-bold text-right">₹0.00</td>
                    <td className="px-3 py-2 text-[10px] font-black text-right text-blue-700">₹{parseFloat(item.amount).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800 text-white font-black">
                  <td colSpan={2} className="px-3 py-2 text-right text-[9px] uppercase tracking-widest">Total :</td>
                  <td className="px-3 py-2 text-center text-[10px]">{formData.items.reduce((sum, i) => sum + Number(i.qty), 0).toFixed(2)}</td>
                  <td colSpan={4} />
                  <td className="px-3 py-2 text-right text-[10px]">₹{totalGstAmt.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-[10px]">₹{totalAmount.toFixed(2)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-end pt-4 border-t border-slate-100">
            <div className="flex gap-3">
              <button onClick={() => { alert("Production Saved!"); setShowForm(false); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">Save</button>
              <button onClick={() => setShowForm(false)} className="border border-blue-600 text-blue-600 px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">Cancel</button>
            </div>
            <div className="bg-black text-white p-3 rounded-xl min-w-[200px] text-right space-y-1">
              <div className="flex justify-between text-[9px] font-bold uppercase text-blue-400">
                <span>Round-off :</span>
                <span>0.00</span>
              </div>
              <div className="flex justify-between text-base font-black">
                <span className="uppercase tracking-tighter">Total :</span>
                <span>₹{Math.round(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* List View matching Screenshot 1 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-slate-800 font-black uppercase text-sm">
          <GitBranch size={18} /> Production
        </div>

        <div className="flex flex-1 min-w-[300px] items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search V No" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">From :</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">To :</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none" />
          </div>
        </div>

        <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
          <Plus size={14} /> Production
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest w-24">Sr No</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Date</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Item Name</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Department</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Prod Amt</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest italic">No records found</td>
              </tr>
            ) : (
              reportData.map((prod, index) => (
                <tr key={prod.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-[11px] font-bold text-slate-500">{index + 1}</td>
                  <td className="px-6 py-3 text-[11px] font-medium text-slate-600">{prod.date}</td>
                  <td className="px-6 py-3 text-[11px] font-black text-slate-900 uppercase">{prod.itemName}</td>
                  <td className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase">{prod.department}</td>
                  <td className="px-6 py-3 text-[11px] font-black text-right text-blue-700">₹{prod.amount.toFixed(2)}</td>
                  <td className="px-6 py-3 text-center">
                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BOMView({ products, fetchInitialData }) {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportData, setReportData] = useState([]); // List of saved BOMs
  const [formData, setFormData] = useState({
    finished_item_id: '',
    qty: 1,
    unit: '',
    raw_items: []
  });
  const [currentRaw, setCurrentRaw] = useState({ product_id: '', name: '', barcode: '', qty: 1, unit: '', rate: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // List View Header & Table logic
  const handleCreateNew = () => {
    setFormData({ finished_item_id: '', qty: 1, unit: '', raw_items: [] });
    setShowForm(true);
  };

  const addRawItem = () => {
    if (!currentRaw.product_id) return alert("Please select a raw item first");
    setFormData({
      ...formData,
      raw_items: [...formData.raw_items, { ...currentRaw, amount: currentRaw.qty * currentRaw.rate }]
    });
    setCurrentRaw({ product_id: '', name: '', barcode: '', qty: 1, unit: '', rate: 0 });
  };

  const removeRawItem = (index) => {
    const newItems = formData.raw_items.filter((_, i) => i !== index);
    setFormData({ ...formData, raw_items: newItems });
  };

  const totalRawQty = formData.raw_items.reduce((sum, item) => sum + Number(item.qty), 0);
  const totalRawAmount = formData.raw_items.reduce((sum, item) => sum + Number(item.amount), 0);

  const handleSubmit = async () => {
    if (!formData.finished_item_id || formData.raw_items.length === 0) {
      alert("Please select finished item and add at least one raw item");
      return;
    }
    setIsSubmitting(true);
    try {
      // Placeholder for actual save logic
      console.log("Saving BOM:", formData);
      alert("BOM Saved Successfully!");
      setShowForm(false);
    } catch (error) {
      alert("Error saving BOM: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showForm) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Form Header matching Screenshot 2 */}
        <div className="bg-gradient-to-r from-cyan-400 to-blue-400 p-3 rounded-t-xl flex items-center gap-2 text-white shadow-lg">
          <Settings size={18} />
          <h2 className="text-sm font-black uppercase tracking-widest">Bill of Materials (BOM)</h2>
        </div>

        <div className="bg-white p-6 rounded-b-xl border border-slate-200 shadow-sm space-y-6">
          {/* Finished Item Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Finished Item</label>
              <select 
                value={formData.finished_item_id}
                onChange={e => {
                  const p = products.find(prod => prod.id === e.target.value);
                  setFormData({...formData, finished_item_id: e.target.value, unit: p?.unit || ''});
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="">Choose...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
              <input type="number" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Unit</label>
              <input type="text" value={formData.unit} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none text-slate-500" />
            </div>
          </div>

          {/* Raw Item Selection Header */}
          <div className="bg-slate-800 text-white text-center py-1.5 rounded text-[11px] font-black uppercase tracking-widest">
            Select Raw Item
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Item Name</label>
              <select 
                value={currentRaw.product_id}
                onChange={e => {
                  const p = products.find(prod => prod.id === e.target.value);
                  setCurrentRaw({...currentRaw, product_id: e.target.value, name: p?.name || '', barcode: p?.barcode || '', unit: p?.unit || '', rate: p?.purchase_rate || 0});
                }}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="">Search for items...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Barcode</label>
              <input type="text" value={currentRaw.barcode} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Qty</label>
              <input type="number" value={currentRaw.qty} onChange={e => setCurrentRaw({...currentRaw, qty: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rate</label>
                <input type="number" value={currentRaw.rate} onChange={e => setCurrentRaw({...currentRaw, rate: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" />
              </div>
              <button onClick={addRawItem} className="bg-red-400 text-white p-2 rounded-lg hover:bg-red-500 transition-all flex items-center justify-center gap-1 text-[10px] font-black uppercase mb-0.5">
                <Circle size={10} fill="currentColor" /> Add
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-400/80 to-blue-400/80 text-white">
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">Item Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest">Barcode</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Qty</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Unit</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-right">Rate</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-right">Amount</th>
                  <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.raw_items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 text-[11px] font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-[11px] font-medium text-slate-500">{item.barcode}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-center">{item.qty}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-center uppercase">{item.unit}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-right">₹{parseFloat(item.rate).toFixed(2)}</td>
                    <td className="px-4 py-2 text-[11px] font-black text-right text-blue-700">₹{parseFloat(item.amount).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeRawItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800 text-white font-black">
                  <td colSpan={2} className="px-4 py-2 text-right text-[10px] uppercase tracking-widest">Total :</td>
                  <td className="px-4 py-2 text-center text-[11px]">{totalRawQty.toFixed(2)}</td>
                  <td colSpan={2} />
                  <td className="px-4 py-2 text-right text-[11px]">₹{totalRawAmount.toFixed(2)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Form Footer */}
          <div className="flex justify-between items-end pt-4 border-t border-slate-100">
            <div className="flex gap-3">
              <button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowForm(false)} className="border border-blue-600 text-blue-600 px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
                Cancel
              </button>
            </div>
            <div className="bg-black text-white p-3 rounded-xl min-w-[200px] text-right space-y-1">
              <div className="flex justify-between text-[9px] font-bold uppercase text-blue-400">
                <span>Round-off :</span>
                <span>0.00</span>
              </div>
              <div className="flex justify-between text-base font-black">
                <span className="uppercase tracking-tighter">Total :</span>
                <span>₹{Math.round(totalRawAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* List View matching Screenshot 1 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-slate-800 font-black uppercase text-sm">
          <Settings size={18} /> BOM
        </div>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search Room" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
          />
        </div>

        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all"
        >
          <Plus size={14} /> Create New
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest w-24">S. No</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Item Name</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-20 text-center text-slate-400 text-[11px] font-bold uppercase tracking-widest italic">
                  No BOM records found. Click 'Create New' to start.
                </td>
              </tr>
            ) : (
              reportData.map((bom, index) => (
                <tr key={bom.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 text-[11px] font-bold text-slate-500">{index + 1}</td>
                  <td className="px-6 py-3 text-[11px] font-black text-slate-900 uppercase">{bom.itemName}</td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                      <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentReminderView({ users, orders }) {
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [minAmount, setMinAmount] = useState('100');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const handleLoadData = async () => {
    setLoading(true);
    try {
      const walletTransactions = await dbSync.fetch(DB_SCHEMA.WALLET_TRANSACTIONS.table);
      
      const pendingList = (users || []).map(user => {
        // Calculate total sales for this user before asOnDate
        const userSales = (orders || []).filter(o => 
          o.user_id === user.id && 
          new Date(o.created_at).toISOString().split('T')[0] <= asOnDate
        ).reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

        // Calculate total payments/credits for this user before asOnDate
        const userPayments = (walletTransactions || []).filter(tx => 
          tx.user_id === user.id && 
          tx.type === 'credit' && 
          new Date(tx.created_at).toISOString().split('T')[0] <= asOnDate
        ).reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);

        const pending = userSales - userPayments;

        return {
          id: user.id,
          accountId: user.id.substring(0, 8),
          name: user.name || 'N/A',
          mobile: user.mobile || '-',
          pending: pending
        };
      }).filter(item => item.pending >= parseFloat(minAmount));

      setReportData(pendingList);
    } catch (error) {
      console.error("Load data error:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(reportData.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const toggleSelectUser = (id) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(uid => uid !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const sendReminder = (user) => {
    const message = `Dear ${user.name}, this is a friendly reminder that you have a pending balance of ₹${user.pending.toFixed(2)} at NM MART. Please clear it at your earliest convenience. Thank you!`;
    const whatsappUrl = `https://wa.me/91${user.mobile}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-black text-slate-800 tracking-tight">Payment Reminder</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">As on date.</label>
            <input 
              type="date" 
              value={asOnDate} 
              onChange={e => setAsOnDate(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Min Pending Amount</label>
            <input 
              type="number" 
              value={minAmount} 
              onChange={e => setMinAmount(e.target.value)} 
              placeholder="e.g. 100"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" 
            />
          </div>
          <button 
            onClick={handleLoadData}
            className="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
          >
            {loading ? 'Loading...' : 'Load Data'}
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" onChange={toggleSelectAll} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">Account ID</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">Name</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">Mobile</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">Pending</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.includes(user.id)} 
                      onChange={() => toggleSelectUser(user.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                    />
                  </td>
                  <td className="px-4 py-3 text-[11px] font-black text-blue-700">{user.accountId}</td>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-800 uppercase">{user.name}</td>
                  <td className="px-4 py-3 text-[11px] font-bold text-slate-600">{user.mobile}</td>
                  <td className="px-4 py-3 text-[11px] font-black text-red-600">₹{user.pending.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => sendReminder(user)}
                      className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-md text-[9px] font-black uppercase hover:bg-emerald-100 transition-all border border-emerald-200 flex items-center gap-1.5"
                    >
                      <MessageCircle size={12} /> Send WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
              {reportData.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic text-[11px] font-bold uppercase tracking-widest">
                    No pending payments found for the selected criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CreditReportView({ orders, credits, deliveryBoys, users }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDB, setSelectedDB] = useState('All');
  const [creditAc, setCreditAc] = useState('All');
  const [account, setAccount] = useState('All');
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSearch = async () => {
    setIsGenerating(true);
    try {
      // Logic: Mix orders (Sales) and Wallet Transactions/Credits (Payments)
      const walletTransactions = await dbSync.fetch(DB_SCHEMA.WALLET_TRANSACTIONS.table);
      
      const sales = (orders || []).filter(o => {
        const oDate = new Date(o.created_at).toISOString().split('T')[0];
        return oDate >= fromDate && oDate <= toDate;
      }).map(o => ({
        id: o.id.substring(0, 8),
        date: new Date(o.created_at).toLocaleDateString(),
        billNo: o.order_number,
        acId: o.user_id?.substring(0, 8) || 'N/A',
        customer: o.user_name || 'Customer',
        mobile: o.user_mobile || '-',
        deliveryBoy: deliveryBoys.find(db => db.id === o.delivery_boy_id)?.name || '-',
        sale: parseFloat(o.total_amount) || 0,
        payment: 0,
        paidBy: o.payment_method || '-',
        timestamp: new Date(o.created_at).getTime()
      }));

      const payments = (walletTransactions || []).filter(tx => {
        const txDate = new Date(tx.created_at).toISOString().split('T')[0];
        return txDate >= fromDate && txDate <= toDate && tx.type === 'credit';
      }).map(tx => {
        const user = users.find(u => u.id === tx.user_id);
        return {
          id: tx.id.substring(0, 8),
          date: new Date(tx.created_at).toLocaleDateString(),
          billNo: '-',
          acId: tx.user_id?.substring(0, 8) || 'N/A',
          customer: user?.name || 'Customer',
          mobile: user?.mobile || '-',
          deliveryBoy: '-',
          sale: 0,
          payment: parseFloat(tx.amount) || 0,
          paidBy: 'Wallet/Credit',
          timestamp: new Date(tx.created_at).getTime()
        };
      });

      const combined = [...sales, ...payments].sort((a, b) => b.timestamp - a.timestamp);
      
      // Apply DB Filter if selected
      const filtered = combined.filter(item => 
        selectedDB === 'All' || item.deliveryBoy === deliveryBoys.find(db => db.id === selectedDB)?.name
      );

      setReportData(filtered);
    } catch (error) {
      console.error("Credit report error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (reportData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Credit Report");
    XLSX.writeFile(wb, `Credit_Report_${fromDate}.xlsx`);
  };

  const handlePDF = () => {
    if (reportData.length === 0) return alert("No data to print");
    const doc = new jsPDF('landscape');
    doc.text("Credit Report", 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["ID", "Date", "Bill No", "A/c Id", "Customer", "Mobile", "Delivery Boy", "Sale", "Payment", "Paid By"];
    const tableRows = reportData.map(row => [
      row.id,
      row.date,
      row.billNo,
      row.acId,
      row.customer,
      row.mobile,
      row.deliveryBoy,
      row.sale.toFixed(2),
      row.payment.toFixed(2),
      row.paidBy
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8 }
    });
    doc.save(`Credit_Report_${fromDate}.pdf`);
  };

  const accountSummary = useMemo(() => {
    const accs = {};
    reportData.forEach(item => {
      const key = item.customer;
      if (!accs[key]) accs[key] = { name: key, sale: 0, payment: 0 };
      accs[key].sale += item.sale;
      accs[key].payment += item.payment;
    });
    return Object.values(accs).map(a => ({ ...a, closing: a.sale - a.payment }));
  }, [reportData]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-black text-slate-800 tracking-tight">Delivery Boy Payment Report</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Delivery Boy</label>
            <select value={selectedDB} onChange={e => setSelectedDB(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option value="All">All</option>
              {deliveryBoys.map(db => <option key={db.id} value={db.id}>{db.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Credit Account</label>
            <select value={creditAc} onChange={e => setCreditAc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option value="All">All</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Account</label>
            <select value={account} onChange={e => setAccount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option value="All">All</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              Search
            </button>
            <button onClick={handleExcel} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              Excel
            </button>
            <button onClick={handlePDF} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase">ID</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase">Date</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase">Bill No</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase">A/c Id</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase">Customer</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase">Mobile No</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase">Delivery Boy</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase text-right">Sale</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase text-right">Payment</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-700 uppercase">Paid By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2 text-[10px] font-bold text-slate-400">#{row.id}</td>
                  <td className="px-3 py-2 text-[10px] font-medium text-slate-600">{row.date}</td>
                  <td className="px-3 py-2 text-[10px] font-black text-blue-700">{row.billNo}</td>
                  <td className="px-3 py-2 text-[10px] font-medium text-slate-500">{row.acId}</td>
                  <td className="px-3 py-2 text-[10px] font-black text-slate-800 uppercase">{row.customer}</td>
                  <td className="px-3 py-2 text-[10px] font-medium text-slate-600">{row.mobile}</td>
                  <td className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">{row.deliveryBoy}</td>
                  <td className="px-3 py-2 text-[10px] font-black text-slate-900 text-right">{row.sale > 0 ? `₹${row.sale.toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-[10px] font-black text-emerald-600 text-right">{row.payment > 0 ? `₹${row.payment.toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">{row.paidBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Account Wise Pending</h3>
          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2 text-[10px] font-black text-slate-700 uppercase">Account</th>
                  <th className="px-4 py-2 text-[10px] font-black text-slate-700 uppercase text-right">Sale</th>
                  <th className="px-4 py-2 text-[10px] font-black text-slate-700 uppercase text-right">Payment</th>
                  <th className="px-4 py-2 text-[10px] font-black text-slate-700 uppercase text-right">Closing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accountSummary.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-[11px] font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-slate-900 text-right">₹{item.sale.toFixed(2)}</td>
                    <td className="px-4 py-2 text-[11px] font-bold text-emerald-600 text-right">₹{item.payment.toFixed(2)}</td>
                    <td className="px-4 py-2 text-[11px] font-black text-blue-700 text-right">₹{item.closing.toFixed(2)}</td>
                  </tr>
                ))}
                {accountSummary.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[10px] font-bold text-slate-400 italic">No pending accounts found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryBoyPaymentReportView({ orders, deliveryBoys, accounts }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDB, setSelectedDB] = useState('All');
  const [creditAc, setCreditAc] = useState('All');
  const [account, setAccount] = useState('All');
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSearch = () => {
    setIsGenerating(true);
    // Filter orders based on delivery boy and date
    const filtered = (orders || []).filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      const matchesDate = orderDate >= fromDate && orderDate <= toDate;
      const matchesDB = selectedDB === 'All' || order.delivery_boy_id === selectedDB;
      const matchesStatus = order.status === 'delivered'; // Usually payments are tracked for delivered orders
      
      return matchesDate && matchesDB && matchesStatus;
    }).map(order => {
      const db = deliveryBoys.find(b => b.id === order.delivery_boy_id);
      return {
        id: order.order_number,
        date: new Date(order.created_at).toLocaleDateString(),
        acId: order.user_id?.substring(0, 8) || 'N/A',
        customer: order.user_name || 'Walking Customer',
        mobile: order.user_mobile || '-',
        deliveryBoy: db ? db.name : 'Not Assigned',
        amount: parseFloat(order.total_amount) || 0,
        paidBy: order.payment_method || 'Cash'
      };
    });

    setReportData(filtered);
    setIsGenerating(false);
  };

  const handleExcel = () => {
    if (reportData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DB Payment Report");
    XLSX.writeFile(wb, `DB_Payment_Report_${fromDate}.xlsx`);
  };

  const handlePDF = () => {
    if (reportData.length === 0) return alert("No data to print");
    const doc = new jsPDF('landscape');
    doc.text("Delivery Boy Payment Report", 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["ID", "Date", "A/c Id", "Customer", "Mobile No", "Delivery Boy", "Amount", "Paid By"];
    const tableRows = reportData.map(row => [
      row.id,
      row.date,
      row.acId,
      row.customer,
      row.mobile,
      row.deliveryBoy,
      row.amount.toFixed(2),
      row.paidBy
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid'
    });
    doc.save(`DB_Payment_Report_${fromDate}.pdf`);
  };

  const summary = useMemo(() => {
    const counts = {};
    reportData.forEach(item => {
      counts[item.deliveryBoy] = (counts[item.deliveryBoy] || 0) + item.amount;
    });
    return Object.entries(counts).map(([name, total]) => ({ name, total }));
  }, [reportData]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-black text-slate-800 tracking-tight">Delivery Boy Payment Report</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Delivery Boy</label>
            <select value={selectedDB} onChange={e => setSelectedDB(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option value="All">All</option>
              {deliveryBoys.map(db => <option key={db.id} value={db.id}>{db.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Credit Account</label>
            <select value={creditAc} onChange={e => setCreditAc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option value="All">All</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Account</label>
            <select value={account} onChange={e => setAccount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option value="All">All</option>
            </select>
          </div>
          <button onClick={handleSearch} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
            Search
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">ID</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">Date</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">A/c Id</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">Customer</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">Mobile No</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">Delivery Boy</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase text-right">Amount</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase">Paid By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 text-[11px] font-bold text-blue-600">#{row.id}</td>
                  <td className="px-4 py-2.5 text-[11px] font-medium text-slate-500">{row.date}</td>
                  <td className="px-4 py-2.5 text-[11px] font-medium text-slate-500">{row.acId}</td>
                  <td className="px-4 py-2.5 text-[11px] font-black text-slate-800 uppercase">{row.customer}</td>
                  <td className="px-4 py-2.5 text-[11px] font-medium text-slate-600">{row.mobile}</td>
                  <td className="px-4 py-2.5 text-[11px] font-bold text-slate-700 uppercase">{row.deliveryBoy}</td>
                  <td className="px-4 py-2.5 text-[11px] font-black text-slate-900 text-right">₹{row.amount.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-[11px] font-bold text-emerald-600 uppercase">{row.paidBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Delivery Boy Collection Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {summary.map((item, i) => (
              <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.name}</p>
                <h4 className="text-base font-black text-blue-700">₹{item.total.toFixed(2)}</h4>
              </div>
            ))}
            {summary.length === 0 && <p className="text-[10px] font-bold text-slate-400 italic">No collection summary available</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function LedgerView({ users, accounts }) {
  const [fromDate, setFromDate] = useState('2024-04-01');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [acType, setAcType] = useState('All');
  const [searchParty, setSearchParty] = useState('');
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShow = async () => {
    setIsGenerating(true);
    try {
      // 1. Fetch wallet transactions (as they represent financial ledger entries)
      const transactions = await dbSync.fetch(DB_SCHEMA.WALLET_TRANSACTIONS.table, {
        order: { column: 'created_at', ascending: true }
      });

      // 2. Filter data
      const filtered = (transactions || []).filter(tx => {
        const txDate = new Date(tx.created_at).toISOString().split('T')[0];
        const matchesDate = txDate >= fromDate && txDate <= toDate;
        
        const user = users.find(u => u.id === tx.user_id);
        const partyName = user ? (user.name || user.mobile) : 'Unknown';
        const matchesParty = !searchParty || partyName.toLowerCase().includes(searchParty.toLowerCase());
        
        // Ac Type logic (simplified: mapping tx type to account types if needed)
        const matchesType = acType === 'All' || tx.type === acType;

        return matchesDate && matchesParty && matchesType;
      }).map(tx => {
        const user = users.find(u => u.id === tx.user_id);
        return {
          id: tx.id,
          date: new Date(tx.created_at).toLocaleDateString(),
          partyName: user ? (user.name || user.mobile) : 'Unknown',
          debit: tx.type === 'debit' ? parseFloat(tx.amount) : 0,
          credit: tx.type === 'credit' ? parseFloat(tx.amount) : 0,
          timestamp: new Date(tx.created_at).getTime()
        };
      });

      // Calculate running balance
      let balance = 0;
      const dataWithBalance = filtered.map(item => {
        balance = balance + item.credit - item.debit;
        return { ...item, balance };
      });

      setReportData(dataWithBalance);
    } catch (error) {
      console.error("Error generating ledger:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (reportData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger Report");
    XLSX.writeFile(wb, `Ledger_Report_${searchParty}_${fromDate}.xlsx`);
  };

  const handlePDF = () => {
    if (reportData.length === 0) return alert("No data to print");
    const doc = new jsPDF();
    doc.text(`Ledger Report: ${searchParty}`, 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["Date", "Party Name", "Debit", "Credit", "Balance"];
    const tableRows = reportData.map(item => [
      item.date,
      item.partyName,
      item.debit.toFixed(2),
      item.credit.toFixed(2),
      item.balance.toFixed(2)
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid'
    });
    doc.save(`Ledger_Report_${searchParty}_${fromDate}.pdf`);
  };

  const totals = useMemo(() => {
    return {
      debit: reportData.reduce((sum, i) => sum + i.debit, 0),
      credit: reportData.reduce((sum, i) => sum + i.credit, 0)
    };
  }, [reportData]);

  return (
    <div className="space-y-4">
      {/* Filter Header matching Screenshot */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm">
            <Book size={18} /> Ledger view
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase w-16 text-right leading-tight">From Date:</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase w-16 text-right leading-tight">To Date:</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase w-16 text-right leading-tight">Ac Type:</span>
              <select value={acType} onChange={e => setAcType(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none w-40">
                <option value="All">All</option>
                <option value="credit">Credit Only</option>
                <option value="debit">Debit Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-xl">
            <input 
              type="text" 
              value={searchParty} 
              onChange={e => setSearchParty(e.target.value)} 
              placeholder="Search for Party..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <Search size={14} /> Show
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <FileJson size={14} /> Excel
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <Printer size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Date</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Party Name</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Debit</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Credit</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-blue-50/50 font-black text-slate-900">
                <td colSpan={2} />
                <td className="px-6 py-2.5 text-right text-[11px] uppercase tracking-widest">Total:</td>
                <td className="px-6 py-2.5 text-[11px] text-right">{totals.debit}</td>
                <td className="px-6 py-2.5 text-[11px] text-right">{totals.credit}</td>
                <td className="px-6 py-2.5" />
              </tr>
              {reportData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-2 text-[11px] font-bold text-slate-500">{item.date}</td>
                  <td className="px-6 py-2 text-[11px] font-black text-slate-900 uppercase">{item.partyName}</td>
                  <td className="px-6 py-2 text-[11px] font-bold text-right text-red-600">{item.debit > 0 ? item.debit.toFixed(2) : ''}</td>
                  <td className="px-6 py-2 text-[11px] font-bold text-right text-emerald-600">{item.credit > 0 ? item.credit.toFixed(2) : ''}</td>
                  <td className="px-6 py-2 text-[11px] font-black text-right text-slate-900">{item.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LogbookView() {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [fromDate, toDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await dbSync.fetch(DB_SCHEMA.SYSTEM_LOGS.table, {
        order: { column: 'created_at', ascending: false }
      });
      
      // Filter by date range and parse the log_entry string
      const filtered = (data || []).filter(log => {
        const logDate = new Date(log.created_at || new Date()).toISOString().split('T')[0];
        return logDate >= fromDate && logDate <= toDate;
      }).map(log => {
        // Parsing "tableName-action-timestamp" format from dbSync.js
        const parts = (log.log_entry || '').split('-');
        return {
          id: log.id,
          timestamp: log.created_at || new Date().toISOString(),
          module: parts[0] || 'System',
          action: parts[1] || 'Activity',
          raw: log.log_entry
        };
      });

      setLogs(filtered);
    } catch (error) {
      console.error("Log fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExcel = () => {
    if (logs.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(logs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logbook");
    XLSX.writeFile(wb, `Logbook_${fromDate}_to_${toDate}.xlsx`);
  };

  const handlePDF = () => {
    if (logs.length === 0) return alert("No data to print");
    const doc = new jsPDF();
    doc.text("System Logbook", 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["Timestamp", "Module", "Action Performed"];
    const tableRows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.module,
      `${log.action} on ${log.module}`
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid'
    });
    doc.save(`Logbook_${fromDate}_to_${toDate}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Filter Header matching Screenshot */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-slate-800 font-black uppercase text-sm">
          <Flag size={18} /> Logbook
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">From :</span>
            <input 
              type="date" 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)} 
              className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">To :</span>
            <input 
              type="date" 
              value={toDate} 
              onChange={e => setToDate(e.target.value)} 
              className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
            />
          </div>
          <div className="flex gap-2 ml-4">
            <button onClick={handleExcel} className="bg-blue-600 text-white px-4 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-md">
              Excel
            </button>
            <button onClick={handlePDF} className="bg-blue-600 text-white px-4 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-md">
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
        {logs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-20">
            <p className="text-sm font-bold uppercase tracking-widest">There are no records to display</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest w-48">Timestamp</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest w-48">Module / Table</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Action Performed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-[11px] font-bold text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[11px] font-black text-slate-700 uppercase tracking-widest">
                      {log.action} operation performed on {log.module}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemStatementReportView({ products, departments }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchItem, setSearchItem] = useState('');
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [openingStock, setOpeningStock] = useState(0);

  const handleShow = async () => {
    if (!searchItem) return alert("Please search and select an item first");
    setIsGenerating(true);
    try {
      const selectedProduct = products.find(p => 
        p.name.toLowerCase().includes(searchItem.toLowerCase()) || 
        p.barcode?.toLowerCase() === searchItem.toLowerCase()
      );

      if (!selectedProduct) {
        alert("Item not found");
        return;
      }

      // 1. Fetch transactions
      const purchaseItems = await dbSync.fetch(DB_SCHEMA.PURCHASE_ITEMS.table, { eq: { column: 'product_id', value: selectedProduct.id } });
      const orderItems = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, { eq: { column: 'product_id', value: selectedProduct.id } });
      const allPurchases = await dbSync.fetch(DB_SCHEMA.PURCHASES.table);
      const allOrders = await dbSync.fetch(DB_SCHEMA.ORDERS.table);

      // 2. Calculate Opening Stock (Stock before fromDate)
      const priorPurchases = purchaseItems.filter(pi => {
        const p = allPurchases.find(pur => pur.id === pi.purchase_id);
        return p && new Date(p.bill_date).toISOString().split('T')[0] < fromDate;
      }).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

      const priorSales = orderItems.filter(oi => {
        const o = allOrders.find(ord => ord.id === oi.order_id);
        return o && o.status !== 'cancelled' && new Date(o.created_at).toISOString().split('T')[0] < fromDate;
      }).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

      // Simplified opening calculation
      const opening = (parseFloat(selectedProduct.stock) || 0) - (purchaseItems.reduce((sum, i) => sum + parseFloat(i.quantity), 0) - priorPurchases) + (orderItems.reduce((sum, i) => sum + parseFloat(i.quantity), 0) - priorSales);
      setOpeningStock(opening);

      // 3. Process transactions within date range
      const rangeTransactions = [];

      // Add Purchases
      purchaseItems.forEach(pi => {
        const p = allPurchases.find(pur => pur.id === pi.purchase_id);
        if (p) {
          const pDate = new Date(p.bill_date).toISOString().split('T')[0];
          if (pDate >= fromDate && pDate <= toDate) {
            rangeTransactions.push({
              date: p.bill_date,
              voucher: `PUR / ${p.bill_no}`,
              dept: departments.find(d => d.id === p.department_id)?.name || 'NA',
              itemName: selectedProduct.name,
              barcode: selectedProduct.barcode || '-',
              inQty: parseFloat(pi.quantity),
              outQty: 0,
              type: 'IN',
              timestamp: new Date(p.bill_date).getTime()
            });
          }
        }
      });

      // Add Sales
      orderItems.forEach(oi => {
        const o = allOrders.find(ord => ord.id === oi.order_id);
        if (o && o.status !== 'cancelled') {
          const oDate = new Date(o.created_at).toISOString().split('T')[0];
          if (oDate >= fromDate && oDate <= toDate) {
            rangeTransactions.push({
              date: o.created_at,
              voucher: `SALE / ${o.order_number}`,
              dept: 'SALES',
              itemName: selectedProduct.name,
              barcode: selectedProduct.barcode || '-',
              inQty: 0,
              outQty: parseFloat(oi.quantity),
              type: 'OUT',
              timestamp: new Date(o.created_at).getTime()
            });
          }
        }
      });

      // Sort by date
      rangeTransactions.sort((a, b) => a.timestamp - b.timestamp);

      // Calculate Running Closing
      let currentClosing = opening;
      const finalData = rangeTransactions.map(tr => {
        currentClosing = currentClosing + tr.inQty - tr.outQty;
        return { ...tr, closing: currentClosing, unit: selectedProduct.unit || 'PCS' };
      });

      setReportData(finalData);
    } catch (error) {
      console.error("Error generating item statement:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (reportData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Item Statement");
    XLSX.writeFile(wb, `Item_Statement_${searchItem}_${fromDate}.xlsx`);
  };

  const handlePDF = () => {
    if (reportData.length === 0) return alert("No data to print");
    const doc = new jsPDF('landscape');
    doc.text(`Item Statement: ${searchItem}`, 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    doc.text(`Opening Stock: ${openingStock.toFixed(2)}`, 14, 29);
    
    const tableColumn = ["V.Date", "Voucher", "Dept", "Item Name", "Barcode", "In Qty", "Out Qty", "Closing", "Unit"];
    const tableRows = reportData.map(item => [
      new Date(item.date).toLocaleDateString(),
      item.voucher,
      item.dept,
      item.itemName,
      item.barcode,
      item.inQty > 0 ? `+${item.inQty}` : '',
      item.outQty > 0 ? `-${item.outQty}` : '',
      item.closing.toFixed(2),
      item.unit
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid'
    });
    doc.save(`Item_Statement_${searchItem}_${fromDate}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
        <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm mb-4">
          <Zap size={16} /> Item Statement Report
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20 text-right">From Date:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20 text-right">To Date:</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="md:col-span-1" />
          <div className="flex justify-end gap-2">
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <Search size={14} /> Show
            </button>
            <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <FileJson size={14} /> Excel
            </button>
            <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <Printer size={14} /> PDF
            </button>
          </div>

          <div className="md:col-span-2 md:col-start-2">
            <input 
              type="text" 
              value={searchItem} 
              onChange={e => setSearchItem(e.target.value)} 
              placeholder="Search for items..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">V.Date</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Voucher</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Department</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Item Name</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Barcode</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">In Qty</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Out Qty</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Closing</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Opening Row */}
              <tr className="bg-red-50/50">
                <td colSpan={3} />
                <td className="px-4 py-2 text-[11px] font-black text-red-600 uppercase">Opening</td>
                <td colSpan={3} />
                <td className="px-4 py-2 text-[11px] font-black text-red-600 text-right">{openingStock.toFixed(2)}</td>
                <td />
              </tr>
              {reportData.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2 text-[11px] font-bold text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-[11px] font-black text-blue-700">{item.voucher}</td>
                  <td className="px-4 py-2 text-[11px] font-bold text-slate-600 uppercase">{item.dept}</td>
                  <td className="px-4 py-2 text-[11px] font-black text-slate-900 uppercase">{item.itemName}</td>
                  <td className="px-4 py-2 text-[11px] font-medium text-slate-500">{item.barcode}</td>
                  <td className="px-4 py-2 text-[11px] font-bold text-center text-emerald-600">{item.inQty > 0 ? `+${item.inQty.toFixed(2)}` : ''}</td>
                  <td className="px-4 py-2 text-[11px] font-bold text-center text-red-600">{item.outQty > 0 ? `-${item.outQty.toFixed(2)}` : ''}</td>
                  <td className="px-4 py-2 text-[11px] font-black text-right text-slate-900">{item.closing.toFixed(2)}</td>
                  <td className="px-4 py-2 text-[11px] font-bold text-slate-500 uppercase">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StockReportView({ products, purchases, orders, categories, departments }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [dept, setDept] = useState('All');
  const [group, setGroup] = useState('All');
  const [searchItem, setSearchItem] = useState('');
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShow = async () => {
    setIsGenerating(true);
    try {
      // 1. Fetch relevant stock transactions (Purchase Items and Order Items)
      const purchaseItems = await dbSync.fetch(DB_SCHEMA.PURCHASE_ITEMS.table);
      const orderItems = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table);
      const allPurchases = await dbSync.fetch(DB_SCHEMA.PURCHASES.table);
      const allOrders = await dbSync.fetch(DB_SCHEMA.ORDERS.table);

      // 2. Process products one by one
      const stockSummary = products.map(product => {
        // Filter by group (category) - Support both ID and Name
        const productCategory = product.category_name || product.category || 'No Category';
        if (group !== 'All' && productCategory !== group) return null;
        
        // Filter by search
        if (searchItem && !product.name.toLowerCase().includes(searchItem.toLowerCase())) return null;

        // Calculate Stock In/Out within range
        const inItems = purchaseItems.filter(pi => {
          const p = allPurchases.find(pur => pur.id === pi.purchase_id);
          if (!p) return false;
          const pDate = new Date(p.bill_date).toISOString().split('T')[0];
          return (pi.product_id === product.id || pi.product_name === product.name) && pDate >= fromDate && pDate <= toDate;
        });

        const outItems = orderItems.filter(oi => {
          const o = allOrders.find(ord => ord.id === oi.order_id);
          if (!o || o.status === 'cancelled') return false;
          const oDate = new Date(o.created_at).toISOString().split('T')[0];
          return (oi.product_id === product.id || oi.product_name === product.name) && oDate >= fromDate && oDate <= toDate;
        });

        const stockIn = inItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
        const stockOut = outItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

        // --- DIRECT STOCK DISPLAY (GROUND TRUTH) ---
        // For imported data, the 'stock' field in the product table is the current stock
        const closing = parseFloat(product.stock || 0);
        const opening = closing - stockIn + stockOut; 

        return {
          srNo: 0,
          itemName: product.name,
          opening: opening,
          stockIn: stockIn,
          stockOut: stockOut,
          closing: closing,
          unit: product.unit_name || product.unit || 'PCS',
          saleRate: parseFloat(product.sale_rate || 0),
          amount: closing * parseFloat(product.sale_rate || 0),
          purcRate: parseFloat(product.purchase_rate || 0),
          purcAmount: closing * parseFloat(product.purchase_rate || 0)
        };
      }).filter(Boolean);

      setReportData(stockSummary.map((item, i) => ({ ...item, srNo: i + 1 })));
    } catch (error) {
      console.error("Error generating stock report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (reportData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Report");
    XLSX.writeFile(wb, `Stock_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const handlePDF = () => {
    if (reportData.length === 0) return alert("No data to print");
    const doc = new jsPDF('landscape');
    doc.text("Stock Report", 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["Sr No", "Item Name", "Opening", "Stock In", "Stock Out", "Closing", "Unit", "Sale Rate", "Amount"];
    const tableRows = reportData.map((item, i) => [
      item.srNo,
      item.itemName,
      item.opening.toFixed(2),
      item.stockIn.toFixed(2),
      item.stockOut.toFixed(2),
      item.closing.toFixed(2),
      item.unit,
      item.saleRate,
      item.amount.toFixed(2)
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8 }
    });
    doc.save(`Stock_Report_${fromDate}_to_${toDate}.pdf`);
  };

  const totals = useMemo(() => {
    return {
      qty: reportData.reduce((sum, item) => sum + item.closing, 0),
      amount: reportData.reduce((sum, item) => sum + item.amount, 0),
      purcAmount: reportData.reduce((sum, item) => sum + item.purcAmount, 0)
    };
  }, [reportData]);

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
        <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm mb-4">
          <Activity size={16} /> Stock Report
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">From Date:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">To Date:</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Department:</span>
            <select value={dept} onChange={e => setDept(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>All</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Item Group:</span>
            <select value={group} onChange={e => setGroup(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>All</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <input 
              type="text" 
              value={searchItem} 
              onChange={e => setSearchItem(e.target.value)} 
              placeholder="Search for items..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold outline-none" 
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <Search size={14} /> Show
            </button>
            <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <FileJson size={14} /> Excel
            </button>
            <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <Printer size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest w-16">Sr No</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Item Name</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Opening</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Stock In</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Stock Out</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Closing</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Unit</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Sale Rate</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Amount</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Purc Rate</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-[11px] font-bold text-slate-500">{item.srNo}</td>
                  <td className="px-3 py-2 text-[11px] font-black text-slate-900 uppercase">{item.itemName}</td>
                  <td className="px-3 py-2 text-[11px] font-bold text-center">{item.opening.toFixed(2)}</td>
                  <td className="px-3 py-2 text-[11px] font-bold text-center text-emerald-600">+{item.stockIn.toFixed(2)}</td>
                  <td className="px-3 py-2 text-[11px] font-bold text-center text-red-600">-{item.stockOut.toFixed(2)}</td>
                  <td className="px-3 py-2 text-[11px] font-black text-center">{item.closing.toFixed(2)}</td>
                  <td className="px-3 py-2 text-[11px] font-bold text-center uppercase">{item.unit}</td>
                  <td className="px-3 py-2 text-[11px] font-bold text-center">₹{item.saleRate}</td>
                  <td className="px-3 py-2 text-[11px] font-black text-center">₹{item.amount.toFixed(2)}</td>
                  <td className="px-3 py-2 text-[11px] font-bold text-center">₹{item.purcRate}</td>
                  <td className="px-3 py-2 text-[11px] font-black text-right">₹{item.purcAmount.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-blue-100/50 font-black text-slate-900 border-t-2 border-slate-200">
                <td colSpan="5" className="px-3 py-2.5 text-right text-[11px] uppercase tracking-widest">Total QTY:</td>
                <td className="px-3 py-2.5 text-[11px] text-center">{totals.qty.toFixed(2)}</td>
                <td colSpan="2" />
                <td className="px-3 py-2.5 text-[11px] text-center">₹{totals.amount.toFixed(2)}</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-[11px] text-right">₹{totals.purcAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UnderDevelopmentView({ title }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4 bg-blue-50 rounded-full text-blue-600 mb-4">
        <Settings size={48} className="animate-spin-slow" />
      </div>
      <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">{title}</h3>
      <p className="text-slate-400 font-bold uppercase text-[10px] mt-2 tracking-widest">This module is currently under development</p>
    </div>
  );
}

// --- Tab Content Renderer ---
function renderTabContent(tab, props) {
  switch (tab) {
    case 'Dashboard': return <DashboardView {...props} />;
    case 'AppConfig': return <AppConfigView {...props} />;
    case 'HomeConfig': return <MasterListView title="Home Config" table={DB_SCHEMA.HOME_CONFIG.table} fields={HOME_CONFIG_FIELDS} data={props.homeConfig} {...props} />;
    case 'Banners': return <MasterListView title="Banners" table={DB_SCHEMA.BANNERS.table} bucket="banner-images" fields={BANNER_FIELDS} data={props.banners} {...props} />;
    case 'Categories': return <MasterListView title="Item Group Master" table={DB_SCHEMA.CATEGORIES.table} bucket="category-images" fields={CATEGORY_FIELDS} data={props.categories} {...props} />;
    case 'Subcategories': return <SubCategoryView title="Sub-Category Master" table={DB_SCHEMA.SUBCATEGORIES.table} bucket="category-images" fields={SUBCATEGORY_FIELDS} data={props.subcategories} categories={props.categories} {...props} />;
    case 'Brands': return <BrandView title="Brand Master" table={DB_SCHEMA.BRANDS.table} bucket="brand-images" fields={BRAND_FIELDS} data={props.brands} {...props} />;
    
    // New Masters Placeholder
    case 'Units': return <UnitView title="Item Unit Master" table={DB_SCHEMA.UNITS.table} data={props.units} {...props} />;
    case 'MainCategories': return <MainCategoryView title="Item Main Category" table={DB_SCHEMA.CATEGORIES.table} bucket="category-images" fields={MAIN_CATEGORY_FIELDS} data={props.categories} {...props} />;
    case 'Departments': return <DepartmentView title="Department Master" table={DB_SCHEMA.DEPARTMENTS.table} data={props.departments} {...props} />;
    case 'Accounts': return <AccountsView title="Account Master" table={DB_SCHEMA.ACCOUNTS.table} data={props.accounts} {...props} />;
    case 'Purchase': return <PurchaseView title="Purchase" table={DB_SCHEMA.PURCHASES.table} data={props.purchases} products={props.products} departments={props.departments} {...props} />;
    case 'UserMaster': return <UserMasterView title="User Master" table={DB_SCHEMA.ADMIN_USERS.table} data={props.adminUsers} {...props} />;
    case 'Credits': return <CreditMasterView title="Credit Master" table={DB_SCHEMA.CREDITS.table} data={props.credits} {...props} />;
    case 'DeliveryBoys': return <DeliveryBoyView title="Delivery Boy Master" table={DB_SCHEMA.DELIVERY_BOYS.table} data={props.deliveryBoys} {...props} />;
    case 'DeliveryCustomers': return <DeliveryCustomerView title="Delivery Customer Master" table={DB_SCHEMA.DELIVERY_CUSTOMERS.table} data={props.deliveryCustomers} {...props} />;

    case 'Products': 
    case 'ProductsStock': return <ProductsView filter={tab === 'ProductsStock' ? 'low_stock' : null} subcategories={props.subcategories} {...props} />;
    case 'Transaction': return <TransactionView {...props} />;
    case 'Orders': 
    case 'OrdersPending':
    case 'OrdersDelivered':
    case 'OrdersCancelled': return <OrdersView filter={tab.replace('Orders', '').toLowerCase() || null} {...props} />;
    case 'Coupons': return <CouponMasterView title="Coupon Master" table={DB_SCHEMA.COUPONS.table} data={props.coupons} {...props} />;
    case 'Offers': return <OffersMasterView title="Offers Master" table={DB_SCHEMA.OFFERS.table} bucket="banner-images" data={props.offers} {...props} />;
    case 'Pincodes': return <PincodeMasterView title="Pincode Master" table={DB_SCHEMA.PINCODES.table} data={props.pincodes} {...props} />;
    case 'WalletMaster': return <WalletMasterView users={props.users} fetchInitialData={props.fetchInitialData} />;
    case 'WalletTx': return <MasterListView title="Wallet Transactions" table={DB_SCHEMA.WALLET_TRANSACTIONS.table} fields={[{name: 'user_id', label: 'User ID'}, {name: 'amount', label: 'Amount'}, {name: 'type', label: 'Type'}, {name: 'description', label: 'Reason'}]} data={props.walletTx} {...props} />;
    case 'Addresses': return <AddressMasterView title="Address Master" table={DB_SCHEMA.ADDRESSES.table} data={props.addresses} {...props} />;
    case 'Cart': return <MasterListView title="Active Carts" table={DB_SCHEMA.CART.table} fields={[{name: 'user_id', label: 'User ID'}, {name: 'product_id', label: 'Product ID'}, {name: 'quantity', label: 'Qty'}]} data={props.cart} {...props} />;
    case 'Wishlist': return <MasterListView title="User Wishlists" table={DB_SCHEMA.WISHLIST.table} fields={[{name: 'user_id', label: 'User ID'}, {name: 'product_id', label: 'Product ID'}]} data={props.wishlist} {...props} />;
    case 'Notifications': return <NotificationsView {...props} />;
    case 'POS': return <POSView {...props} />;

    // Store Dropdown Cases (Steps 15-24)
    case 'BOM': return <BOMView {...props} />;
    case 'StoreItemDisplay': return <StoreItemDisplayView {...props} />;
    case 'StoreSubCatDisplay': return <StoreSubCatDisplayView {...props} />;
    case 'StoreMainCatDisplay': return <StoreMainCatDisplayView {...props} />;
    case 'TestBluetooth': return <TestBluetoothView {...props} />;
    case 'ProductionEntry': return <ProductionEntryView {...props} />;
    case 'CostingReport': return <CostingReportView {...props} />;
    case 'StockTransfer': return <StockTransferView {...props} />;
    case 'StockTransferReport': return <StockTransferReportView {...props} />;
    case 'WastageEntry': return <WastageEntryView {...props} />;
    case 'WastageReport': return <WastageReportView {...props} />;
    case 'PurchaseOrderPO': return <PurchaseOrderView {...props} />;
    case 'PurchaseReportRO': return <PurchaseReportROView {...props} />;
    case 'RequisitionReportRO': return <RequisitionReportROView {...props} />;

    // View Dropdown Cases
    case 'OnlineOrder': return <OnlineOrderView {...props} />;
    case 'BillView': return <BillView {...props} />;
    case 'BillViewDelivery': return <BillView {...props} mode="delivery" />;
    case 'BranchBill': return <BranchBillView {...props} />;
    case 'PaymentMobile': return <PaymentMobileView {...props} />;
    case 'WalletRecharge': return <WalletRechargeView {...props} />;

    // Report Dropdown Cases
    case 'SaleSummary': return <SaleSummaryView {...props} />;
    case 'SaleReportBill': return <SaleReportBillView {...props} />;
    case 'SaleReportItem': return <SaleReportItemView {...props} />;
    case 'SaleReportItemSummary': return <SaleReportItemSummaryView {...props} />;
    case 'SaleTrashBill': return <SaleTrashBillView {...props} />;
    case 'SaleCancelledBill': return <SaleCancelledBillView {...props} />;
    case 'PurchaseReport': return <PurchaseReportView {...props} />;
    case 'StockReport': return <StockReportView {...props} />;
    case 'ItemStatement': return <ItemStatementReportView {...props} />;
    case 'Logbook': return <LogbookView {...props} />;
    case 'LedgerView': return <LedgerView {...props} />;
    case 'PaymentReportDB': return <DeliveryBoyPaymentReportView {...props} />;
    case 'CreditReport': return <CreditReportView {...props} />;
    case 'PaymentReminder': return <PaymentReminderView {...props} />;

    default: return <DashboardView {...props} />;
  }
}

// --- Dashboard View (Dense ERP Style) ---
function DashboardView({ stats, orders, products, setActiveTab }) {
  const revenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  }, [orders]);

  // Analytics: Payment Method Distribution
  const paymentStats = useMemo(() => {
    const counts = {};
    orders.forEach(o => {
      const method = o.payment_method || 'Unknown';
      counts[method] = (counts[method] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [orders]);

  // Analytics: Order Status Distribution
  const statusStats = useMemo(() => {
    const counts = {};
    orders.forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [orders]);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
        {[
          { label: 'Inventory', value: stats.products, icon: <Package size={18} />, color: 'bg-blue-600' },
          { label: 'Total Orders', value: stats.orders, icon: <ShoppingCart size={18} />, color: 'bg-emerald-600' },
          { label: 'Customer Base', value: stats.users, icon: <Users size={18} />, color: 'bg-purple-600' },
          { label: 'Total Sales', value: `₹${revenue.toLocaleString()}`, icon: <DollarSign size={18} />, color: 'bg-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={cn("p-2.5 rounded-lg text-white", stat.color)}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <h3 className="text-base font-black text-slate-800 tracking-tighter">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions Table & Charts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">Recent Business Transactions</h3>
              <button onClick={() => setActiveTab('Orders')} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest">View All</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Order #</th>
                    <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Mobile</th>
                    <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.slice(0, 8).map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2 text-[10px] font-black text-blue-700">#{order.order_number}</td>
                      <td className="px-3 py-2 text-[10px] font-bold text-slate-600">{order.user_mobile}</td>
                      <td className="px-3 py-2 text-[10px] font-black text-slate-800">₹{order.total_amount}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                        )}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[9px] font-medium text-slate-400">{new Date(order.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter mb-4">Payment Methods</h3>
              <div className="space-y-3">
                {paymentStats.map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                      <span className="text-slate-500">{stat.name}</span>
                      <span className="text-slate-800">{stat.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${(stat.count / (orders.length || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter mb-4">Order Status</h3>
              <div className="space-y-3">
                {statusStats.map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                      <span className="text-slate-500">{stat.name}</span>
                      <span className="text-slate-800">{stat.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          stat.name === 'delivered' ? 'bg-emerald-500' : 'bg-orange-500'
                        )} 
                        style={{ width: `${(stat.count / (orders.length || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Inventory & Quick Tools */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter mb-4">Inventory Health</h3>
            <div className="space-y-4 mb-6">
              {[
                { label: 'Low Stock', value: products.filter(p => p.stock > 0 && p.stock <= 5).length, color: 'bg-orange-500' },
                { label: 'Out of Stock', value: products.filter(p => p.stock <= 0).length, color: 'bg-red-500' },
                { label: 'In Stock', value: products.filter(p => p.stock > 5).length, color: 'bg-emerald-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-slate-800">{item.value}</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", item.color)} style={{ width: `${(item.value / (products.length || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Low Stock Items List */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Critical Stock Items</h4>
              {products.filter(p => p.stock <= 5).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <img src={p.image_url} alt="" className="w-6 h-6 object-contain" />
                    <span className="text-[9px] font-bold text-slate-700 line-clamp-1">{p.name}</span>
                  </div>
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded",
                    p.stock <= 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                  )}>{p.stock} STK</span>
                </div>
              ))}
              {products.filter(p => p.stock <= 5).length > 5 && (
                <button onClick={() => setActiveTab('Products')} className="w-full text-[8px] font-black text-blue-600 uppercase mt-2">View All Alerts</button>
              )}
            </div>
          </div>

          <div className="bg-blue-700 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group">
            <Zap className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-500" size={80} />
            <h3 className="text-[11px] font-black uppercase tracking-widest mb-3">ERP Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setActiveTab('Products')} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                <PlusCircle size={10} /> Add Item
              </button>
              <button onClick={() => setActiveTab('Orders')} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                <ShoppingCart size={10} /> New Order
              </button>
              <button 
                onClick={async () => {
                  if (orders.length > 0) {
                    const lastOrder = orders[0];
                    const items = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, { eq: { column: 'order_id', value: lastOrder.id } });
                    const commands = await handleERPAction(null, ACTION_TYPES.GENERATE_BILL, { order: lastOrder, items });
                    alert("Printer Command Generated:\n\n" + commands.data);
                  } else {
                    alert("No orders available to print!");
                  }
                }}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <Printer size={10} /> Bill Print
              </button>
              <button 
                onClick={() => handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.MAINTENANCE_EXPORT, { fileName: 'Inventory_Export' })}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <Download size={10} /> Export
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThermalReceipt({ orderData, cart, subTotal, discountAmount, deliveryChargeAmount, finalTotal, roundOff, appConfig }) {
  const date = new Date().toLocaleString();
  
  return (
    <div className="bg-white p-4 w-[300px] mx-auto text-slate-900 font-mono text-[11px] shadow-inner border border-slate-100">
      {/* Shop Header */}
      <div className="text-center space-y-1 mb-4 border-b border-dashed border-slate-300 pb-2">
        <h2 className="text-sm font-black uppercase tracking-tighter">{appConfig?.shop_name || 'NM MART'}</h2>
        <p className="text-[9px] leading-tight">{appConfig?.address || 'Near Railway Station, City'}</p>
        <p className="text-[9px]">Mob: {appConfig?.mobile || '9988776655'}</p>
        {appConfig?.gst_no && <p className="text-[9px]">GSTIN: {appConfig?.gst_no}</p>}
      </div>

      {/* Bill Info */}
      <div className="flex justify-between mb-3 text-[10px] font-bold">
        <span>Bill No: #ORD-{Date.now().toString().slice(-6)}</span>
        <span className="text-right">{date}</span>
      </div>

      {/* Items Table */}
      <div className="border-b border-dashed border-slate-300 mb-2">
        <div className="flex justify-between font-black mb-1 border-b border-slate-200 pb-1 uppercase text-[9px]">
          <span className="w-1/2">Item</span>
          <span className="w-1/6 text-center">Qty</span>
          <span className="w-1/3 text-right">Price</span>
        </div>
        <div className="space-y-1.5 py-1">
          {cart.map((item, idx) => (
            <div key={idx} className="flex justify-between leading-tight">
              <span className="w-1/2 uppercase">{item.name}</span>
              <span className="w-1/6 text-center">{item.quantity}</span>
              <span className="w-1/3 text-right">₹{(item.sale_rate * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-1 border-b border-dashed border-slate-300 pb-2 mb-2">
        <div className="flex justify-between">
          <span className="font-bold">Subtotal:</span>
          <span>₹{subTotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-blue-700">
            <span>Discount:</span>
            <span>-₹{discountAmount.toFixed(2)}</span>
          </div>
        )}
        {deliveryChargeAmount > 0 && (
          <div className="flex justify-between">
            <span>Delivery:</span>
            <span>+₹{deliveryChargeAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-slate-500 italic text-[9px]">
          <span>Round Off:</span>
          <span>{roundOff.toFixed(2)}</span>
        </div>
      </div>

      {/* Grand Total */}
      <div className="flex justify-between items-center mb-4 bg-slate-50 p-2 rounded">
        <span className="text-[12px] font-black uppercase">Grand Total:</span>
        <span className="text-lg font-black tracking-tighter">₹{finalTotal}</span>
      </div>

      {/* Footer */}
      <div className="text-center space-y-1">
        <p className="font-black uppercase tracking-widest text-[10px]">Thank You!</p>
        <p className="text-[8px] italic">Please visit again</p>
        <div className="pt-2">
          {/* Mock Barcode */}
          <div className="h-6 bg-slate-900 w-full rounded-sm opacity-20"></div>
          <p className="text-[7px] mt-1">Powered by NM Mart Panel</p>
        </div>
      </div>
    </div>
  );
}

function PurchaseView({ title, table, data, products, departments, fetchInitialData }) {
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
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search Bill No"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>From :</span>
                <input type="date" className="bg-white border border-slate-200 rounded px-2 py-1" />
                <span>To :</span>
                <input type="date" className="bg-white border border-slate-200 rounded px-2 py-1" />
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
                  <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase">Bill Date</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase">Bill No</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase">Party</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase">Department</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase text-right">Bill Amt</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-800 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length > 0 ? filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{item.bill_date}</td>
                    <td className="px-6 py-4 text-[11px] font-black text-slate-900 uppercase">{item.bill_no}</td>
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600 uppercase">{item.party_name}</td>
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600 uppercase">{item.department}</td>
                    <td className="px-6 py-4 text-[11px] font-black text-slate-900 text-right">₹{item.bill_amount}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }} className="text-blue-600 hover:underline font-black text-[10px] uppercase mr-3">Edit</button>
                      <button onClick={async () => {
                          // Immediate delete without confirmation
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
                      <td className="px-4 py-2 text-center font-black">₹{item.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#1E293B] text-white font-black text-[11px]">
                    <td colSpan="2" className="px-4 py-2 text-right uppercase">Total :</td>
                    <td className="px-4 py-2 text-center">{totalQty.toFixed(2)}</td>
                    <td colSpan="4"></td>
                    <td className="px-4 py-2 text-center">{totalGst.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">₹{subTotal.toFixed(2)}</td>
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
                className="bg-blue-600 text-white px-10 py-2 rounded-lg font-black uppercase tracking-widest text-[11px] shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={() => setShowForm(false)}
                className="bg-white border-2 border-blue-400 text-blue-500 px-10 py-2 rounded-lg font-black uppercase tracking-widest text-[11px] hover:bg-blue-50 transition-all"
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
                <span className="text-xl font-black">₹{finalBillAmt.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function POSView({ products, categories, fetchInitialData, appConfig, setActiveTab }) {
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', mob: '', add: '' });
  const [paymentMethod, setPaymentMethod] = useState('Online');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcode, setBarcode] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [billDiscount, setBillDiscount] = useState(0);
  const [deliveryChargePercent, setDeliveryChargePercent] = useState(0);
  const [flatDiscount, setFlatDiscount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef(null);

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.barcode && p.barcode.includes(searchTerm))
    ).slice(0, 10);
  }, [searchTerm, products]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setShowSearchDropdown(false);
  };

  const handleSerialClick = () => {
    if (searchTerm) {
      const product = products.find(p => p.name.toLowerCase() === searchTerm.toLowerCase() || p.barcode === searchTerm);
      if (product) setSelectedProduct(product);
      else alert("Product not found!");
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    // Immediate clear without confirmation
    setCart([]);
    setCustomerInfo({ name: '', mob: '', add: '', dob: '', doa: '', wallet: 0, points: 0 });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0) handleCheckout();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showReceipt) setShowReceipt(false);
        else setCart([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showReceipt]);

  const filteredProducts = products.filter(p => 
    (activeCategory === 'All' || p.category_id === activeCategory) && 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product) => {
    if (!product) return;
    if (product.stock <= 0) {
      alert("Item out of stock!");
      return;
    }
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert("Cannot add more than available stock!");
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter') {
      const product = products.find(p => p.barcode === barcode || p.hsn_code === barcode);
      if (product) {
        addToCart(product);
        setBarcode(''); // Clear after add
      } else {
        alert("Product not found with this barcode!");
      }
    }
  };

  const subTotal = cart.reduce((sum, item) => sum + (item.sale_rate * item.quantity), 0);
  const discountAmount = (subTotal * billDiscount) / 100;
  const deliveryChargeAmount = (subTotal * deliveryChargePercent) / 100;
  const finalTotal = Math.round(subTotal - discountAmount + deliveryChargeAmount - flatDiscount);
  const roundOff = (subTotal - discountAmount + deliveryChargeAmount - flatDiscount) - finalTotal;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    
    try {
      // 1. Create Order
      const orderData = {
        order_number: `POS-${Date.now()}`,
        user_id: customerInfo.mob || 'POS-CUST',
        customer_name: customerInfo.name || 'Walk-in Customer',
        user_mobile: customerInfo.mob || '',
        address: customerInfo.add || '',
        total_amount: finalTotal,
        payment_method: paymentMethod,
        payment_status: 'paid',
        order_status: 'completed',
        discount: discountAmount + flatDiscount,
        delivery_charge: deliveryChargeAmount
      };

      const orderRes = await handleERPAction(ERP_MODULES.ORDER_MASTER, ACTION_TYPES.INSERT, orderData);
      
      if (!orderRes.success) throw new Error(orderRes.error);

      // 2. Create Order Items
      const orderItems = cart.map(item => ({
        order_id: orderRes.data[0].id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        rate: item.sale_rate,
        total: item.sale_rate * item.quantity
      }));

      for (const item of orderItems) {
        await handleERPAction(ERP_MODULES.ORDER_ITEMS, ACTION_TYPES.INSERT, item);
        
        // 3. Update Stock
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await handleERPAction(ERP_MODULES.ITEM_MASTER, ACTION_TYPES.UPDATE, {
            id: product.id,
            stock: product.stock - item.quantity
          });
        }
      }

      setIsProcessing(false);
      setShowReceipt(true);
      fetchInitialData(); // Refresh stock in frontend
    } catch (error) {
      console.error("Checkout Error:", error);
      alert("Billing failed: " + error.message);
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-[calc(100vh-60px)] bg-[#A5D1E1] overflow-hidden -m-4">
      {/* LEFT SIDEBAR - Categories */}
      <div className="w-48 bg-[#D9E9F0] flex flex-col border-r border-slate-300">
        <div className="p-2 flex-1 overflow-y-auto">
          <div className="bg-[#1E293B] text-white text-[10px] p-2 rounded font-black mb-2 uppercase text-center truncate">
            {appConfig?.shop_name || 'NM MART'}
          </div>
          <div className="space-y-1">
            <button 
              onClick={() => setActiveCategory('All')}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded text-[11px] font-black uppercase shadow-sm transition-all",
                activeCategory === 'All' ? "bg-[#E11D48] text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              All Items
            </button>
            {(categories || []).map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded text-[11px] font-black uppercase shadow-sm transition-all",
                  activeCategory === cat.id ? "bg-[#E11D48] text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-2 space-y-2 border-t border-slate-300 bg-[#D9E9F0]">
          <button className="w-full bg-[#FBBF24] text-slate-900 p-2 rounded font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-md">
            <Zap size={14} /> Top Sale
          </button>
          <button className="w-full bg-[#1E293B] text-white p-2 rounded font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-md">
            <CheckCircle2 size={14} /> Favourite
          </button>
        </div>
      </div>

      {/* CENTER - Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-2 flex gap-2 bg-[#A5D1E1] relative">
          <div className="flex-1 relative">
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search Name (F1)" 
              className="w-full bg-white border-none rounded px-3 py-1.5 text-xs font-black text-black shadow-sm outline-none"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
            />
            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white shadow-xl rounded-b-lg mt-0.5 z-[100] border border-slate-200 overflow-hidden">
                {searchResults.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => handleProductSelect(p)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-slate-50 last:border-none flex justify-between items-center group"
                  >
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-800 group-hover:text-blue-700">{p.name}</span>
                      <span className="text-[9px] text-slate-500">Barcode: {p.barcode || 'N/A'}</span>
                    </div>
                    <span className="text-xs font-black text-red-600">₹{p.sale_rate}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input 
            type="text" 
            placeholder="Scan Barcode..." 
            className="w-48 bg-white border-none rounded px-3 py-1.5 text-xs font-black text-black shadow-sm outline-none"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleBarcodeScan}
            autoFocus
          />
          <button 
            onClick={handleSerialClick}
            className="bg-[#2563EB] text-white px-4 py-1.5 rounded text-xs font-black shadow-md whitespace-nowrap active:scale-95 transition-transform"
          >
            Serial
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 content-start">
          {filteredProducts.map(product => (
            <button 
              key={product.id}
              onClick={() => addToCart(product)}
              className={cn(
                "bg-white p-2 rounded border shadow-sm transition-all flex flex-col justify-between h-24 relative group",
                product.stock <= 5 ? "border-amber-400 bg-amber-50/30" : "border-slate-300",
                product.stock <= 0 && "opacity-50 grayscale cursor-not-allowed"
              )}
            >
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-slate-800 uppercase leading-tight text-center w-full px-1">
                  {product.name}
                </span>
                {product.stock <= 10 && (
                  <span className="text-[7px] font-black text-amber-600 uppercase mt-0.5">
                    Stock: {product.stock}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-black text-[#E11D48] self-end mt-auto">
                ₹{product.sale_rate}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bill Preview Modal */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-100 p-6 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col gap-4">
              <div className="overflow-y-auto max-h-[70vh] rounded-lg shadow-lg">
                <ThermalReceipt 
                  cart={cart}
                  subTotal={subTotal}
                  discountAmount={discountAmount}
                  deliveryChargeAmount={deliveryChargeAmount}
                  finalTotal={finalTotal}
                  roundOff={roundOff}
                  appConfig={appConfig}
                />
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={handlePrint} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700">
                  <Printer size={16} /> Print Receipt
                </button>
                <button onClick={() => { setShowReceipt(false); setCart([]); }} className="w-full bg-white text-slate-600 py-3 rounded-xl font-black uppercase text-xs border border-slate-200 hover:bg-slate-50">
                  Close & New Sale (Esc)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RIGHT SIDEBAR - Billing */}
      <div className="w-80 bg-white flex flex-col border-l border-slate-300">
        {/* Customer Header */}
        <div className="bg-[#1E293B] text-white p-3 space-y-2 relative">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Customer Name" 
              className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1 text-[10px] font-black placeholder-white/40 outline-none focus:bg-white/20"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="Mobile No" 
              className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-[10px] font-black placeholder-white/40 outline-none focus:bg-white/20"
              value={customerInfo.mob}
              onChange={(e) => setCustomerInfo({...customerInfo, mob: e.target.value})}
            />
          </div>
          <textarea 
            placeholder="Address" 
            className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-[10px] font-black placeholder-white/40 outline-none focus:bg-white/20 h-10 resize-none"
            value={customerInfo.add}
            onChange={(e) => setCustomerInfo({...customerInfo, add: e.target.value})}
          />
          <button className="absolute top-2 right-2 flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity">
            <div className="bg-[#E11D48] p-1 rounded-full shadow-lg border border-white/20">
              <Monitor size={10} />
            </div>
            <span className="text-[7px] font-black mt-0.5">Online</span>
          </button>
        </div>

        {/* Cart Table Header */}
        <div className="bg-gradient-to-r from-[#81E6D9] via-[#FEB2B2] to-[#9AE6B4] px-3 py-1.5 flex justify-between text-[10px] font-black uppercase">
          <span className="w-1/2">Item Name</span>
          <span className="w-1/4 text-center">Qty</span>
          <span className="w-1/4 text-right">Rate</span>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          {selectedProduct && (
            <div className="absolute inset-0 bg-slate-50 z-50 p-6 animate-in fade-in slide-in-from-right duration-300 overflow-y-auto">
              <div className="flex justify-between items-center mb-6 border-b-2 border-blue-500 pb-2">
                <h4 className="text-lg font-black text-blue-900 uppercase">Product Details (Large View)</h4>
                <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-red-100 rounded-full text-red-600 transition-colors"><X size={24}/></button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border-2 border-blue-100 shadow-sm">
                  <p className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-widest">Full Item Name</p>
                  <p className="text-xl font-black text-slate-900 uppercase leading-tight">{selectedProduct.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">MRP Rate</p>
                    <p className="text-2xl font-black text-slate-900">₹{selectedProduct.mrp}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-emerald-100 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Sale Rate</p>
                    <p className="text-2xl font-black text-emerald-700">₹{selectedProduct.sale_rate}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border-2 border-orange-100 shadow-sm">
                    <p className="text-[10px] font-black text-orange-600 uppercase mb-1">Purchase Rate</p>
                    <p className="text-xl font-black text-slate-900">₹{selectedProduct.purchase_rate || 0}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-purple-100 shadow-sm">
                    <p className="text-[10px] font-black text-purple-600 uppercase mb-1">GST / CESS</p>
                    <p className="text-xl font-black text-slate-900">{selectedProduct.gst || 0}% + {selectedProduct.cess || 0}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border-2 border-blue-100 shadow-sm">
                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Stock Available</p>
                    <p className="text-xl font-black text-slate-900">{selectedProduct.stock} Units</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-pink-100 shadow-sm">
                    <p className="text-[10px] font-black text-pink-600 uppercase mb-1">Max Discount</p>
                    <p className="text-xl font-black text-slate-900">{selectedProduct.discount_pct || 0}%</p>
                  </div>
                </div>

                <button 
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                  className="w-full bg-[#2563EB] text-white py-4 rounded-2xl font-black uppercase text-sm shadow-xl mt-6 flex items-center justify-center gap-3 hover:bg-blue-700 active:scale-95 transition-all"
                >
                  <ShoppingCart size={20} /> Add to Cart (Quick)
                </button>
              </div>
            </div>
          )}
          {cart.map((item, idx) => (
            <div key={idx} className="px-3 py-2 flex justify-between border-b border-slate-100 text-[10px] font-bold hover:bg-slate-50 group items-center">
              <div className="w-1/2 flex items-center gap-2">
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
                <span className="text-slate-800 uppercase leading-tight truncate">{item.name}</span>
              </div>
              <div className="w-1/4 flex items-center justify-center">
                <input 
                  type="number" 
                  value={item.quantity} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setCart(cart.map(c => c.id === item.id ? { ...c, quantity: val } : c));
                  }}
                  className="w-10 text-center bg-slate-100 rounded border-none p-1 font-black text-black" 
                />
              </div>
              <span className="w-1/4 text-right text-slate-900 font-black">₹{item.sale_rate * item.quantity}</span>
            </div>
          ))}
        </div>

        {/* Bill Summary */}
        <div className="p-3 border-t-2 border-slate-200 bg-slate-50 space-y-1.5">
          <div className="flex justify-between items-center text-[10px]">
            <div className="flex gap-1 items-center">
              <button className="bg-[#1E293B] text-white px-2 py-1 rounded text-[8px] font-black flex items-center gap-1 uppercase">
                <RefreshCw size={8} /> Clear
              </button>
              <button className="bg-white border border-emerald-500 text-emerald-600 px-2 py-1 rounded text-[8px] font-black flex items-center gap-1 uppercase">
                <Edit2 size={8} /> Edit
              </button>
              <button className="bg-[#1E293B] text-white px-2 py-1 rounded text-[8px] font-black uppercase">Payment</button>
            </div>
            <div className="text-right space-y-0.5">
              <div className="flex items-center justify-end gap-2">
                <span className="font-bold text-slate-500">% Bill Discount :</span>
                <input type="number" value={billDiscount} onChange={(e) => setBillDiscount(e.target.value)} className="w-8 h-4 bg-white border border-slate-300 rounded text-right px-0.5 text-[9px] font-black text-black" />
                <span className="w-12 font-black text-black">{discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Truck size={10} className="text-slate-400" />
                <span className="font-bold text-slate-500">Delivery charge :</span>
                <input type="number" value={deliveryChargePercent} onChange={(e) => setDeliveryChargePercent(e.target.value)} className="w-8 h-4 bg-white border border-slate-300 rounded text-right px-0.5 text-[9px] font-black text-black" />
                <span className="w-12 font-black text-black">0.00</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Truck size={10} className="text-slate-400" />
                <span className="font-bold text-slate-500">Delivery charge Amount :</span>
                <input type="number" className="w-16 h-4 bg-white border border-slate-300 rounded text-right px-0.5 text-[9px] font-black text-black" />
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="font-bold text-slate-500">% Flat Discount :</span>
                <input type="number" value={flatDiscount} onChange={(e) => setFlatDiscount(e.target.value)} className="w-16 h-4 bg-white border border-slate-300 rounded text-right px-0.5 text-[9px] font-black text-black" />
              </div>
              <div className="flex items-center justify-end gap-2 text-blue-600">
                <X size={10} />
                <span className="font-bold">Round Off :</span>
                <span className="w-16 font-black text-right">{roundOff.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-end pt-1">
            <button className="text-blue-600 text-[9px] font-black underline uppercase">Show summary</button>
            <div className="text-right">
              <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Bill Amount :</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">₹{finalTotal}</h3>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-white">
          <button 
            onClick={clearCart}
            className="bg-slate-800 text-white py-2 rounded font-black text-[9px] uppercase flex items-center justify-center gap-1 hover:bg-slate-900"
          >
            <RefreshCw size={10} /> Clear
          </button>
          <button 
            onClick={() => setActiveTab('Dashboard')}
            className="bg-emerald-600 text-white py-2 rounded font-black text-[9px] uppercase flex items-center justify-center gap-1 hover:bg-emerald-700"
          >
            <Edit2 size={10} /> Edit
          </button>
          <button 
            disabled={cart.length === 0 || isProcessing}
            onClick={() => handleCheckout('Online')}
            className="bg-[#2563EB] text-white py-2 rounded font-black text-[9px] uppercase flex items-center justify-center gap-1 hover:bg-blue-700 disabled:opacity-50"
          >
            <CreditCard size={10} /> Payment
          </button>
        </div>

        <button 
          disabled={cart.length === 0 || isProcessing}
          onClick={() => handleCheckout('CASH')}
          className="w-full bg-[#E11D48] text-white py-3 font-black text-xs uppercase shadow-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? 'Processing...' : <><Save size={16}/> Save & Print (F12)</>}
        </button>
      </div>
    </div>
  );
}

function NotificationsView({ notifications, fetchInitialData }) {
  const markAsRead = async (id) => {
    try {
      await handleERPAction(DB_SCHEMA.NOTIFICATIONS.table, ACTION_TYPES.UPDATE, { id, is_read: true });
      fetchInitialData();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">System Notifications</h3>
        <button 
          onClick={async () => {
            const unread = notifications.filter(n => !n.is_read);
            await Promise.all(unread.map(n => handleERPAction(DB_SCHEMA.NOTIFICATIONS.table, ACTION_TYPES.UPDATE, { id: n.id, is_read: true })));
            fetchInitialData();
          }}
          className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest"
        >
          Mark all as read
        </button>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
            <Bell size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No notifications found</p>
          </div>
        ) : notifications.map((n) => (
          <div key={n.id} className={cn(
            "bg-white p-4 rounded-xl border transition-all flex items-start gap-4",
            n.is_read ? "border-slate-100 opacity-60" : "border-blue-100 shadow-sm shadow-blue-50"
          )}>
            <div className={cn(
              "p-2 rounded-lg",
              n.type === 'low_stock' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
            )}>
              {n.type === 'low_stock' ? <Package size={16} /> : <Bell size={16} />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{n.title}</h4>
                <span className="text-[8px] font-bold text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[10px] font-bold text-slate-600 mt-1">{n.message}</p>
              {!n.is_read && (
                <button 
                  onClick={() => markAsRead(n.id)}
                  className="mt-3 text-[8px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
                >
                  <CheckCircle2 size={10} /> Mark as Read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Generic Master List View (Compact ERP Style) ---
function MasterListView({ title, table, bucket, fields, data, uploadImage, fetchInitialData, ...relatedData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Import Logic
  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls'; // Accept both CSV and Excel files
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        // Check if file is an image
        if (file.type.startsWith('image/')) {
          throw new Error("यह फ़ाइल इमेज है! इमेज अपलोड करने के लिए 'Create New' बटन पर क्लिक करें, फिर फॉर्म में इमेज फील्ड चुनें!");
        }

        // Create mapping from field labels to names
        const columnMapping = {};
        fields.forEach(f => {
          columnMapping[f.label] = f.name;
          columnMapping[f.name] = f.name; // also map actual name
        });
        
        const parsedData = await parseERPCSV(file, columnMapping);
        if (parsedData.length === 0) throw new Error("No data found in file");

        const res = await handleERPAction(table, ACTION_TYPES.BULK_UPSERT, parsedData);
        if (res.success) {
          alert(`Successfully imported ${parsedData.length} records!`);
          setTimeout(() => fetchInitialData(true), 1000);
        } else {
          throw new Error(res.error);
        }
      } catch (error) {
        console.error("Import Error:", error);
        alert(`Import Failed: ${error.message}`);
      }
    };
    input.click();
  };

  const filteredData = (data || []).filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      for (const field of fields) {
        if (field.type === 'image') {
          if (finalData[`${field.name}_file`]) {
            const { url, error: uploadError } = await uploadImage(finalData[`${field.name}_file`], bucket || 'category-images');
            if (uploadError) throw new Error(`Image Upload Failed: ${uploadError}`);
            if (url) {
              finalData[field.name] = url;
              delete finalData[`${field.name}_file`];
            }
          }
          
          // Fallback if image_url is still empty but required by DB (not-null constraint)
          if (!finalData[field.name]) {
            finalData[field.name] = 'https://via.placeholder.com/300?text=NM+MART';
          }
        }
      }

      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }

      if (res && !res.success) {
        throw new Error(`Database Error [Table: ${table}]: ${res.error}`);
      }

      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      
      // Force immediate refresh from server
      await fetchInitialData();
      
      alert(`${title.slice(0, -1)} saved successfully!`);
    } catch (error) {
      console.error("Form Submission Error:", error);
      alert(`Operation Failed!\n\nReason: ${error.message}\n\nPlease check your internet connection or database permissions.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Section matching Item Master style */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md">
            <GitBranch size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder={`Search ${title}...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-[10px] font-black focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400 text-slate-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={handleImportCSV}
              className="flex-1 md:flex-none bg-white text-blue-600 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-blue-50 transition-all border border-blue-600 shadow-sm"
            >
              <FileJson size={14} /> Import
            </button>
            <button 
              onClick={() => handleERPAction(table, ACTION_TYPES.MAINTENANCE_EXPORT, { fileName: `${title}_Export` })}
              className="flex-1 md:flex-none bg-white text-slate-700 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
            >
              <Download size={14} className="text-blue-600" /> Export
            </button>
            <button 
              onClick={() => { setEditingItem(null); setFormData({}); setShowForm(true); }}
              className="flex-1 md:flex-none bg-blue-700 text-white px-5 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:translate-y-[-1px] transition-all"
            >
              <Plus size={14} /> Create New
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-16">SNo.</th>
                {fields.map(f => (
                  <th key={f.name} className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">{f.label}</th>
                ))}
                <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length > 0 ? paginatedData.map((item, index) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-4 py-3 text-[10px] font-black text-slate-400">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  {fields.map(f => (
                    <td key={f.name} className="px-4 py-3">
                      {f.type === 'image' ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                          <img src={item[f.name]} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : f.type === 'boolean' ? (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                          item[f.name] ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                        )}>
                          {item[f.name] ? 'Active' : 'Inactive'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-700">{item[f.name]}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100 shadow-sm hover:shadow-md"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={async () => {
                          const field = 'is_active' in item ? 'is_active' : ('is_allowed' in item ? 'is_allowed' : null);
                          if (field) {
                            await handleERPAction(table, ACTION_TYPES.UPDATE, { id: item.id, [field]: !item[field] });
                            fetchInitialData();
                          }
                        }}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all border border-transparent hover:border-amber-100 shadow-sm hover:shadow-md"
                        title="Toggle"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={async () => {
                      // Immediate delete without confirmation
                      await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                      fetchInitialData();
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 shadow-sm hover:shadow-md"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={fields.length + 2} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Database size={32} />
                      <p className="text-[10px] font-black uppercase tracking-widest">No Records Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rows per page:</span>
              <select 
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[10px] font-black focus:ring-1 focus:ring-blue-500 transition-all"
              >
                {[5, 10, 20, 50].map(val => <option key={val} value={val}>{val}</option>)}
              </select>
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
            >
              <ChevronDown size={14} className="rotate-90" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                    currentPage === page ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
            >
              <ChevronDown size={14} className="-rotate-90" />
            </button>
          </div>
        </div>
      </div>


      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                      {title} [ {editingItem ? 'MODIFY' : 'NEW'} ]
                    </h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Enter details below to {editingItem ? 'update' : 'create'} record</p>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 hover:shadow-sm">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-5">
                  {fields.map(f => (
                    <div key={f.name} className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{f.label}</label>
                        {f.required && <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Required</span>}
                      </div>
                      
                      {f.type === 'image' ? (
                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors group relative overflow-hidden">
                          <input 
                            type="file" 
                            onChange={(e) => setFormData({ ...formData, [`${f.name}_file`]: e.target.files[0] })}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shadow-sm flex-shrink-0">
                            {(formData[`${f.name}_file`] || formData[f.name]) ? (
                              <img 
                                src={formData[`${f.name}_file`] ? URL.createObjectURL(formData[`${f.name}_file`]) : formData[f.name]} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                <ImageIcon size={24} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                              {formData[`${f.name}_file`]?.name || 'Choose Image File'}
                            </p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Click or drag to upload</p>
                          </div>
                          {(formData[`${f.name}_file`] || formData[f.name]) && (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({ ...formData, [f.name]: null, [`${f.name}_file`]: null });
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg z-20 hover:scale-110 transition-transform"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ) : f.type === 'select' ? (
                        <select 
                          value={formData[f.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-900 appearance-none shadow-sm"
                          required={f.required}
                        >
                          <option value="">Select {f.label}</option>
                          {f.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : f.type === 'boolean' ? (
                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, [f.name]: !formData[f.name] })}
                            className={cn(
                              "w-12 h-6 rounded-full transition-all relative shadow-inner",
                              formData[f.name] ? "bg-emerald-500" : "bg-slate-300"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                              formData[f.name] ? "left-7" : "left-1"
                            )} />
                          </button>
                          <div>
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{formData[f.name] ? 'ACTIVE' : 'INACTIVE'}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Visibility Status</p>
                          </div>
                        </div>
                      ) : (
                        <input 
                          type={f.type || 'text'}
                          placeholder={`Enter ${f.label.toLowerCase()}...`}
                          value={formData[f.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-900 shadow-sm placeholder-slate-300"
                          required={f.required}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-slate-100 text-slate-500 font-black py-3.5 rounded-xl uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all shadow-sm"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-700 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-2px] active:translate-y-[0px] transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                    {editingItem ? 'Update Record' : 'Confirm Entry'}
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

function DeliveryCustomerView({ title, table, data, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredData = (data || []).filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.mob_no?.includes(searchTerm)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }
      if (res && !res.success) throw new Error(res.error);
      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      await fetchInitialData();
      alert(`Customer saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-slate-100 rounded text-slate-900 border border-slate-200">
            <Users size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({}); setShowForm(true); }}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Create New
        </button>
      </div>

      {/* Table Section matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">SNo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Customer Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Mob No</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Address</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Gst No</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{index + 1}</td>
                    <td className="px-6 py-4 text-[11px] font-black text-slate-900 uppercase">{item.name}</td>
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{item.mob_no}</td>
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600 truncate max-w-[200px]">{item.address}</td>
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{item.gst_no}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-800 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-50 shadow-sm"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button 
                          onClick={async () => {
                        // Immediate delete without confirmation
                        await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                        fetchInitialData();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#E11D48] rounded text-[10px] font-black uppercase text-white hover:bg-red-700 shadow-sm"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-20 text-center">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">There are no records to display</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-white flex-shrink-0">
                <div className="p-1 bg-blue-600 rounded text-white">
                  <Users size={16} />
                </div>
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Customer [ {editingItem ? 'MODIFY' : 'NEW'} ]</h3>
              </div>

              <div className="p-6 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Customer Name</label>
                    <input 
                      type="text" 
                      value={formData.name || ''} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      className="w-full bg-white border-2 border-blue-100 rounded-lg px-4 py-2 text-xs font-black text-slate-900 focus:border-blue-400 outline-none shadow-sm" 
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Mob No</label>
                      <input 
                        type="text" 
                        value={formData.mob_no || ''} 
                        onChange={(e) => setFormData({ ...formData, mob_no: e.target.value })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Gst No</label>
                      <input 
                        type="text" 
                        value={formData.gst_no || ''} 
                        onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Address</label>
                    <textarea 
                      value={formData.address || ''} 
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm min-h-[80px]" 
                    />
                  </div>

                  <div className="flex justify-center gap-3 pt-4">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeliveryBoyView({ title, table, data, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredData = (data || []).filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }
      if (res && !res.success) throw new Error(res.error);
      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      await fetchInitialData();
      alert(`Delivery Boy saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-slate-100 rounded text-slate-900 border border-slate-200">
            <Truck size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({}); setShowForm(true); }}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Create New
        </button>
      </div>

      {/* Table Section matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Username</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 text-[11px] font-black text-slate-900 uppercase">{item.name}</td>
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-600 uppercase">{item.username}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-800 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-50 shadow-sm"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button 
                          onClick={async () => {
                        // Immediate delete without confirmation
                        await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                        fetchInitialData();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#E11D48] rounded text-[10px] font-black uppercase text-white hover:bg-red-700 shadow-sm"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">There are no records to display</p>
          </div>
        )}
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-white flex-shrink-0">
                <div className="p-1 bg-blue-600 rounded text-white">
                  <Truck size={16} />
                </div>
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Delivery boy [ {editingItem ? 'MODIFY' : 'NEW'} ]</h3>
              </div>

              <div className="p-6 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Delivery boy</label>
                      <input 
                        type="text" 
                        value={formData.name || ''} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        className="w-full bg-white border-2 border-blue-100 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm" 
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Username name</label>
                      <input 
                        type="text" 
                        value={formData.username || ''} 
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
                        placeholder="20"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Password</label>
                      <input 
                        type="password" 
                        value={formData.password || ''} 
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="flex justify-center gap-3 pt-4">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreditMasterView({ title, table, data, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ customers: [{ mobile: '', name: '', address: '' }] });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredData = (data || []).filter(item => 
    item.account_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }
      if (res && !res.success) throw new Error(res.error);
      setShowForm(false);
      setEditingItem(null);
      setFormData({ customers: [{ mobile: '', name: '', address: '' }] });
      await fetchInitialData();
      alert(`Credit record saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCustomerRow = () => {
    setFormData({
      ...formData,
      customers: [...formData.customers, { mobile: '', name: '', address: '' }]
    });
  };

  const removeCustomerRow = (index) => {
    const newCustomers = formData.customers.filter((_, i) => i !== index);
    setFormData({ ...formData, customers: newCustomers });
  };

  const updateCustomerField = (index, field, value) => {
    const newCustomers = formData.customers.map((c, i) => 
      i === index ? { ...c, [field]: value } : c
    );
    setFormData({ ...formData, customers: newCustomers });
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <button 
          onClick={() => { setEditingItem(null); setFormData({ customers: [{ mobile: '', name: '', address: '' }] }); setShowForm(true); }}
          className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-all"
        >
          New
        </button>
      </div>

      {/* Table Section matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-sm font-bold text-slate-800 border-r border-slate-200 w-24">ID</th>
                <th className="px-4 py-3 text-sm font-bold text-slate-800 border-r border-slate-200">Account Name</th>
                <th className="px-4 py-3 text-sm font-bold text-slate-800 border-r border-slate-200">Mobile No</th>
                <th className="px-4 py-3 text-sm font-bold text-slate-800">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-200">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-slate-800 font-bold border-r border-slate-200 uppercase">{item.account_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-200">{item.customers?.[0]?.mobile || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }} className="text-blue-600 font-bold hover:underline">Edit</button>
                      <button onClick={async () => {
                      // Immediate delete
                      await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                      fetchInitialData();
                      }} className="text-red-600 font-bold hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-slate-400 font-bold">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
                <h3 className="text-lg font-bold text-slate-800">Credit Master</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 ml-1">Account Name</label>
                      <input 
                        type="text" 
                        value={formData.account_name || ''} 
                        onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-black font-bold focus:border-blue-400 outline-none shadow-sm" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 ml-1">Cr days</label>
                      <input 
                        type="number" 
                        value={formData.cr_days || ''} 
                        onChange={(e) => setFormData({ ...formData, cr_days: e.target.value })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-black font-bold focus:border-blue-400 outline-none shadow-sm" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 ml-1">Cr Amount</label>
                      <input 
                        type="number" 
                        value={formData.cr_amount || ''} 
                        onChange={(e) => setFormData({ ...formData, cr_amount: e.target.value })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-black font-bold focus:border-blue-400 outline-none shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-base font-bold text-slate-800">Customer Details</h4>
                    <div className="space-y-4">
                      {formData.customers.map((customer, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mobile</label>
                            <input 
                              type="text" 
                              value={customer.mobile} 
                              onChange={(e) => updateCustomerField(index, 'mobile', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-black font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Name</label>
                            <input 
                              type="text" 
                              value={customer.name} 
                              onChange={(e) => updateCustomerField(index, 'name', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-black font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Address</label>
                            <input 
                              type="text" 
                              value={customer.address} 
                              onChange={(e) => updateCustomerField(index, 'address', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-black font-bold"
                            />
                          </div>
                          {formData.customers.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removeCustomerRow(index)}
                              className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-red-600 transition-all h-[38px]"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button" 
                      onClick={addCustomerRow}
                      className="bg-emerald-700 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-emerald-800 transition-all"
                    >
                      Add More
                    </button>
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-slate-100">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="bg-slate-500 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg hover:bg-slate-600 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserMasterView({ title, table, data, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ permissions: {} });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modules = [
    'Item Master', 'Item Unit Master', 'Item Group Master', 'Dish Type Master',
    'Dish Head Master', 'Floor Master', 'Table Master', 'Waiter Master',
    'Comment Master', 'Department Master', 'Account Master', 'Kitchen Master',
    'Place Order', 'Kot View'
  ];

  const filteredData = (data || []).filter(item => 
    item.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      alert("Please enter both Username and Password");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }
      if (res && !res.success) throw new Error(res.error);
      setShowForm(false);
      setEditingItem(null);
      setFormData({ permissions: {} });
      await fetchInitialData();
      alert(`User saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePermission = (module, type) => {
    const newPerms = { ...formData.permissions };
    if (!newPerms[module]) newPerms[module] = {};
    newPerms[module][type] = !newPerms[module][type];
    setFormData({ ...formData, permissions: newPerms });
  };

  const toggleAllInModule = (module, value) => {
    const newPerms = { ...formData.permissions };
    newPerms[module] = {
      view: value,
      create: value,
      edit: value,
      delete: value
    };
    setFormData({ ...formData, permissions: newPerms });
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-slate-100 rounded text-slate-900 border border-slate-200">
            <User size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({ permissions: {} }); setShowForm(true); }}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Create New
        </button>
      </div>

      {/* Table Section matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Username</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 text-[11px] font-black text-slate-900 uppercase">{item.username}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-800 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-50 shadow-sm"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button 
                          onClick={async () => {
                        // Immediate delete
                        await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                        fetchInitialData();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#E11D48] rounded text-[10px] font-black uppercase text-white hover:bg-red-700 shadow-sm"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">There are no records to display</p>
          </div>
        )}
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="p-1 bg-blue-600 rounded text-white">
                    <User size={16} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest">User [ {editingItem ? 'MODIFY' : 'NEW'} ]</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-700 transition-all">
                    Cancel
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">User Name</label>
                    <input 
                      type="text" 
                      value={formData.username || ''} 
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })} 
                      className="w-full bg-white border-2 border-blue-100 rounded-lg px-4 py-2 text-xs font-black text-slate-900 focus:border-blue-400 outline-none shadow-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Password</label>
                    <input 
                      type="password" 
                      value={formData.password || ''} 
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                      className="w-full bg-blue-50/50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-slate-900 focus:border-blue-400 outline-none shadow-sm" 
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-[11px] font-black text-slate-900 uppercase">Page Name</th>
                        <th className="px-4 py-3 text-[11px] font-black text-slate-900 uppercase text-center">
                          <div className="flex items-center justify-center gap-2">
                            <input type="checkbox" className="w-3 h-3" onChange={(e) => {
                              const checked = e.target.checked;
                              const newPerms = { ...formData.permissions };
                              modules.forEach(m => {
                                if (!newPerms[m]) newPerms[m] = {};
                                newPerms[m].view = checked;
                              });
                              setFormData({ ...formData, permissions: newPerms });
                            }} /> View
                          </div>
                        </th>
                        <th className="px-4 py-3 text-[11px] font-black text-slate-900 uppercase text-center">
                          <div className="flex items-center justify-center gap-2">
                            <input type="checkbox" className="w-3 h-3" onChange={(e) => {
                              const checked = e.target.checked;
                              const newPerms = { ...formData.permissions };
                              modules.forEach(m => {
                                if (!newPerms[m]) newPerms[m] = {};
                                newPerms[m].create = checked;
                              });
                              setFormData({ ...formData, permissions: newPerms });
                            }} /> Create
                          </div>
                        </th>
                        <th className="px-4 py-3 text-[11px] font-black text-slate-900 uppercase text-center">
                          <div className="flex items-center justify-center gap-2">
                            <input type="checkbox" className="w-3 h-3" onChange={(e) => {
                              const checked = e.target.checked;
                              const newPerms = { ...formData.permissions };
                              modules.forEach(m => {
                                if (!newPerms[m]) newPerms[m] = {};
                                newPerms[m].edit = checked;
                              });
                              setFormData({ ...formData, permissions: newPerms });
                            }} /> Edit
                          </div>
                        </th>
                        <th className="px-4 py-3 text-[11px] font-black text-slate-900 uppercase text-center">
                          <div className="flex items-center justify-center gap-2">
                            <input type="checkbox" className="w-3 h-3" onChange={(e) => {
                              const checked = e.target.checked;
                              const newPerms = { ...formData.permissions };
                              modules.forEach(m => {
                                if (!newPerms[m]) newPerms[m] = {};
                                newPerms[m].delete = checked;
                              });
                              setFormData({ ...formData, permissions: newPerms });
                            }} /> Delete
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modules.map((module) => (
                        <tr key={module} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 text-[11px] font-bold text-slate-700">{module}</td>
                          {['view', 'create', 'edit', 'delete'].map((type) => (
                            <td key={type} className="px-4 py-2.5 text-center">
                              <input 
                                type="checkbox" 
                                checked={formData.permissions?.[module]?.[type] || false}
                                onChange={() => togglePermission(module, type)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountsView({ title, table, data, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = (data || []).filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }

      if (res && !res.success) throw new Error(res.error);

      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      await fetchInitialData();
      alert(`${title} saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <User size={20} className="text-slate-800" />
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-400 text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({ account_type: 'Cash' }); setShowForm(true); }}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm"
        >
          <Plus size={18} /> Create New
        </button>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Party Name</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Address</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Mobile</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Email</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">GST No</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-4 text-[11px] font-black text-slate-900 uppercase">{item.name}</td>
                  <td className="px-4 py-4 text-[10px] font-bold text-slate-600 truncate max-w-[150px]">{item.address1}</td>
                  <td className="px-4 py-4 text-[10px] font-bold text-slate-600 text-center">{item.mobile || '0'}</td>
                  <td className="px-4 py-4 text-[10px] font-bold text-slate-600">{item.email}</td>
                  <td className="px-4 py-4 text-[10px] font-bold text-slate-600">{item.gst_no}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-800 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-50 shadow-sm"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button 
                        onClick={async () => {
                      // Immediate delete
                      await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                      fetchInitialData();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#E11D48] rounded text-[10px] font-black uppercase text-white hover:bg-red-700 shadow-sm"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">No accounts found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-white">
                <div className="p-1 bg-blue-600 rounded text-white"><GitBranch size={16} /></div>
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">
                  Account [ {editingItem ? 'MODIFY' : 'NEW'} ]
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Party Name</label>
                    <input 
                      type="text" 
                      value={formData.name || ''} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      className="w-full bg-white border-2 border-blue-100 rounded-lg px-4 py-2.5 text-xs font-black text-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all shadow-sm" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Address 1</label>
                    <input 
                      type="text" 
                      value={formData.address1 || ''} 
                      onChange={(e) => setFormData({ ...formData, address1: e.target.value })} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Address 2</label>
                    <input 
                      type="text" 
                      value={formData.address2 || ''} 
                      onChange={(e) => setFormData({ ...formData, address2: e.target.value })} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Pin Code</label>
                    <input 
                      type="text" 
                      value={formData.pincode || ''} 
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">GST No</label>
                    <input 
                      type="text" 
                      value={formData.gst_no || ''} 
                      onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Mobile No</label>
                    <input 
                      type="text" 
                      value={formData.mobile || ''} 
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Email</label>
                    <input 
                      type="email" 
                      value={formData.email || ''} 
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Account Type</label>
                    <select 
                      value={formData.account_type || 'Cash'} 
                      onChange={(e) => setFormData({ ...formData, account_type: e.target.value })} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-black text-black focus:border-blue-400 outline-none shadow-sm"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Wallet">Wallet</option>
                      <option value="Credit">Credit</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Save
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Cancel
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

function UnitView({ title, table, data, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = (data || []).filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }

      if (res && !res.success) throw new Error(res.error);

      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      await fetchInitialData();
      alert(`${title} saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <ShoppingCart size={20} className="text-slate-800" />
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-400 text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({}); setShowForm(true); }}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm"
        >
          <Plus size={18} /> Create New
        </button>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {paginatedData.length > 0 ? (
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">SNo</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Unit Name ▲</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 text-[10px] font-bold text-slate-600">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase">
                      {item.name}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-800 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button 
                          onClick={async () => {
                        // Immediate delete
                        await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                        fetchInitialData();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#E11D48] rounded text-[10px] font-black uppercase text-white hover:bg-red-700 transition-all shadow-sm"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">There are no records to display</p>
            </div>
          )}
        </div>
        
        {/* Pagination Footer matching Screenshot 1 */}
        <div className="bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-8">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500">Rows per page:</span>
            <select 
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white border-none text-[10px] font-bold focus:ring-0 cursor-pointer"
            >
              {[5, 10, 20, 50].map(val => <option key={val} value={val}>{val}</option>)}
            </select>
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            {(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length}
          </span>
          <div className="flex items-center gap-4 text-slate-300">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="hover:text-slate-600 disabled:opacity-30"><ChevronRight className="rotate-180 scale-150" size={14} /><ChevronRight className="rotate-180 -ml-2 scale-150" size={14} /></button>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="hover:text-slate-600 disabled:opacity-30"><ChevronRight className="rotate-180 scale-150" size={14} /></button>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="hover:text-slate-600 disabled:opacity-30"><ChevronRight size={14} className="scale-150" /></button>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className="hover:text-slate-600 disabled:opacity-30"><ChevronRight size={14} className="scale-150" /><ChevronRight size={14} className="-ml-2 scale-150" /></button>
          </div>
        </div>
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-white">
                <ShoppingCart size={18} className="text-blue-600" />
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">
                  Unit [ {editingItem ? 'MODIFY' : 'NEW'} ]
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Unit Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full bg-white border-2 border-blue-100 rounded-lg px-4 py-2.5 text-xs font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all shadow-sm" 
                    required 
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Save
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Cancel
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

function DepartmentView({ title, table, data, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = (data || []).filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }

      if (res && !res.success) throw new Error(res.error);

      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      await fetchInitialData();
      alert(`${title} saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <GitBranch size={20} className="text-slate-800" />
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-400 text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({}); setShowForm(true); }}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm"
        >
          <Plus size={18} /> Create New
        </button>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {paginatedData.length > 0 ? (
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">SNo</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Department Name</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 text-[10px] font-bold text-slate-600">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase">
                      {item.name}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-800 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button 
                          onClick={async () => {
                        // Immediate delete
                        await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                        fetchInitialData();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#E11D48] rounded text-[10px] font-black uppercase text-white hover:bg-red-700 transition-all shadow-sm"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">There are no records to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-white">
                <GitBranch size={18} className="text-blue-600" />
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">
                  Department [ {editingItem ? 'MODIFY' : 'NEW'} ]
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Department Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full bg-white border-2 border-blue-100 rounded-lg px-4 py-2.5 text-xs font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all shadow-sm" 
                    required 
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Save
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Cancel
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

function BrandView({ title, table, bucket, fields, data, uploadImage, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = (data || []).filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      if (finalData.image_file) {
        const { url, error: uploadError } = await uploadImage(finalData.image_file, bucket || 'brand-images');
        if (uploadError) throw new Error(uploadError);
        if (url) {
          finalData.logo_url = url;
          delete finalData.image_file;
        }
      }

      // Fallback for not-null constraint
      if (!finalData.logo_url) {
        finalData.logo_url = 'https://via.placeholder.com/300?text=BRAND+LOGO';
      }

      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }

      if (res && !res.success) throw new Error(res.error);

      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      await fetchInitialData();
      alert(`${title} saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Tag size={20} className="text-slate-800" />
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-400 text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({}); setShowForm(true); }}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm"
        >
          <Plus size={18} /> Create New
        </button>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">SNo</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Brand Name</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Picture</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 text-[10px] font-bold text-slate-600">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  <td className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase">
                    {item.name}
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-12 h-12 mx-auto rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={item.logo_url} alt="" className="w-full h-full object-contain p-1" />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-800 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button 
                        onClick={async () => {
                      // Immediate delete
                      await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                      fetchInitialData();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#E11D48] rounded text-[10px] font-black uppercase text-white hover:bg-red-700 transition-all shadow-sm"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-white">
                <Tag size={18} className="text-blue-600" />
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">
                  Brand [ {editingItem ? 'MODIFY' : 'NEW'} ]
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Brand Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full bg-white border-2 border-slate-100 rounded-lg px-4 py-2.5 text-xs font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all shadow-sm" 
                    required 
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input 
                      type="file" 
                      id="brand-upload"
                      onChange={(e) => setFormData({ ...formData, image_file: e.target.files[0] })}
                      className="hidden"
                    />
                    <button 
                      type="button"
                      onClick={() => document.getElementById('brand-upload').click()}
                      className="bg-white border border-slate-800 px-3 py-1 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-100"
                    >
                      Choose File
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 truncate">
                      {formData.image_file?.name || 'No file chosen'}
                    </span>
                  </div>
                  <button 
                    type="button"
                    className="bg-white border border-slate-800 px-4 py-1 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-100"
                  >
                    Upload
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Save
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Cancel
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

function SubCategoryView({ title, table, bucket, fields, data, categories, uploadImage, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = (data || []).filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      if (finalData.image_file) {
        const { url, error: uploadError } = await uploadImage(finalData.image_file, bucket || 'category-images');
        if (uploadError) throw new Error(uploadError);
        if (url) {
          finalData.image_url = url;
          delete finalData.image_file;
        }
      }

      // Fallback for not-null constraint
      if (!finalData.image_url) {
        finalData.image_url = 'https://via.placeholder.com/300?text=NM+MART';
      }

      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }

      if (res && !res.success) throw new Error(res.error);

      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      await fetchInitialData();
      alert(`${title} saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <GitBranch size={20} className="text-slate-800" />
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-400 text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({}); setShowForm(true); }}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm"
        >
          <Plus size={18} /> Create New
        </button>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">ID</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Head</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Type</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Picture</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((item, index) => {
                const parentCat = categories.find(c => c.id === item.category_id);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4 text-[10px] font-bold text-slate-600">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase">
                      {item.name}
                    </td>
                    <td className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase">
                      {parentCat?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-12 h-12 mx-auto rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-800 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button 
                          onClick={async () => {
                        // Immediate delete
                        await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                        fetchInitialData();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#E11D48] rounded text-[10px] font-black uppercase text-white hover:bg-red-700 transition-all shadow-sm"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-white">
                <GitBranch size={18} className="text-blue-600" />
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">
                  Sub-Category [ {editingItem ? 'MODIFY' : 'NEW'} ]
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Sub-Category Name</label>
                    <input 
                      type="text" 
                      value={formData.name || ''} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      className="w-full bg-white border-2 border-blue-100 rounded-lg px-4 py-2.5 text-xs font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all shadow-sm" 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Main Category Name</label>
                    <select 
                      value={formData.category_id || ''} 
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} 
                      className="w-full bg-white border-2 border-slate-100 rounded-lg px-4 py-2.5 text-xs font-black text-slate-900 focus:border-blue-400 outline-none transition-all shadow-sm"
                      required
                    >
                      <option value="">Select Main Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input 
                      type="file" 
                      id="sub-cat-upload"
                      onChange={(e) => setFormData({ ...formData, image_file: e.target.files[0] })}
                      className="hidden"
                    />
                    <button 
                      type="button"
                      onClick={() => document.getElementById('sub-cat-upload').click()}
                      className="bg-white border border-slate-800 px-3 py-1 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-100"
                    >
                      Choose File
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 truncate">
                      {formData.image_file?.name || 'No file chosen'}
                    </span>
                  </div>
                  <button 
                    type="button"
                    className="bg-white border border-slate-800 px-4 py-1 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-100"
                  >
                    Upload
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Save
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Cancel
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

function MainCategoryView({ title, table, bucket, fields, data, uploadImage, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = (data || []).filter(item => 
    Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      if (finalData.image_file) {
        const { url, error: uploadError } = await uploadImage(finalData.image_file, bucket || 'category-images');
        if (uploadError) throw new Error(uploadError);
        if (url) {
          finalData.image_url = url;
          delete finalData.image_file;
        }
      }

      // Fallback for not-null constraint
      if (!finalData.image_url) {
        finalData.image_url = 'https://via.placeholder.com/300?text=NM+MART';
      }

      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }

      if (res && !res.success) throw new Error(res.error);

      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      await fetchInitialData();
      alert(`${title} saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <ShoppingBag size={20} className="text-slate-800" />
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-400 text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({}); setShowForm(true); }}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm"
        >
          <Plus size={18} /> Create New
        </button>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">SNo</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Name</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Picture</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 text-[10px] font-bold text-slate-600">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  <td className="px-4 py-4 text-[10px] font-black text-slate-800">
                    {item.name}
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-12 h-12 mx-auto rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-800 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-50 transition-all shadow-sm"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button 
                        onClick={async () => {
                          // Immediate delete
                          await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                          fetchInitialData();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#E11D48] rounded text-[10px] font-black uppercase text-white hover:bg-red-700 transition-all shadow-sm"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-white">
                <ShoppingBag size={18} className="text-blue-600" />
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">
                  Main Category [ {editingItem ? 'MODIFY' : 'NEW'} ]
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Category Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full bg-white border-2 border-blue-100 rounded-lg px-4 py-2.5 text-xs font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all shadow-sm" 
                    required 
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input 
                      type="file" 
                      id="main-cat-upload"
                      onChange={(e) => setFormData({ ...formData, image_file: e.target.files[0] })}
                      className="hidden"
                    />
                    <button 
                      type="button"
                      onClick={() => document.getElementById('main-cat-upload').click()}
                      className="bg-white border border-slate-800 px-3 py-1 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-100"
                    >
                      Choose File
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 truncate">
                      {formData.image_file?.name || 'No file chosen'}
                    </span>
                  </div>
                  <button 
                    type="button"
                    className="bg-white border border-slate-800 px-4 py-1 rounded text-[10px] font-black uppercase text-slate-800 hover:bg-slate-100"
                  >
                    Upload
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Save
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
                  >
                    Cancel
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

// --- Specific Views (Compact ERP Style) ---
function AppConfigView({ appConfig, setAppConfig, fetchInitialData }) {
  const [formData, setFormData] = useState(appConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => { setFormData(appConfig); }, [appConfig]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const correctPin = appConfig?.security_pin || '1234';
    if (password === correctPin) {
      setIsVerified(true);
    } else {
      alert("Incorrect Password!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await handleERPAction(DB_SCHEMA.APP_CONFIG.table, ACTION_TYPES.BULK_UPSERT, [{ id: 'default', ...formData }]);
      if (res && !res.success) {
        throw new Error(`Database Error [AppConfig]: ${res.error}`);
      }
      alert("Settings Updated Successfully!");
      fetchInitialData();
    } catch (error) {
      console.error("AppConfig Update Error:", error);
      alert(`Update Failed!\n\nReason: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center pt-20">
        <form onSubmit={handlePasswordSubmit} className="flex items-center gap-4 bg-white p-8 rounded-xl shadow-sm border border-slate-100">
          <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Password :</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-64 border-2 border-blue-200 rounded-lg px-4 py-1.5 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all font-bold"
            autoFocus
          />
          <button 
            type="submit"
            className="bg-[#1e293b] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-md"
          >
            Submit
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
        <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md">
          <Settings size={20} />
        </div>
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Global ERP Configuration</h3>
          <p className="text-slate-800 font-black text-[8px] uppercase tracking-widest">Master Store Controls</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { label: 'Official Store Name', name: 'store_name', type: 'text' },
            { label: 'Standard Delivery Msg', name: 'delivery_time_msg', type: 'text' },
            { label: 'Free Delivery Threshold', name: 'min_order_free_delivery', type: 'number' },
            { label: 'Base Delivery Fee', name: 'delivery_charge', type: 'number' },
            { label: 'Order Handling Fee', name: 'handling_charge', type: 'number' },
            { label: 'Reward Cashback (%)', name: 'cashback_percentage', type: 'number' },
            { label: 'Security Admin PIN', name: 'security_pin', type: 'text' },
          ].map(f => (
            <div key={f.name} className="space-y-1">
              <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest ml-1">{f.label}</label>
              <input 
                type={f.type}
                value={formData[f.name] || ''}
                onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-black focus:ring-1 focus:ring-blue-500 transition-all text-slate-900"
              />
            </div>
          ))}
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-slate-800 text-white font-black py-3 rounded-xl uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-3 hover:translate-y-[-1px] transition-all"
        >
          {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          Apply Global Settings
        </button>
      </form>
    </div>
  );
}

function ProductsView({ products, categories, brands, subcategories, filter, uploadImage, fetchInitialData }) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (filter === 'low_stock') {
      list = list.filter(p => p.stock <= 5);
    }
    return list.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.hsn_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, filter, searchTerm]);

  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        setLoading(true);
        // EXACT mapping of your Excel headers to Database fields
        const columnMapping = {
          'Item Name': 'name',
          'BARCODE': 'barcode',
          'HSNCODE': 'hsn_code',
          'MRP': 'mrp',
          'SALE RATE': 'sale_rate',
          'PURC RATE': 'purchase_rate',
          'GST%': 'gst_percent',
          'CESS%': 'cess_percent',
          'Closing': 'stock',
          'MinQty': 'min_qty',
          'Dis %': 'discount_percent',
          'Basic Sale Price': 'basic_sale_price',
          'Size': 'size',
          'Colour': 'color',
          'Counter': 'counter_name',
          'MAIN CATEGORY': 'category_name',
          'SUBC ATEGORY': 'subcategory_name',
          'Brand name': 'brand_name',
          'Unit': 'unit_name'
        };
        
        const parsedData = await parseERPCSV(file, columnMapping);
        if (!parsedData || parsedData.length === 0) throw new Error("No data found in file");

        // --- STEP 1: AUTOMATIC MASTER UPDATE (BY NAME) ---
        const uniqueCats = [...new Set(parsedData.map(item => item.category_name).filter(Boolean))];
        const uniqueSubCats = [...new Set(parsedData.map(item => item.subcategory_name).filter(Boolean))];
        const uniqueBrands = [...new Set(parsedData.map(item => item.brand_name).filter(Boolean))];
        const uniqueUnits = [...new Set(parsedData.map(item => item.unit_name).filter(Boolean))];

        // Ensure these exist in Master Tables (using name as conflict key)
        if (uniqueCats.length > 0) await dbSync.upsert(DB_SCHEMA.CATEGORIES.table, uniqueCats.map(name => ({ name, is_active: true })));
        if (uniqueSubCats.length > 0) await dbSync.upsert(DB_SCHEMA.SUBCATEGORIES.table, uniqueSubCats.map(name => ({ name, is_active: true })));
        if (uniqueBrands.length > 0) await dbSync.upsert(DB_SCHEMA.BRANDS.table, uniqueBrands.map(name => ({ name, is_active: true })));
        if (uniqueUnits.length > 0) await dbSync.upsert(DB_SCHEMA.UNITS.table, uniqueUnits.map(name => ({ name, is_active: true })));

        // --- STEP 2: FETCH FRESH IDS FOR LINKING ---
        const [dbCats, dbSubCats, dbBrands, dbUnits] = await Promise.all([
          dbSync.fetch(DB_SCHEMA.CATEGORIES.table),
          dbSync.fetch(DB_SCHEMA.SUBCATEGORIES.table),
          dbSync.fetch(DB_SCHEMA.BRANDS.table),
          dbSync.fetch(DB_SCHEMA.UNITS.table)
        ]);

        const catMap = Object.fromEntries(dbCats.map(c => [c.name.toLowerCase().trim(), c.id]));
        const subCatMap = Object.fromEntries(dbSubCats.map(s => [s.name.toLowerCase().trim(), s.id]));
        const brandMap = Object.fromEntries(dbBrands.map(b => [b.name.toLowerCase().trim(), b.id]));
        const unitMap = Object.fromEntries(dbUnits.map(u => [u.name.toLowerCase().trim(), u.id]));

        // --- STEP 3: PREPARE PRODUCTS WITH FULL CONSISTENCY ---
        const productsToUpload = parsedData.map(item => {
          const cName = item.category_name?.toLowerCase().trim();
          const sName = item.subcategory_name?.toLowerCase().trim();
          const bName = item.brand_name?.toLowerCase().trim();
          const uName = item.unit_name?.toLowerCase().trim();

          return {
            ...item,
            // IDs for dropdowns and linking - Matching your EXACT Supabase Schema
            category_id: cName ? catMap[cName] : null,
            sub_category_id: sName ? subCatMap[sName] : null, // Fixed: Schema uses sub_category_id
            brand_id: bName ? brandMap[bName] : null,
            unit_id: uName ? unitMap[uName] : null,
            // Direct names for Reports (Backup)
            category: item.category_name,
            subcategory: item.subcategory_name,
            brand: item.brand_name,
            unit: item.unit_name
          };
        });

        // --- STEP 4: BULK UPLOAD PRODUCTS ---
        await dbSync.upsert(DB_SCHEMA.PRODUCTS.table, productsToUpload);
        
        alert(`SUCCESS! ${productsToUpload.length} items imported.\nCategories, Brands, and Reports are now fully synchronized.`);
        
        // --- STEP 5: ABSOLUTE GLOBAL REFRESH ---
        window.location.reload(); 
      } catch (error) {
        console.error("Import Error:", error);
        alert(`Import Failed: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      
      if (finalData.main_image_file) {
        const { url, error: uploadError } = await uploadImage(finalData.main_image_file, 'product-images');
        if (uploadError) throw new Error(`Product Image Upload Failed: ${uploadError}`);
        if (url) {
          finalData.image_url = url;
          delete finalData.main_image_file;
        }
      }

      // Fallback for not-null constraint on image_url
      if (!finalData.image_url) {
        finalData.image_url = 'https://via.placeholder.com/300?text=PRODUCT+IMAGE';
      }

      let res;
      if (editingProduct) {
        res = await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.UPDATE, { id: editingProduct.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.INSERT, finalData);
      }

      if (res && !res.success) {
        throw new Error(`Database Error: ${res.error}`);
      }

      setShowForm(false);
      setEditingProduct(null);
      setFormData({});
      fetchInitialData();
      alert("Product saved successfully!");
    } catch (error) {
      console.error("Product Save Error:", error);
      alert(`Product Operation Failed!\n\nReason: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-lg text-slate-900 border border-slate-100">
            <GitBranch size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Item Master</h2>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 placeholder-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleImportCSV}
            className="flex-1 md:flex-none bg-white text-blue-600 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-50 transition-all border border-blue-600 shadow-sm"
          >
            <FileJson size={14} /> IMPORT ITEM
          </button>
          <button 
            onClick={() => { setEditingProduct(null); setFormData({ sale_rate: 0, mrp: 0, purchase_rate: 0, gst: 0, cess: 0, discount_pct: 0, is_favourite: 'No', is_discountable: 'Yes', is_active: true }); setShowForm(true); }}
            className="flex-1 md:flex-none bg-white text-blue-600 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-50 transition-all border border-blue-600 shadow-sm"
          >
            <Plus size={16} /> Create New
          </button>
        </div>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">SNo</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Name / Category</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Barcode / HSN</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Brand / Counter</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Pricing (₹)</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Tax / Disc</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Stock / Specs</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Picture</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((product, idx) => (
                <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-4 py-3 text-[10px] font-bold text-slate-500">
                    {(currentPage - 1) * rowsPerPage + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter leading-none">{product.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
                      {product.category_name || 'No Category'} {product.subcategory_name ? `/ ${product.subcategory_name}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="text-[10px] font-bold text-slate-600">{product.barcode || '-'}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">HSN: {product.hsn_code || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase">{product.brand_name || '-'}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{product.counter_name || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-blue-700">Sale: ₹{product.sale_rate}</span>
                      <span className="text-[8px] text-slate-400 line-through font-bold">MRP: ₹{product.mrp}</span>
                      <span className="text-[8px] text-slate-500 font-bold">Purc: ₹{product.purchase_rate || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">
                        {product.discount_percent || 0}% OFF
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase">GST: {product.gst_percent || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "text-[10px] font-black",
                        (product.stock || 0) <= 5 ? "text-red-600" : "text-green-600"
                      )}>
                        Stock: {product.stock || 0}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">
                        {product.size ? `Size: ${product.size}` : ''} {product.color ? `| ${product.color}` : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="w-10 h-10 mx-auto bg-slate-50 rounded-lg border border-slate-200 overflow-hidden p-1">
                      <img src={product.image_url} alt="" className="w-full h-full object-contain" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => { setEditingProduct(product); setFormData(product); setShowForm(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={async () => {
                      // Immediate delete without confirmation
                      await handleERPAction(DB_SCHEMA.PRODUCTS.table, ACTION_TYPES.DELETE, { id: product.id });
                      fetchInitialData();
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rows per page:</span>
              <select 
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[10px] font-black focus:ring-1 focus:ring-blue-500 transition-all"
              >
                {[5, 10, 20, 50].map(val => <option key={val} value={val}>{val}</option>)}
              </select>
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredProducts.length)} of {filteredProducts.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
            >
              <ChevronDown size={14} className="rotate-90" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                    currentPage === page ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
            >
              <ChevronDown size={14} className="-rotate-90" />
            </button>
          </div>
        </div>
      </div>


      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border-t-4 border-blue-600"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/30 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <GitBranch size={18} className="text-blue-700" />
                  <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">
                    Item [ {editingProduct ? 'MODIFY' : 'NEW'} ]
                  </h3>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-white rounded-lg border border-slate-200 shadow-sm bg-white">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Row 1: Item Name, Barcode, HSN */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-6 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Item Name</label>
                      <input 
                        type="text" 
                        value={formData.name || ''} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        className="w-full bg-slate-50 border-2 border-blue-100 rounded-lg px-4 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                        required 
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Barcode</label>
                        <button type="button" onClick={() => setFormData({...formData, barcode: Math.random().toString().slice(2, 12)})} className="text-[9px] font-bold text-blue-600 hover:underline">Generate code</button>
                      </div>
                      <input 
                        type="text" 
                        value={formData.barcode || ''} 
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">HSN Code</label>
                      <input 
                        type="text" 
                        value={formData.hsn_code || ''} 
                        onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  {/* Row 2: Group, Sub Category, Brand, Unit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 border-b border-slate-100 pb-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Item Group Name</label>
                      <select value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="">NM MART</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Sub Category Name</label>
                      <select value={formData.subcategory || ''} onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="">Chocolate</option>
                        {subcategories?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Brand Name</label>
                      <select value={formData.brand || ''} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="">NESTLE</option>
                        {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Unit Name</label>
                      <select value={formData.unit || ''} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="NA">NA</option>
                        <option value="1 pcs">1 pcs</option>
                        <option value="1 kg">1 kg</option>
                        <option value="1 ltr">1 ltr</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Sale Rate, MRP, Purchase Rate, GST, Cess, Discount */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Sale Rate</label>
                      <input type="number" value={formData.sale_rate || 0} onChange={(e) => setFormData({ ...formData, sale_rate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Mrp</label>
                      <input type="number" value={formData.mrp || 0} onChange={(e) => setFormData({ ...formData, mrp: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Purchase Rate</label>
                      <input type="number" value={formData.purchase_rate || 0} onChange={(e) => setFormData({ ...formData, purchase_rate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Basic Sale Price</label>
                      <input type="number" value={formData.basic_sale_price || 0} onChange={(e) => setFormData({ ...formData, basic_sale_price: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Gst %</label>
                      <input type="number" value={formData.gst_percent || 0} onChange={(e) => setFormData({ ...formData, gst_percent: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Cess %</label>
                      <input type="number" value={formData.cess_percent || 0} onChange={(e) => setFormData({ ...formData, cess_percent: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                  </div>

                  {/* Row 4: Opening Stock, Favourite, Discountable, Min Qty, Disc % */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Opening Stock</label>
                      <input type="number" value={formData.stock || 0} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Min Qty</label>
                      <input type="number" value={formData.min_qty || 0} onChange={(e) => setFormData({ ...formData, min_qty: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Discount %</label>
                      <input type="number" value={formData.discount_percent || 0} onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Is favourite</label>
                      <select value={formData.is_favourite || 'No'} onChange={(e) => setFormData({ ...formData, is_favourite: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Is Discountable</label>
                      <select value={formData.is_discountable || 'Yes'} onChange={(e) => setFormData({ ...formData, is_discountable: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none">
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 5: Size, Colour, Counter, Category Name, Subcat Name, Brand Name */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Size</label>
                      <input type="text" value={formData.size || ''} onChange={(e) => setFormData({ ...formData, size: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Colour</label>
                      <input type="text" value={formData.color || ''} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Counter</label>
                      <input type="text" value={formData.counter_name || ''} onChange={(e) => setFormData({ ...formData, counter_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Category Name</label>
                      <input type="text" value={formData.category_name || ''} onChange={(e) => setFormData({ ...formData, category_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Subcategory Name</label>
                      <input type="text" value={formData.subcategory_name || ''} onChange={(e) => setFormData({ ...formData, subcategory_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Brand Name</label>
                      <input type="text" value={formData.brand_name || ''} onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                  </div>

                  {/* Row 5: Item Description */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Item Description</label>
                    <input 
                      type="text" 
                      value={formData.description || ''} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-black text-slate-900 focus:border-blue-500 outline-none transition-all" 
                    />
                    <p className="text-[9px] font-bold text-slate-400 ml-1">{formData.description?.length || 0}/250 Characters</p>
                  </div>

                  {/* Row 6: Image Upload & Preview */}
                  <div className="flex flex-col sm:flex-row items-end gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex-1 space-y-1.5 w-full">
                      <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Picture</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          id="product-image-upload"
                          onChange={(e) => setFormData({ ...formData, main_image_file: e.target.files[0] })}
                          className="hidden"
                        />
                        <button 
                          type="button"
                          onClick={() => document.getElementById('product-image-upload').click()}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] hover:bg-blue-700 transition-all shadow-md"
                        >
                          Choose File
                        </button>
                        <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">
                          {formData.main_image_file?.name || 'No file chosen'}
                        </span>
                      </div>
                    </div>
                    { (formData.main_image_file || formData.image_url) && (
                      <div className="w-20 h-20 rounded-lg border-2 border-white shadow-md overflow-hidden bg-white">
                        <img src={formData.main_image_file ? URL.createObjectURL(formData.main_image_file) : formData.image_url} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={async () => {
                        if (formData.main_image_file) {
                          const { url, error } = await uploadImage(formData.main_image_file, 'product-images');
                          if (url) {
                            setFormData({ ...formData, image_url: url, main_image_file: null });
                            alert("Image Uploaded Successfully!");
                          } else {
                            alert("Upload Failed: " + error);
                          }
                        } else {
                          alert("Please choose a file first");
                        }
                      }}
                      className="bg-slate-100 text-slate-800 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] flex items-center gap-2 border border-slate-200 hover:bg-slate-200"
                    >
                      <Upload size={14} /> Upload
                    </button>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center gap-3 py-1">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Status:</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        formData.is_active ? "bg-blue-600" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                        formData.is_active ? "left-5.5" : "left-0.5"
                      )} />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      {formData.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>

                  {/* Form Actions */}
                  <div className="pt-4 flex gap-3 pb-4">
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="flex-1 bg-slate-100 text-slate-600 font-black py-3 rounded-xl uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                    >
                      Discard
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-700 text-white font-black py-3 rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-blue-200 flex items-center justify-center gap-2 hover:translate-y-[-1px] transition-all"
                    >
                      {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                      {editingProduct ? 'Apply Changes' : 'Confirm Entry'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PurchaseReportView({ purchases, departments, fetchInitialData }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [party, setParty] = useState('All');
  const [searchItem, setSearchItem] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShow = async () => {
    setIsGenerating(true);
    try {
      // 1. Filter purchases based on dates and party
      const filteredPurchases = (purchases || []).filter(p => {
        const pDate = new Date(p.bill_date).toISOString().split('T')[0];
        const matchesDate = pDate >= fromDate && pDate <= toDate;
        const matchesParty = party === 'All' || p.party_name === party;
        return matchesDate && matchesParty;
      });

      const purchaseIds = filteredPurchases.map(p => p.id);
      if (purchaseIds.length === 0) {
        setFilteredData([]);
        return;
      }

      // 2. Fetch all items for these purchases
      const allItems = await dbSync.fetch(DB_SCHEMA.PURCHASE_ITEMS.table, {
        in: { column: 'purchase_id', values: purchaseIds }
      });

      // 3. Map items with purchase details
      const reportData = allItems.map(item => {
        const purchase = filteredPurchases.find(p => p.id === item.purchase_id);
        const dept = departments.find(d => d.id === purchase.department_id);
        return {
          ...item,
          dept_name: dept?.name || 'N/A',
          bill_no: purchase.bill_no,
          bill_date: purchase.bill_date,
          party_name: purchase.party_name,
          bill_total: purchase.total_amount
        };
      }).filter(item => 
        !searchItem || item.product_name?.toLowerCase().includes(searchItem.toLowerCase())
      );

      setFilteredData(reportData);
    } catch (error) {
      console.error("Error generating purchase report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (filteredData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Report");
    XLSX.writeFile(wb, `Purchase_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const handlePDF = () => {
    if (filteredData.length === 0) return alert("No data to print");
    const doc = new jsPDF('landscape');
    doc.text("Purchase Report", 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["Dept", "Bill No", "Date", "Party Name", "Item Name", "Qty", "Rate", "Amount", "Bill Total"];
    const tableRows = filteredData.map(item => [
      item.dept_name,
      item.bill_no,
      new Date(item.bill_date).toLocaleDateString(),
      item.party_name,
      item.product_name,
      item.quantity,
      item.purchase_rate,
      item.quantity * item.purchase_rate,
      item.bill_total
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8 }
    });
    doc.save(`Purchase_Report_${fromDate}_to_${toDate}.pdf`);
  };

  const totals = useMemo(() => {
    return {
      qty: filteredData.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0),
      billAmt: [...new Set(filteredData.map(i => i.purchase_id))].reduce((sum, id) => {
        const p = purchases.find(pur => pur.id === id);
        return sum + (parseFloat(p?.total_amount) || 0);
      }, 0)
    };
  }, [filteredData, purchases]);

  const uniqueParties = useMemo(() => {
    return ['All', ...new Set((purchases || []).map(p => p.party_name))];
  }, [purchases]);

  return (
    <div className="space-y-4">
      {/* Filter Header matching Screenshot */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 relative">
        <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm">
          <ShoppingCart size={16} /> Purchase Report
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">From Date:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">To Date:</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Party:</span>
            <select value={party} onChange={e => setParty(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              {uniqueParties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <input 
              type="text" 
              value={searchItem} 
              onChange={e => setSearchItem(e.target.value)} 
              placeholder="Search for items..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold outline-none" 
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <Search size={14} /> Show
            </button>
            <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <FileJson size={14} /> Excel
            </button>
            <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <Printer size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['Department', 'Bill No', 'Bill Date', 'Party Name', 'Item Name', 'Qty', 'Unit', 'Rate', 'GST%', 'Amount', 'Bill Amount'].map(h => (
                  <th key={h} className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-tighter">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-[10px] font-bold uppercase">{item.dept_name}</td>
                  <td className="px-3 py-2 text-[10px] font-black text-blue-700">#{item.bill_no}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">{new Date(item.bill_date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-[10px] font-bold uppercase">{item.party_name}</td>
                  <td className="px-3 py-2 text-[10px] font-black text-slate-900 uppercase">{item.product_name}</td>
                  <td className="px-3 py-2 text-[10px] font-black">{item.quantity}</td>
                  <td className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">PCS</td>
                  <td className="px-3 py-2 text-[10px] font-bold">₹{item.purchase_rate}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">0%</td>
                  <td className="px-3 py-2 text-[10px] font-black">₹{item.quantity * item.purchase_rate}</td>
                  <td className="px-3 py-2 text-[10px] font-black">₹{item.bill_total}</td>
                </tr>
              ))}
              {/* Summary Row matching Screenshot */}
              <tr className="bg-blue-100/50 font-black text-slate-900 border-t-2 border-slate-200">
                <td colSpan="5" className="px-3 py-2.5 text-right text-[11px] uppercase tracking-widest">Total:</td>
                <td className="px-3 py-2.5 text-[11px]">{totals.qty}</td>
                <td colSpan="4" />
                <td className="px-3 py-2.5 text-[11px]">₹{totals.billAmt}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SaleCancelledBillView({ orders, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const cancelledBills = useMemo(() => {
    return (orders || []).filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      const matchesSearch = 
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        order.user_mobile?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = orderDate >= fromDate && orderDate <= toDate;
      return matchesSearch && matchesDate && order.status === 'cancelled';
    });
  }, [orders, searchTerm, fromDate, toDate]);

  return (
    <div className="space-y-4">
      {/* Cancelled Bill Header matching screenshot */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded shadow-sm text-white">
            <XCircle size={16} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Cancelled Bill</h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="Search"
              className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span>From :</span>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span>To :</span>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Cancelled Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">BlNo</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Bill Date</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Time</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Bill Amount</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Remarks</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cancelledBills.length > 0 ? cancelledBills.map((order) => {
                const dateObj = new Date(order.created_at);
                return (
                  <tr key={order.id} className="hover:bg-red-50/30 transition-colors group">
                    <td className="px-4 py-3 text-[11px] font-black text-red-700">#{order.order_number}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-700">{dateObj.toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-600">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-slate-900">₹{order.final_amount}</td>
                    <td className="px-4 py-3 text-[10px] font-bold text-red-500 uppercase italic">Cancelled</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} className="text-slate-200" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No cancelled records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SaleTrashBillView({ orders, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const trashBills = useMemo(() => {
    return (orders || []).filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      const matchesSearch = 
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        order.user_mobile?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = orderDate >= fromDate && orderDate <= toDate;
      // In a real system, 'trash' might be a specific status or a deleted_at flag
      // For now, we'll show 'cancelled' orders as trash or filtered by status
      return matchesSearch && matchesDate && order.status === 'cancelled';
    });
  }, [orders, searchTerm, fromDate, toDate]);

  return (
    <div className="space-y-4">
      {/* Trash Sale Details Header matching screenshot */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded shadow-sm text-white">
            <Database size={16} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Trash Sale Details</h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="Search"
              className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span>From :</span>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span>To :</span>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Trash Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">BlNo</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Bill Date</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Time</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Bill Amount</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Customer Mob</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Customer Name</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Remarks</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trashBills.length > 0 ? trashBills.map((order) => {
                const dateObj = new Date(order.created_at);
                return (
                  <tr key={order.id} className="hover:bg-red-50/30 transition-colors group">
                    <td className="px-4 py-3 text-[11px] font-black text-red-700">#{order.order_number}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-700">{dateObj.toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-600">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-slate-900">₹{order.final_amount}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-800">{order.user_mobile}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase">{order.delivery_contact || 'N/A'}</td>
                    <td className="px-4 py-3 text-[10px] font-bold text-red-500 uppercase italic">Deleted/Cancelled</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={async () => {
                            // Immediate restore without confirmation
                            await handleERPAction(DB_SCHEMA.ORDERS.table, ACTION_TYPES.UPDATE, { id: order.id, status: 'billed' });
                            await fetchInitialData();
                          }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                          title="Restore Bill"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="8" className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Trash size={32} className="text-slate-200" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No trash records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SaleReportItemSummaryView({ orders, categories, subcategories, fetchInitialData }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Billed');
  const [subCat, setSubCat] = useState('All');
  const [mainCat, setMainCat] = useState('All');
  const [searchItem, setSearchItem] = useState('');
  const [summaryData, setSummaryData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShow = async () => {
    setIsGenerating(true);
    try {
      // 1. Filter orders based on basic filters
      const filteredOrders = (orders || []).filter(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        const matchesDate = orderDate >= fromDate && orderDate <= toDate;
        const matchesStatus = status === 'All' || order.status === status.toLowerCase();
        return matchesDate && matchesStatus;
      });

      const orderIds = filteredOrders.map(o => o.id);
      if (orderIds.length === 0) {
        setSummaryData([]);
        return;
      }

      // 2. Fetch all items for these orders
      let allItems = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, {
        in: { column: 'order_id', values: orderIds }
      });

      // 3. Filter items by Category/Subcategory if needed
      if (mainCat !== 'All' || subCat !== 'All') {
        allItems = allItems.filter(item => {
          const product = products.find(p => p.id === item.product_id || p.name === item.product_name);
          if (!product) return false;
          
          const matchesMain = mainCat === 'All' || product.category_id === mainCat || product.category_name === mainCat;
          const matchesSub = subCat === 'All' || product.subcategory_id === subCat || product.subcategory_name === subCat;
          return matchesMain && matchesSub;
        });
      }

      // 4. Group by Item Name and calculate summary
      const grouped = allItems.reduce((acc, item) => {
        const itemName = item.product_name || 'Unknown Item';
        if (!acc[itemName]) {
          acc[itemName] = {
            itemName: itemName,
            unit: 'PCS', // Default or fetch from product master
            qty: 0,
            rate: item.sale_rate,
            amount: 0
          };
        }
        acc[itemName].qty += parseFloat(item.quantity) || 0;
        acc[itemName].amount += (parseFloat(item.quantity) * parseFloat(item.sale_rate)) || 0;
        return acc;
      }, {});

      // 4. Convert to array and apply search filter
      const finalSummary = Object.values(grouped).filter(item => 
        !searchItem || item.itemName.toLowerCase().includes(searchItem.toLowerCase())
      );

      setSummaryData(finalSummary);
    } catch (error) {
      console.error("Error generating item summary:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (summaryData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sale Item Summary");
    XLSX.writeFile(wb, `Sale_Report_ItemSummary_${fromDate}_to_${toDate}.xlsx`);
  };

  const handlePDF = () => {
    if (summaryData.length === 0) return alert("No data to print");
    const doc = new jsPDF();
    doc.text("Sale Report Item-Summary", 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["Sr No", "Item Name", "Unit", "Qty", "Rate", "Amount"];
    const tableRows = summaryData.map((item, i) => [
      i + 1,
      item.itemName,
      item.unit,
      item.qty,
      item.rate,
      item.amount.toFixed(2)
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid'
    });
    doc.save(`Sale_Report_ItemSummary_${fromDate}_to_${toDate}.pdf`);
  };

  const totals = useMemo(() => {
    return {
      qty: summaryData.reduce((sum, item) => sum + item.qty, 0),
      amount: summaryData.reduce((sum, item) => sum + item.amount, 0)
    };
  }, [summaryData]);

  return (
    <div className="space-y-4">
      {/* Filter Header matching Screenshot */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
        <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm mb-4">
          <ExternalLink size={16} /> Sale Report Item-Summary
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">From Date:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">To Date:</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Status:</span>
            <select value={status} onChange={e => setStatus(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>Billed</option><option>Pending</option><option>Delivered</option><option>Cancelled</option><option>All</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Sub Cat :</span>
            <select value={subCat} onChange={e => setSubCat(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>All</option>
              {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Main-Cat :</span>
            <select value={mainCat} onChange={e => setMainCat(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>All</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div />

          <div className="md:col-span-2">
            <input 
              type="text" 
              value={searchItem} 
              onChange={e => setSearchItem(e.target.value)} 
              placeholder="Search for items..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold outline-none" 
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <Search size={14} /> Show
            </button>
            <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <FileJson size={14} /> Excel
            </button>
            <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <Printer size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest w-24">Sr No</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Item Name</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Unit</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Qty</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Rate</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryData.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-6 py-2.5 text-[11px] font-bold text-slate-500">{i + 1}</td>
                  <td className="px-6 py-2.5 text-[11px] font-black text-slate-900 uppercase">{item.itemName}</td>
                  <td className="px-6 py-2.5 text-[11px] font-bold text-slate-500 text-center uppercase">{item.unit}</td>
                  <td className="px-6 py-2.5 text-[11px] font-black text-slate-900 text-center">{item.qty}</td>
                  <td className="px-6 py-2.5 text-[11px] font-bold text-slate-600 text-center">₹{item.rate}</td>
                  <td className="px-6 py-2.5 text-[11px] font-black text-slate-900 text-right">₹{item.amount.toFixed(2)}</td>
                </tr>
              ))}
              {/* Summary Row matching Screenshot */}
              <tr className="bg-blue-100/50 font-black text-slate-900 border-t-2 border-slate-200">
                <td colSpan="3" className="px-6 py-3 text-right text-[11px] uppercase tracking-widest">Total :</td>
                <td className="px-6 py-3 text-[11px] text-center">{totals.qty}</td>
                <td className="px-6 py-3" />
                <td className="px-6 py-3 text-[11px] text-right">₹{totals.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SaleReportItemView({ orders, categories, subcategories, fetchInitialData }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Billed');
  const [subCat, setSubCat] = useState('All');
  const [mainCat, setMainCat] = useState('All');
  const [pay1, setPay1] = useState('All');
  const [pay2, setPay2] = useState('All');
  const [searchItem, setSearchItem] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShow = async () => {
    setIsGenerating(true);
    try {
      // 1. Filter orders based on basic filters
      const filteredOrders = (orders || []).filter(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        const matchesDate = orderDate >= fromDate && orderDate <= toDate;
        const matchesStatus = status === 'All' || order.status === status.toLowerCase();
        const matchesPay1 = pay1 === 'All' || order.payment_method === pay1;
        return matchesDate && matchesStatus && matchesPay1;
      });

      // 2. Fetch items for these orders
      const orderIds = filteredOrders.map(o => o.id);
      if (orderIds.length === 0) {
        setFilteredData([]);
        return;
      }

      const allItems = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, {
        in: { column: 'order_id', values: orderIds }
      });

      // 3. Map items with order details and apply item-specific filters
      const itemReportData = allItems.map(item => {
        const order = filteredOrders.find(o => o.id === item.order_id);
        return {
          ...item,
          order_date: order.created_at,
          order_number: order.order_number,
          user_mobile: order.user_mobile,
          cust_name: order.delivery_contact || 'N/A',
          payment_method: order.payment_method,
          bill_amount: order.final_amount
        };
      }).filter(item => {
        const product = products.find(p => p.id === item.product_id || p.name === item.product_name);
        if (!product && (mainCat !== 'All' || subCat !== 'All')) return false;
        
        const matchesSearch = !searchItem || item.product_name?.toLowerCase().includes(searchItem.toLowerCase());
        
        // Match by Name or ID for Category/Subcategory
        const productMainCat = product?.category_name || product?.category || '';
        const productSubCat = product?.subcategory_name || product?.subcategory || '';

        const matchesMain = mainCat === 'All' || product?.category_id === mainCat || productMainCat === mainCat;
        const matchesSub = subCat === 'All' || product?.subcategory_id === subCat || productSubCat === subCat;
        
        return matchesSearch && matchesMain && matchesSub;
      });

      setFilteredData(itemReportData);
    } catch (error) {
      console.error("Error generating item report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExcel = () => {
    if (filteredData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sale Itemwise");
    XLSX.writeFile(wb, `Sale_Report_Itemwise_${fromDate}_to_${toDate}.xlsx`);
  };

  const handlePDF = () => {
    if (filteredData.length === 0) return alert("No data to print");
    const doc = new jsPDF('landscape');
    doc.text("Sale Report Item-wise", 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["Date", "Bill No", "Mobile", "Item", "Qty", "Rate", "Total", "Bill Amt", "MOP"];
    const tableRows = filteredData.map(item => [
      new Date(item.order_date).toLocaleDateString(),
      item.order_number,
      item.user_mobile,
      item.product_name,
      item.quantity,
      item.sale_rate,
      (item.quantity * item.sale_rate).toFixed(2),
      item.bill_amount,
      item.payment_method
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 7 }
    });
    doc.save(`Sale_Report_Itemwise_${fromDate}_to_${toDate}.pdf`);
  };

  const totals = useMemo(() => {
    return {
      qty: filteredData.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0),
      total: filteredData.reduce((sum, item) => sum + (parseFloat(item.quantity * item.sale_rate) || 0), 0),
      billAmt: [...new Set(filteredData.map(i => i.order_id))].reduce((sum, id) => {
        const order = orders.find(o => o.id === id);
        return sum + (parseFloat(order?.final_amount) || 0);
      }, 0)
    };
  }, [filteredData, orders]);

  return (
    <div className="space-y-4">
      {/* Filter Header matching Screenshot */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
        <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm mb-4">
          <ExternalLink size={16} /> Sale Report Item-wise
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">From Date:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">To Date:</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Status:</span>
            <select value={status} onChange={e => setStatus(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>Billed</option><option>Pending</option><option>Delivered</option><option>Cancelled</option><option>All</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Sub Cat :</span>
            <select value={subCat} onChange={e => setSubCat(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>All</option>
              {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Main Cat :</span>
            <select value={mainCat} onChange={e => setMainCat(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>All</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div />

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Pay 1:</span>
            <select value={pay1} onChange={e => setPay1(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>All</option><option>COD</option><option>Online</option><option>Wallet</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Pay 2:</span>
            <select value={pay2} onChange={e => setPay2(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>All</option><option>COD</option><option>Online</option><option>Wallet</option>
            </select>
          </div>
          <div />

          <div className="md:col-span-2">
            <input 
              type="text" 
              value={searchItem} 
              onChange={e => setSearchItem(e.target.value)} 
              placeholder="Search for items..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold outline-none" 
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <Search size={14} /> Show
            </button>
            <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <FileJson size={14} /> Excel
            </button>
            <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
              <Printer size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['Sr No', 'Bl Date', 'Bl No', 'Time', 'Mobile No', 'Cust Name', 'Item', 'Qty', 'Unit', 'Rate', 'Dis %', 'Gst', 'Total', 'Bill Amount', 'MOP-1', 'MOP-1 Amt', 'MOP-2', 'MOP-2 Amt', 'Wallet', 'A/c id', 'User', 'Delivery Boy'].map(h => (
                  <th key={h} className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-tighter">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-[10px] font-bold">{i + 1}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">{new Date(item.order_date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-[10px] font-black text-blue-700">#{item.order_number}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">{new Date(item.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">{item.user_mobile}</td>
                  <td className="px-3 py-2 text-[10px] font-bold uppercase truncate max-w-[100px]">{item.cust_name}</td>
                  <td className="px-3 py-2 text-[10px] font-black text-slate-900 uppercase">{item.product_name}</td>
                  <td className="px-3 py-2 text-[10px] font-black">{item.quantity}</td>
                  <td className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">PCS</td>
                  <td className="px-3 py-2 text-[10px] font-bold">₹{item.sale_rate}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">0%</td>
                  <td className="px-3 py-2 text-[10px] font-bold">₹0</td>
                  <td className="px-3 py-2 text-[10px] font-black">₹{item.quantity * item.sale_rate}</td>
                  <td className="px-3 py-2 text-[10px] font-black">₹{item.bill_amount}</td>
                  <td className="px-3 py-2 text-[10px] font-bold uppercase">{item.payment_method}</td>
                  <td className="px-3 py-2 text-[10px] font-black">₹{item.bill_amount}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">-</td>
                  <td className="px-3 py-2 text-[10px] font-black">₹0</td>
                  <td className="px-3 py-2 text-[10px] font-black">₹0</td>
                  <td className="px-3 py-2 text-[10px] font-bold text-slate-400">#ACC</td>
                  <td className="px-3 py-2 text-[10px] font-bold uppercase">Admin</td>
                  <td className="px-3 py-2 text-[10px] font-bold uppercase">N/A</td>
                </tr>
              ))}
              {/* Summary Row matching Screenshot */}
              <tr className="bg-blue-100/50 font-black text-slate-900 border-t-2 border-slate-200">
                <td colSpan="7" className="px-3 py-2.5 text-right text-[11px] uppercase tracking-widest">Total :</td>
                <td className="px-3 py-2.5 text-[11px]">{totals.qty}</td>
                <td colSpan="4" />
                <td className="px-3 py-2.5 text-[11px]">{totals.total}</td>
                <td className="px-3 py-2.5 text-[11px]">{totals.billAmt}</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-[11px]">{totals.billAmt}</td>
                <td colSpan="2" />
                <td className="px-3 py-2.5 text-[11px]">0</td>
                <td colSpan="3" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Summary Table */}
      <div className="w-full max-w-sm">
        <table className="w-full text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-white border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-[11px] font-black text-slate-800 uppercase">Account Name</th>
              <th className="px-4 py-2 text-[11px] font-black text-slate-800 uppercase">Total Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            <tr><td className="px-4 py-2 text-[11px] font-bold uppercase">COD Sale</td><td className="px-4 py-2 text-[11px] font-black">₹{totals.total}</td></tr>
            <tr><td className="px-4 py-2 text-[11px] font-bold uppercase">Online Sale</td><td className="px-4 py-2 text-[11px] font-black">₹0</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SaleReportBillView({ orders, deliveryBoys, adminUsers, fetchInitialData }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Billed');
  const [pay1, setPay1] = useState('All');
  const [pay2, setPay2] = useState('All');
  const [userName, setUserName] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShow = () => {
    setIsGenerating(true);
    const data = (orders || []).filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      const matchesDate = orderDate >= fromDate && orderDate <= toDate;
      const matchesStatus = status === 'All' || order.status === status.toLowerCase();
      const matchesUser = !userName || order.user_name?.toLowerCase().includes(userName.toLowerCase());
      
      // MOP filtering logic (simplified for now)
      const matchesPay1 = pay1 === 'All' || order.payment_method === pay1;
      
      return matchesDate && matchesStatus && matchesUser && matchesPay1;
    });
    setFilteredData(data);
    setIsGenerating(false);
  };

  const handleExcel = () => {
    if (filteredData.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sale Billwise");
    XLSX.writeFile(wb, `Sale_Report_Billwise_${fromDate}_to_${toDate}.xlsx`);
  };

  const handlePDF = () => {
    if (filteredData.length === 0) return alert("No data to print");
    const doc = new jsPDF('landscape');
    doc.text("Sale Report Bill-wise", 14, 15);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
    
    const tableColumn = ["Sr No", "Date", "Bill No", "Time", "Type", "Mobile", "Amount", "MOP"];
    const tableRows = filteredData.map((order, i) => [
      i + 1,
      new Date(order.created_at).toLocaleDateString(),
      order.order_number,
      new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      order.payment_method,
      order.user_mobile,
      order.final_amount,
      order.payment_method
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid'
    });
    doc.save(`Sale_Report_Billwise_${fromDate}_to_${toDate}.pdf`);
  };

  const totals = useMemo(() => {
    return {
      amount: filteredData.reduce((sum, o) => sum + (parseFloat(o.final_amount) || 0), 0),
      mop1: filteredData.reduce((sum, o) => sum + (parseFloat(o.final_amount) || 0), 0), // Assuming single MOP for now
      mop2: 0,
      wallet: 0
    };
  }, [filteredData]);

  return (
    <div className="space-y-4">
      {/* Filter Header matching Screenshot */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 relative">
        <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-sm mb-4">
          <ExternalLink size={16} /> Sale Report
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-16">From Date:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-16">To Date:</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-16">Status:</span>
            <select value={status} onChange={e => setStatus(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>Billed</option>
              <option>Pending</option>
              <option>Delivered</option>
              <option>Cancelled</option>
              <option>All</option>
            </select>
          </div>
          <div />

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-16">Pay 1:</span>
            <select value={pay1} onChange={e => setPay1(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>All</option>
              <option>COD</option>
              <option>Online</option>
              <option>Wallet</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-16">Pay 2:</span>
            <select value={pay2} onChange={e => setPay2(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
              <option>All</option>
              <option>COD</option>
              <option>Online</option>
              <option>Wallet</option>
            </select>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-16">User Name :</span>
            <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Search User" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <Search size={14} /> Show
          </button>
          <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <FileJson size={14} /> Excel
          </button>
          <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <Printer size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="border-b border-slate-200">
                {['Sr No', 'Bl Date', 'Bl No', 'Time', 'Type', 'Mobile No', 'Cust Name', 'Bill Amount', 'MOP-1', 'MOP-1 Amt', 'MOP-2', 'MOP-2 Amt', 'Wallet', 'A/c id', 'User', 'Delivery Boy'].map(h => (
                  <th key={h} className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-tighter">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((order, i) => (
                <tr key={order.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-[10px] font-bold">{i + 1}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-[10px] font-black text-blue-700">#{order.order_number}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-3 py-2 text-[10px] font-black uppercase">{order.payment_method}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">{order.user_mobile}</td>
                  <td className="px-3 py-2 text-[10px] font-bold uppercase truncate max-w-[100px]">{order.delivery_contact || 'N/A'}</td>
                  <td className="px-3 py-2 text-[10px] font-black">₹{order.final_amount}</td>
                  <td className="px-3 py-2 text-[10px] font-bold uppercase">{order.payment_method}</td>
                  <td className="px-3 py-2 text-[10px] font-black">₹{order.final_amount}</td>
                  <td className="px-3 py-2 text-[10px] font-bold">-</td>
                  <td className="px-3 py-2 text-[10px] font-black">₹0</td>
                  <td className="px-3 py-2 text-[10px] font-black">₹0</td>
                  <td className="px-3 py-2 text-[10px] font-bold text-slate-400">#ACC</td>
                  <td className="px-3 py-2 text-[10px] font-bold uppercase">Admin</td>
                  <td className="px-3 py-2 text-[10px] font-bold uppercase">N/A</td>
                </tr>
              ))}
              {/* Summary Row matching Screenshot */}
              <tr className="bg-blue-100/50 font-black text-slate-900 border-t-2 border-slate-200">
                <td colSpan="7" className="px-3 py-2.5 text-right text-[11px] uppercase tracking-widest">Total :</td>
                <td className="px-3 py-2.5 text-[11px]">{totals.amount}</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-[11px]">{totals.mop1}</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-[11px]">{totals.mop2}</td>
                <td className="px-3 py-2.5 text-[11px]">{totals.wallet}</td>
                <td colSpan="3" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Summary Table */}
      <div className="w-full max-w-sm">
        <table className="w-full text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-white border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-[11px] font-black text-slate-800 uppercase">Account Name</th>
              <th className="px-4 py-2 text-[11px] font-black text-slate-800 uppercase">Total Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-2 text-[11px] font-bold uppercase">COD Sale</td>
              <td className="px-4 py-2 text-[11px] font-black">₹{totals.mop1}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 text-[11px] font-bold uppercase">Online Sale</td>
              <td className="px-4 py-2 text-[11px] font-black">₹0</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Hidden PDF Print Layout */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 text-[9px]">
        <h2 className="text-center text-xl font-bold uppercase mb-4">{BRAND_NAME} - Sale Report (Bill-wise)</h2>
        <p className="mb-4 font-bold text-center">Period: {fromDate} to {toDate}</p>
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-1">Sr</th>
              <th className="border border-black px-1">Date</th>
              <th className="border border-black px-1">Bill No</th>
              <th className="border border-black px-1">Customer</th>
              <th className="border border-black px-1">Amount</th>
              <th className="border border-black px-1">MOP</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((o, i) => (
              <tr key={i}>
                <td className="border border-black px-1 text-center">{i + 1}</td>
                <td className="border border-black px-1">{new Date(o.created_at).toLocaleDateString()}</td>
                <td className="border border-black px-1">#{o.order_number}</td>
                <td className="border border-black px-1 uppercase">{o.delivery_contact || 'N/A'}</td>
                <td className="border border-black px-1 text-right">{o.final_amount}</td>
                <td className="border border-black px-1 uppercase">{o.payment_method}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td colSpan="4" className="border border-black px-1 text-right uppercase">Grand Total:</td>
              <td className="border border-black px-1 text-right">{totals.amount}</td>
              <td className="border border-black px-1"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SaleSummaryView({ orders, setActiveTab }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const printRef = useRef();

  const generateReport = () => {
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      return orderDate >= fromDate && orderDate <= toDate;
    });

    const summary = {
      basicSale: filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0),
      discount: filteredOrders.reduce((sum, o) => sum + (parseFloat(o.discount_amount) || 0), 0),
      taxableAmt: filteredOrders.reduce((sum, o) => sum + (parseFloat(o.taxable_amount) || 0), 0),
      gst: filteredOrders.reduce((sum, o) => sum + (parseFloat(o.tax_amount) || 0), 0),
      roundOff: filteredOrders.reduce((sum, o) => sum + (parseFloat(o.round_off) || 0), 0),
      totalSale: filteredOrders.reduce((sum, o) => sum + (parseFloat(o.final_amount) || 0), 0),
      totalOrders: filteredOrders.length,
      deliveredOrders: filteredOrders.filter(o => o.status === 'delivered').length,
      cancelledOrders: filteredOrders.filter(o => o.status === 'cancelled').length,
      onlineOrders: filteredOrders.filter(o => o.payment_method !== 'COD').length,
      codOrders: filteredOrders.filter(o => o.payment_method === 'COD').length,
    };

    setReportData(summary);
  };

  const handlePrint = () => {
    if (!reportData) generateReport();
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm">
      {/* Hidden Print Section */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-[12px] font-serif leading-tight">
        <div className="text-center space-y-1 mb-4">
          <h1 className="text-2xl font-bold uppercase tracking-widest">{BRAND_NAME}</h1>
          <p className="font-bold">Date : {new Date().toLocaleDateString()}, Time : {new Date().toLocaleTimeString()}</p>
          <p className="font-bold">Report Prepared By : Admin</p>
          <p className="border-y border-black py-1 font-bold">From Date : {new Date(fromDate).toLocaleDateString()} To : {new Date(toDate).toLocaleDateString()}</p>
        </div>

        {/* Main Summary Table */}
        <table className="w-full border-collapse border border-black mb-4">
          <tbody>
            {[
              { label: 'Basic Sale', value: reportData?.basicSale || 0 },
              { label: 'Discount', value: reportData?.discount || 0 },
              { label: 'Taxable Amt', value: reportData?.taxableAmt || 0 },
              { label: 'Cess', value: 0 },
              { label: 'GST', value: reportData?.gst || 0 },
              { label: 'Round Off', value: reportData?.roundOff || 0 },
              { label: 'Total Sale', value: reportData?.totalSale || 0 },
            ].map((row, i) => (
              <tr key={i} className="border-b border-black">
                <td className="border-r border-black px-4 py-1 font-bold w-1/2 uppercase">{row.label}</td>
                <td className="px-4 py-1 text-right font-bold">{parseFloat(row.value).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* GST Summary */}
        <div className="text-center font-bold underline mb-1">GST Summary</div>
        <table className="w-full border-collapse border border-black mb-4 text-center">
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black px-2 py-1 uppercase">GST %</th>
              <th className="border-r border-black px-2 py-1 uppercase">Taxable</th>
              <th className="px-2 py-1 uppercase">GST Amt</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black">
              <td className="border-r border-black px-2 py-1 font-bold">Total</td>
              <td className="border-r border-black px-2 py-1 font-bold">{reportData?.taxableAmt.toFixed(2)}</td>
              <td className="px-2 py-1 font-bold">{reportData?.gst.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Other Sections Placeholder (matching screenshot style) */}
        {['Account Wise Sales', 'Payment Received', 'Credit Payment Received', 'Paid To Party', 'Closing'].map((title, i) => (
          <div key={i}>
            <div className="text-center font-bold underline mb-1">{title}</div>
            <table className="w-full border-collapse border border-black mb-4">
              <thead>
                <tr className="border-b border-black">
                  <th className="border-r border-black px-2 py-1 uppercase w-1/2">Account</th>
                  <th className="px-2 py-1 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black">
                  <td className="border-r border-black px-2 py-1 font-bold uppercase">Total</td>
                  <td className="px-2 py-1 text-right font-bold">0.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* Total Transactions */}
        <div className="text-center font-bold underline mb-1">Total Transactions</div>
        <table className="w-full border-collapse border border-black mb-4">
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black px-2 py-1 uppercase w-1/2">Account</th>
              <th className="px-2 py-1 uppercase">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black">
              <td className="border-r border-black px-2 py-1 font-bold uppercase">Total</td>
              <td className="px-2 py-1 text-right font-bold">{reportData?.totalOrders || 0}</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div className="mt-12 space-y-1 text-center font-bold">
          <p className="underline uppercase">Signatures :</p>
          <p className="uppercase">Verified By :</p>
          <p className="uppercase">Prepared By : Admin</p>
        </div>
      </div>

      <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">Sale Summary Report</h1>
      
      <div className="flex flex-wrap items-center justify-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <div className="relative">
          <input 
            type="date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm"
          />
        </div>

        <div className="relative">
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm"
          />
        </div>

        <button 
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
        >
          <Printer size={16} /> Generate Report
        </button>

        <button 
          onClick={() => setActiveTab('Dashboard')}
          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95"
        >
          Cancel
        </button>
      </div>

      {reportData && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl pt-8 border-t border-slate-100"
        >
          {[
            { label: 'Total Sales', value: `₹${reportData.totalSale.toLocaleString()}`, color: 'text-emerald-600' },
            { label: 'Total Orders', value: reportData.totalOrders, color: 'text-blue-600' },
            { label: 'Delivered', value: reportData.deliveredOrders, color: 'text-emerald-500' },
            { label: 'Online Paid', value: reportData.onlineOrders, color: 'text-purple-600' },
            { label: 'COD Cash', value: reportData.codOrders, color: 'text-amber-600' },
            { label: 'Cancelled', value: reportData.cancelledOrders, color: 'text-red-600' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
              <p className={cn("text-2xl font-black tracking-tighter", item.color)}>{item.value}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function WalletRechargeView({ walletTx, accounts, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ 
    entry_date: new Date().toISOString().split('T')[0],
    amount: 0,
    mobile: '',
    account_id: 'Not Selected'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTx = (walletTx || []).filter(tx => 
    (tx.user_mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    tx.description?.includes('Wallet Recharge')
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { 
        ...formData,
        type: 'credit',
        description: `Wallet Recharge Entry`
      };
      
      let res;
      if (editingItem) {
        res = await handleERPAction(DB_SCHEMA.WALLET_TRANSACTIONS.table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = generateUUID();
        res = await handleERPAction(DB_SCHEMA.WALLET_TRANSACTIONS.table, ACTION_TYPES.INSERT, finalData);
      }
      
      if (res && !res.success) throw new Error(res.error);
      
      setShowForm(false);
      setEditingItem(null);
      setFormData({ 
        entry_date: new Date().toISOString().split('T')[0],
        amount: 0,
        mobile: '',
        account_id: 'Not Selected'
      });
      await fetchInitialData();
      alert(`Wallet recharge saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded shadow-sm text-slate-900 border border-slate-100">
            <IndianRupee size={16} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Wallet recharge</h2>
        </div>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({ entry_date: new Date().toISOString().split('T')[0], amount: 0, mobile: '', account_id: 'Not Selected' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 border-2 border-blue-600 rounded-lg text-blue-600 text-[11px] font-black uppercase hover:bg-blue-50 transition-all shadow-sm"
        >
          <Plus size={14} /> Create New
        </button>
      </div>

      {/* Content Area matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm min-h-[200px] flex items-center justify-center">
        {filteredTx.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Mobile</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Amount</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-3 text-[11px] font-bold text-slate-700">{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-[11px] font-black text-blue-700">{tx.user_mobile}</td>
                    <td className="px-6 py-3 text-center text-[11px] font-black text-slate-900">₹{tx.amount}</td>
                    <td className="px-6 py-3 text-right">
                      <button 
                        onClick={() => { setEditingItem(tx); setFormData({ ...tx, entry_date: new Date(tx.created_at).toISOString().split('T')[0] }); setShowForm(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">There are no records to display</p>
        )}
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-white">
                <div className="text-blue-600">
                  <IndianRupee size={16} />
                </div>
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Wallet recharge [ {editingItem ? 'MODIFY' : 'NEW'} ]</h3>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Entry Date</label>
                      <input 
                        type="date" 
                        value={formData.entry_date} 
                        onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-400 outline-none shadow-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Mobile no</label>
                      <input 
                        type="text" 
                        placeholder="Search Account ID / Mobile / Name"
                        value={formData.mobile} 
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-400 outline-none shadow-sm placeholder:text-slate-400" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Amount no</label>
                      <input 
                        type="number" 
                        value={formData.amount} 
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-400 outline-none shadow-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Account</label>
                      <select 
                        value={formData.account_id}
                        onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-400 outline-none shadow-sm"
                      >
                        <option value="Not Selected">Not Selected</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-center gap-3 pt-4">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentMobileView({ walletTx, deliveryBoys, accounts, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ 
    entry_date: new Date().toISOString().split('T')[0],
    amount: 0,
    mobile: '',
    account_id: 'Not Selected',
    delivery_boy_id: 'NA'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTx = (walletTx || []).filter(tx => 
    tx.user_mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { 
        ...formData,
        type: 'credit', // Payment means adding money to wallet
        description: `Payment via Mobile No Entry`
      };
      
      let res;
      if (editingItem) {
        res = await handleERPAction(DB_SCHEMA.WALLET_TRANSACTIONS.table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = generateUUID();
        res = await handleERPAction(DB_SCHEMA.WALLET_TRANSACTIONS.table, ACTION_TYPES.INSERT, finalData);
      }
      
      if (res && !res.success) throw new Error(res.error);
      
      setShowForm(false);
      setEditingItem(null);
      setFormData({ 
        entry_date: new Date().toISOString().split('T')[0],
        amount: 0,
        mobile: '',
        account_id: 'Not Selected',
        delivery_boy_id: 'NA'
      });
      await fetchInitialData();
      alert(`Payment entry saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded shadow-sm text-slate-900 border border-slate-100">
            <IndianRupee size={16} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Payment (Mobile No)</h2>
        </div>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text"
            placeholder="Search"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({ entry_date: new Date().toISOString().split('T')[0], amount: 0, mobile: '', account_id: 'Not Selected', delivery_boy_id: 'NA' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 border-2 border-blue-600 rounded-lg text-blue-600 text-[11px] font-black uppercase hover:bg-blue-50 transition-all shadow-sm"
        >
          <Plus size={14} /> Create New
        </button>
      </div>

      {/* Content Area matching Screenshot 1 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm min-h-[200px] flex items-center justify-center">
        {filteredTx.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Mobile</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Amount</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-3 text-[11px] font-bold text-slate-700">{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-[11px] font-black text-blue-700">{tx.user_mobile}</td>
                    <td className="px-6 py-3 text-center text-[11px] font-black text-slate-900">₹{tx.amount}</td>
                    <td className="px-6 py-3 text-right">
                      <button 
                        onClick={() => { setEditingItem(tx); setFormData({ ...tx, entry_date: new Date(tx.created_at).toISOString().split('T')[0] }); setShowForm(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">There are no records to display</p>
        )}
      </div>

      {/* Modal Form matching Screenshot 2 */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-white">
                <div className="text-blue-600">
                  <IndianRupee size={16} />
                </div>
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Payment [ {editingItem ? 'MODIFY' : 'NEW'} ]</h3>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Entry Date</label>
                      <input 
                        type="date" 
                        value={formData.entry_date} 
                        onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-400 outline-none shadow-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Mobile no</label>
                      <input 
                        type="text" 
                        placeholder="Search Account ID / Mobile / Name"
                        value={formData.mobile} 
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-400 outline-none shadow-sm placeholder:text-slate-400" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Amount no</label>
                      <input 
                        type="number" 
                        value={formData.amount} 
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-400 outline-none shadow-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Account</label>
                      <select 
                        value={formData.account_id}
                        onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-400 outline-none shadow-sm"
                      >
                        <option value="Not Selected">Not Selected</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Delivery Boy</label>
                      <select 
                        value={formData.delivery_boy_id}
                        onChange={(e) => setFormData({ ...formData, delivery_boy_id: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-400 outline-none shadow-sm"
                      >
                        <option value="NA">NA</option>
                        {deliveryBoys.map(boy => (
                          <option key={boy.id} value={boy.id}>{boy.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-center gap-3 pt-4">
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-blue-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BranchBillView({ purchases, departments, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBill, setSelectedBill] = useState(null);

  const filteredBills = useMemo(() => {
    return (purchases || []).filter(bill => {
      const billDate = new Date(bill.bill_date).toISOString().split('T')[0];
      const matchesSearch = 
        bill.bill_no?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        bill.party_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = billDate >= fromDate && billDate <= toDate;
      return matchesSearch && matchesDate;
    });
  }, [purchases, searchTerm, fromDate, toDate]);

  return (
    <div className="space-y-4">
      {/* Branch Bill Header matching screenshot */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded shadow-sm text-white">
            <GitBranch size={16} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Branch Bill</h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="Search Bill No"
              className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span>From :</span>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span>To :</span>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>

          <button className="flex items-center gap-2 px-3 py-1.5 border-2 border-blue-600 rounded-lg text-blue-600 text-[11px] font-black uppercase hover:bg-blue-50 transition-all">
            <GitBranch size={14} /> Branch Bill
          </button>
        </div>
      </div>

      {/* Bill Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Bill Date</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Bill No</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Party</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Department</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Bill Amt</th>
                <th className="px-6 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length > 0 ? filteredBills.map((bill) => {
                const dept = departments.find(d => d.id === bill.department_id);
                return (
                  <tr key={bill.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-3 text-[11px] font-bold text-slate-700">{new Date(bill.bill_date).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-[11px] font-black text-blue-700">#{bill.bill_no}</td>
                    <td className="px-6 py-3 text-[11px] font-bold text-slate-800 uppercase">{bill.party_name}</td>
                    <td className="px-6 py-3 text-center text-[10px] font-black text-slate-500 uppercase">{dept?.name || 'N/A'}</td>
                    <td className="px-6 py-3 text-center text-[11px] font-black text-slate-900">₹{bill.total_amount}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => setSelectedBill(bill)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-all"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="py-20 text-center">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No branch bills found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedBill && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200"
            >
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Bill Detail: #{selectedBill.bill_no}</h3>
                <button onClick={() => setSelectedBill(null)} className="p-2 hover:bg-white rounded-lg transition-all">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Party Name</p>
                    <p className="text-xs font-black text-slate-900 uppercase">{selectedBill.party_name}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Amount</p>
                    <p className="text-xs font-black text-slate-900">₹{selectedBill.total_amount}</p>
                  </div>
                </div>
                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Item details logic here</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BillView({ orders, deliveryBoys, fetchInitialData, mode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const filteredBills = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      
      // If mode is delivery, only show orders with delivery info
      if (mode === 'delivery' && !order.delivery_boy_id && !order.delivery_address) {
        return false;
      }

      const matchesSearch = 
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        order.user_mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.delivery_contact?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = orderDate >= fromDate && orderDate <= toDate;
      return matchesSearch && matchesDate;
    });
  }, [orders, searchTerm, fromDate, toDate, mode]);

  const fetchOrderItems = async (orderId) => {
    setLoadingItems(true);
    try {
      const data = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, {
        eq: { column: 'order_id', value: orderId }
      });
      setOrderItems(data || []);
    } catch (error) {
      console.error("Error fetching order items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (selectedOrder) {
      fetchOrderItems(selectedOrder.id);
    }
  }, [selectedOrder]);

  return (
    <div className="space-y-4">
      {/* Bill Details Header matching screenshot */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded shadow-sm text-white">
            <Database size={16} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Bill Details</h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="Search"
              className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span>From :</span>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span>To :</span>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bill Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">BlNo</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Bill Date</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Time</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Bill Amount</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Customer Mob</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Customer Name</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Delivery Boy</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Delivery Status</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">pickup</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">delivery</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">delivery in</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length > 0 ? filteredBills.map((order) => {
                const dateObj = new Date(order.created_at);
                const dboy = deliveryBoys.find(b => b.id === order.delivery_boy_id);
                return (
                  <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-3 py-2.5 text-[11px] font-black text-blue-700">#{order.order_number}</td>
                    <td className="px-3 py-2.5 text-[11px] font-bold text-slate-700">{dateObj.toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 text-[11px] font-bold text-slate-600">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-3 py-2.5 text-[11px] font-black text-slate-900">₹{order.final_amount || order.total_amount}</td>
                    <td className="px-3 py-2.5 text-[11px] font-bold text-slate-800">{order.user_mobile}</td>
                    <td className="px-3 py-2.5 text-[11px] font-bold text-slate-600 uppercase truncate max-w-[120px]">{order.delivery_contact || 'N/A'}</td>
                    <td className="px-3 py-2.5 text-[11px] font-black text-slate-500 uppercase">{dboy?.name || '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className={cn("w-2 h-2 rounded-full mx-auto", order.status !== 'pending' ? 'bg-emerald-500' : 'bg-slate-200')} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className={cn("w-2 h-2 rounded-full mx-auto", order.status === 'delivered' ? 'bg-emerald-500' : 'bg-slate-200')} />
                    </td>
                    <td className="px-3 py-2.5 text-center text-[10px] font-black text-slate-400">
                      {order.status === 'delivered' ? 'DONE' : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={async () => {
                            const items = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, { eq: { column: 'order_id', value: order.id } });
                            await handleERPAction(null, ACTION_TYPES.GENERATE_BILL, { order, items });
                            alert("Bill Printed Successfully");
                          }}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-all"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="12" className="py-20 text-center">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No bills found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simplified Bill Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Bill Details: #{selectedOrder.order_number}</h3>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white rounded-lg transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Customer</p>
                    <p className="text-xs font-black text-slate-900">{selectedOrder.delivery_contact || 'Guest User'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{selectedOrder.user_mobile}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Payment</p>
                    <p className="text-xs font-black text-slate-900">{selectedOrder.payment_method}</p>
                    <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">{selectedOrder.payment_status}</span>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 font-black text-slate-400 uppercase">Product</th>
                        <th className="px-4 py-2 font-black text-slate-400 uppercase text-center">Qty</th>
                        <th className="px-4 py-2 font-black text-slate-400 uppercase text-right">Rate</th>
                        <th className="px-4 py-2 font-black text-slate-400 uppercase text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loadingItems ? (
                        <tr><td colSpan="4" className="py-10 text-center"><RefreshCw size={20} className="animate-spin mx-auto text-blue-500" /></td></tr>
                      ) : orderItems.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2.5 font-bold text-slate-700 uppercase">{item.product_name}</td>
                          <td className="px-4 py-2.5 text-center font-black text-slate-900">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-600">₹{item.sale_rate}</td>
                          <td className="px-4 py-2.5 text-right font-black text-slate-900">₹{item.quantity * item.sale_rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <div className="w-48 space-y-1">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                      <span>Total Amount:</span>
                      <span className="text-slate-900">₹{selectedOrder.total_amount}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black text-blue-700 uppercase border-t border-slate-100 pt-1">
                      <span>Net Bill:</span>
                      <span>₹{selectedOrder.final_amount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button 
                  onClick={async () => {
                    const commands = await handleERPAction(null, ACTION_TYPES.GENERATE_BILL, { order: selectedOrder, items: orderItems });
                    alert("Bill Printed Successfully");
                  }}
                  className="px-6 py-2 bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg"
                >
                  <Printer size={14} /> Print Bill
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OnlineOrderView({ orders, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0];
      const matchesSearch = order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           order.user_mobile?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = orderDate >= fromDate && orderDate <= toDate;
      return matchesSearch && matchesDate;
    });
  }, [orders, searchTerm, fromDate, toDate]);

  const fetchOrderItems = async (orderId) => {
    setLoadingItems(true);
    try {
      const data = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, {
        eq: { column: 'order_id', value: orderId }
      });
      setOrderItems(data || []);
    } catch (error) {
      console.error("Error fetching order items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (selectedOrder) {
      fetchOrderItems(selectedOrder.id);
    }
  }, [selectedOrder]);

  return (
    <div className="space-y-4">
      {/* KOT View Header matching screenshot */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded shadow-sm text-white">
            <Monitor size={16} />
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">KOT View</h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="Search Kot"
              className="bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span>From :</span>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            <span>To :</span>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Date</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Time</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Order No</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Ord Type</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">BlNo</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Ord Amt</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Is Bill</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                const dateObj = new Date(order.created_at);
                return (
                  <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-700">{dateObj.toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-600">{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-blue-700">#{order.order_number}</td>
                    <td className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-tighter">ONLINE</td>
                    <td className="px-4 py-3 text-[11px] font-bold text-slate-500">#{order.id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 text-right text-[11px] font-black text-slate-900">₹{order.total_amount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                      )}>
                        {order.status === 'delivered' ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          title="View Order"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={async () => {
                            const items = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, { eq: { column: 'order_id', value: order.id } });
                            await handleERPAction(null, ACTION_TYPES.GENERATE_BILL, { order, items });
                            alert("KOT Sent to Printer");
                          }}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-all"
                          title="Print KOT"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="8" className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingBag size={32} className="text-slate-200" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No online orders found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal (Reuse logic from OrdersView or simplified) */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Order Info: #{selectedOrder.order_number}</h3>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white rounded-lg transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase mb-1">Customer Mobile</p>
                    <p className="text-xs font-black text-slate-900">{selectedOrder.user_mobile}</p>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Order Amount</p>
                    <p className="text-xs font-black text-slate-900">₹{selectedOrder.total_amount}</p>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 font-black text-slate-400 uppercase">Product</th>
                        <th className="px-4 py-2 font-black text-slate-400 uppercase text-center">Qty</th>
                        <th className="px-4 py-2 font-black text-slate-400 uppercase text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loadingItems ? (
                        <tr><td colSpan="3" className="py-10 text-center"><RefreshCw size={20} className="animate-spin mx-auto text-blue-500" /></td></tr>
                      ) : orderItems.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2.5 font-bold text-slate-700 uppercase">{item.product_name}</td>
                          <td className="px-4 py-2.5 text-center font-black text-slate-900">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right font-black text-slate-900">₹{item.quantity * item.sale_rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button 
                  onClick={async () => {
                    const commands = await handleERPAction(null, ACTION_TYPES.GENERATE_BILL, { order: selectedOrder, items: orderItems });
                    alert("KOT Printed Successfully");
                  }}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Printer size={14} /> Print KOT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrdersView({ orders, filter, fetchInitialData }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const filteredOrders = useMemo(() => {
    if (!filter) return orders;
    return orders.filter(o => o.status.toLowerCase() === filter);
  }, [orders, filter]);

  useEffect(() => {
    if (selectedOrder) {
      fetchOrderItems(selectedOrder.id);
    }
  }, [selectedOrder]);

  const fetchOrderItems = async (orderId) => {
    setLoadingItems(true);
    try {
      const data = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, {
        eq: { column: 'order_id', value: orderId }
      });
      setOrderItems(data || []);
    } catch (error) {
      console.error("Error fetching order items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await handleERPAction(DB_SCHEMA.ORDERS.table, ACTION_TYPES.UPDATE, { id, status });
      fetchInitialData();
      alert("Status Sync OK");
    } catch (error) {
      alert("Sync Error");
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Tx ID</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Party / Customer</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Bill Amount</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">Logistics</th>
                <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2.5 font-black text-blue-700 text-[10px]">#{order.order_number}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-[10px] font-bold text-slate-800 leading-none">{order.user_mobile}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">{order.payment_method}</p>
                  </td>
                  <td className="px-4 py-2.5 text-[10px] font-black text-slate-800">₹{order.total_amount}</td>
                  <td className="px-4 py-2.5">
                    <select value={order.status} onChange={(e) => updateStatus(order.id, e.target.value)} className={cn("text-[8px] font-black uppercase tracking-widest border border-slate-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-blue-500 bg-white", order.status === 'delivered' ? 'text-emerald-600' : 'text-orange-600')}>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="packed">Packed</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-1">
                    <button onClick={() => setSelectedOrder(order)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"><Eye size={14} /></button>
                    <button 
                      onClick={async () => {
                        const items = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, { eq: { column: 'order_id', value: order.id } });
                        const commands = await handleERPAction(null, ACTION_TYPES.GENERATE_BILL, { order, items });
                        alert("Printer Command Generated:\n\n" + commands.data);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all"
                    >
                      <Printer size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Order Details: #{selectedOrder.order_number}</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white rounded-lg border border-slate-200 transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer & Shipping Info */}
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <User size={12} /> Customer Info
                      </h4>
                      <p className="text-[11px] font-black text-slate-800">{selectedOrder.user_mobile}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">Contact: {selectedOrder.delivery_contact}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <MapPin size={12} /> Shipping Address
                      </h4>
                      <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">
                        {selectedOrder.delivery_address}
                      </p>
                      <p className="text-[10px] font-black text-slate-800 mt-2">PIN: {selectedOrder.delivery_pincode}</p>
                    </div>
                  </div>

                  {/* Payment & Status Info */}
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <CreditCard size={12} /> Payment Details
                      </h4>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Method:</span>
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{selectedOrder.payment_method}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Status:</span>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          selectedOrder.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                        )}>{selectedOrder.payment_status}</span>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Truck size={12} /> Logistics Status
                      </h4>
                      <select 
                        value={selectedOrder.status} 
                        onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                        className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700 focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="packed">Packed</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Rate</th>
                        <th className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loadingItems ? (
                        <tr><td colSpan="4" className="px-4 py-8 text-center"><RefreshCw className="animate-spin mx-auto text-blue-500" size={20} /></td></tr>
                      ) : orderItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 flex items-center gap-3">
                            <img src={item.product_image_url} alt="" className="w-8 h-8 rounded bg-slate-50 object-contain border border-slate-100" />
                            <span className="text-[10px] font-bold text-slate-700">{item.product_name}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-[10px] font-black text-slate-800">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-[10px] font-bold text-slate-600">₹{item.sale_rate}</td>
                          <td className="px-4 py-3 text-right text-[10px] font-black text-slate-800">₹{item.quantity * item.sale_rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Billing Summary */}
                <div className="flex justify-end">
                  <div className="w-full md:w-64 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Subtotal:</span>
                      <span>₹{selectedOrder.total_amount}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Delivery:</span>
                      <span>₹{selectedOrder.delivery_fee}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                      <span>Discount:</span>
                      <span>-₹{selectedOrder.discount_amount}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-800 uppercase tracking-tighter">
                      <span>Grand Total:</span>
                      <span>₹{selectedOrder.final_amount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Close
                </button>
                <button 
                  onClick={async () => {
                    const commands = await handleERPAction(null, ACTION_TYPES.GENERATE_BILL, { order: selectedOrder, items: orderItems });
                    alert("Printer Command Generated:\n\n" + commands.data);
                  }}
                  className="px-6 py-2 bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-200 hover:translate-y-[-1px] transition-all"
                >
                  <Printer size={14} /> Print Invoice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CouponMasterView({ title, table, data, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ is_active: true, discount_type: 'percentage' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredData = (data || []).filter(item => 
    item.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }
      if (res && !res.success) throw new Error(res.error);
      setShowForm(false);
      setEditingItem(null);
      setFormData({ is_active: true, discount_type: 'percentage' });
      await fetchInitialData();
      alert(`Coupon saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-slate-100 rounded text-slate-900 border border-slate-200">
            <Tag size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search Coupon Code"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setEditingItem(null); setFormData({ is_active: true, discount_type: 'percentage' }); setShowForm(true); }}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Create New
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Code</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Discount</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Min Order</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length > 0 ? filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4 text-[11px] font-black text-slate-900 uppercase">{item.code}</td>
                <td className="px-6 py-4 text-[11px] font-bold text-slate-600">
                  {item.discount_value} {item.discount_type === 'percentage' ? '%' : '₹'}
                </td>
                <td className="px-6 py-4 text-[11px] font-bold text-slate-600">₹{item.min_order_amount}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                    <button onClick={async () => {
                      // Immediate delete without confirmation
                      await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                      fetchInitialData();
                    }} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="4" className="py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No coupons found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Coupon [ {editingItem ? 'MODIFY' : 'NEW'} ]</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Coupon Code</label>
                    <input type="text" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Type</label>
                    <select value={formData.discount_type} onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm font-black text-black focus:border-blue-400 outline-none">
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Value</label>
                    <input type="number" value={formData.discount_value || ''} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Min Order</label>
                    <input type="number" value={formData.min_order_amount || ''} onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Max Discount</label>
                    <input type="number" value={formData.max_discount || ''} onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} id="coupon_active" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <label htmlFor="coupon_active" className="text-[11px] font-bold text-slate-700 uppercase">Active Status</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 transition-all">
                    {isSubmitting ? 'Saving...' : 'Save'}
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

function OffersMasterView({ title, table, bucket, data, uploadImage, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ is_active: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredData = (data || []).filter(item => 
    item.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      if (finalData.image_file) {
        const { url, error: uploadError } = await uploadImage(finalData.image_file, bucket || 'banner-images');
        if (uploadError) throw new Error(uploadError);
        finalData.image_url = url;
        delete finalData.image_file;
      }
      
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }
      if (res && !res.success) throw new Error(res.error);
      setShowForm(false);
      setEditingItem(null);
      setFormData({ is_active: true });
      await fetchInitialData();
      alert(`Offer saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-slate-100 rounded text-slate-900 border border-slate-200">
            <Zap size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search Offers" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <button onClick={() => { setEditingItem(null); setFormData({ is_active: true }); setShowForm(true); }} className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2">
          <Plus size={18} /> Create New
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredData.length > 0 ? filteredData.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm group">
            <div className="h-40 bg-slate-100 relative">
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }} className="bg-white p-2 rounded-lg text-blue-600 shadow-md hover:bg-blue-50"><Edit2 size={14} /></button>
                <button onClick={async () => {
                  // Immediate delete without confirmation
                  await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                  fetchInitialData();
                }} className="bg-white p-2 rounded-lg text-red-600 shadow-md hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="text-xs font-black text-slate-900 uppercase">{item.title}</h3>
                <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full", item.is_active ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 line-clamp-2 mb-2">{item.description}</p>
              <p className="text-[11px] font-black text-blue-700">{item.discount}</p>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No offers found</div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Offer [ {editingItem ? 'MODIFY' : 'NEW'} ]</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Offer Title</label>
                  <input type="text" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Description</label>
                  <textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none min-h-[80px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Discount Text</label>
                    <input type="text" value={formData.discount || ''} onChange={(e) => setFormData({ ...formData, discount: e.target.value })} placeholder="e.g. 50% OFF" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Offer Image</label>
                    <input type="file" onChange={(e) => setFormData({ ...formData, image_file: e.target.files[0] })} className="w-full text-xs" />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} id="offer_active" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <label htmlFor="offer_active" className="text-[11px] font-bold text-slate-700 uppercase">Active Status</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 transition-all">
                    {isSubmitting ? 'Saving...' : 'Save'}
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

function PincodeMasterView({ title, table, data, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ is_allowed: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredData = (data || []).filter(item => 
    item.pincode?.includes(searchTerm)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }
      if (res && !res.success) throw new Error(res.error);
      setShowForm(false);
      setEditingItem(null);
      setFormData({ is_allowed: true });
      await fetchInitialData();
      alert(`Pincode saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-slate-100 rounded text-slate-900 border border-slate-200">
            <MapPin size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search Pincode" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <button onClick={() => { setEditingItem(null); setFormData({ is_allowed: true }); setShowForm(true); }} className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2">
          <Plus size={18} /> Create New
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm max-w-2xl mx-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Pincode</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Serviceable</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length > 0 ? filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4 text-[11px] font-black text-slate-900">{item.pincode}</td>
                <td className="px-6 py-4">
                  <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full", item.is_allowed ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                    {item.is_allowed ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                    <button onClick={async () => {
                      // Immediate delete without confirmation
                      await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                      fetchInitialData();
                    }} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="3" className="py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No pincodes found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Pincode [ {editingItem ? 'MODIFY' : 'NEW'} ]</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Pincode</label>
                  <input type="text" value={formData.pincode || ''} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} maxLength="6" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" required />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" checked={formData.is_allowed} onChange={(e) => setFormData({ ...formData, is_allowed: e.target.checked })} id="pincode_active" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <label htmlFor="pincode_active" className="text-[11px] font-bold text-slate-700 uppercase">Serviceable Status</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 transition-all">
                    {isSubmitting ? 'Saving...' : 'Save'}
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

function WalletMasterView({ users, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [walletModal, setWalletModal] = useState({ show: false, user: null, amount: 0, type: 'credit' });
  
  const filteredUsers = (users || []).filter(u => 
    u.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.mobile?.includes(searchTerm)
  );

  const handleWalletUpdate = async () => {
    try {
      const { user, amount, type } = walletModal;
      if (!amount || amount <= 0) return alert("Enter valid amount");
      const res = await handleERPAction(null, ACTION_TYPES.WALLET_ADJUST, {
        userId: user.user_id,
        amount: parseFloat(amount),
        type: type,
        reason: `Manual Adjustment by Admin`
      });
      if (res.success) {
        alert("Wallet Adjusted & Logged!");
        setWalletModal({ show: false, user: null, amount: 0, type: 'credit' });
        fetchInitialData();
      } else {
        throw new Error(res.error);
      }
    } catch (error) { 
      alert("Error: " + error.message); 
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-slate-100 rounded text-slate-900 border border-slate-200">
            <Wallet size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Wallet Master</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search User / Mobile" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">User / Mobile</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Current Balance</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <p className="text-[11px] font-black text-slate-900 uppercase">{user.user_id}</p>
                  <p className="text-[9px] font-bold text-slate-400">{user.mobile}</p>
                </td>
                <td className="px-6 py-4 text-center font-black text-blue-700 text-[13px]">₹{user.current_balance || 0}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setWalletModal({ show: true, user, amount: 0, type: 'credit' })} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-blue-700">Adj. Wallet</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="3" className="py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {walletModal.show && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Adjust Wallet</h3>
                <button onClick={() => setWalletModal({ show: false, user: null, amount: 0, type: 'credit' })} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">User ID</p>
                  <p className="text-[11px] font-black text-slate-800">{walletModal.user.user_id}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Adjustment Type</label>
                  <select value={walletModal.type} onChange={(e) => setWalletModal({ ...walletModal, type: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm font-black text-black focus:border-blue-400 outline-none">
                    <option value="credit">Credit (Add Money)</option>
                    <option value="debit">Debit (Deduct Money)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Amount (₹)</label>
                  <input type="number" value={walletModal.amount} onChange={(e) => setWalletModal({ ...walletModal, amount: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" required />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button onClick={handleWalletUpdate} className="w-full bg-blue-600 text-white py-3 rounded-lg font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 transition-all">Confirm Adjustment</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddressMasterView({ title, table, data, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ is_default: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredData = (data || []).filter(item => 
    item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const finalData = { ...formData };
      let res;
      if (editingItem) {
        res = await handleERPAction(table, ACTION_TYPES.UPDATE, { id: editingItem.id, ...finalData });
      } else {
        finalData.id = finalData.id || generateUUID();
        res = await handleERPAction(table, ACTION_TYPES.INSERT, finalData);
      }
      if (res && !res.success) throw new Error(res.error);
      setShowForm(false);
      setEditingItem(null);
      setFormData({ is_default: false });
      await fetchInitialData();
      alert(`Address saved successfully!`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-slate-100 rounded text-slate-900 border border-slate-200">
            <MapPin size={20} />
          </div>
          <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">{title}</h2>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search Address / User" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <button onClick={() => { setEditingItem(null); setFormData({ is_default: false }); setShowForm(true); }} className="bg-white text-blue-600 px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2">
          <Plus size={18} /> Create New
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">User ID</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Customer Name</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Address Details</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length > 0 ? filteredData.map((item) => (
              <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">{item.user_id}</td>
                <td className="px-6 py-4 text-[11px] font-black text-slate-900 uppercase">{item.full_name}</td>
                <td className="px-6 py-4 text-[11px] font-bold text-slate-600">
                  {item.house_no}, {item.city} - {item.pincode}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setEditingItem(item); setFormData(item); setShowForm(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                    <button onClick={async () => {
                      // Immediate delete without confirmation
                      await handleERPAction(table, ACTION_TYPES.DELETE, { id: item.id });
                      fetchInitialData();
                    }} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="4" className="py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No addresses found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">Address [ {editingItem ? 'MODIFY' : 'NEW'} ]</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">User ID</label>
                  <input type="text" value={formData.user_id || ''} onChange={(e) => setFormData({ ...formData, user_id: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Full Name</label>
                  <input type="text" value={formData.full_name || ''} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">House No</label>
                    <input type="text" value={formData.house_no || ''} onChange={(e) => setFormData({ ...formData, house_no: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">City</label>
                    <input type="text" value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Mobile No</label>
                    <input type="text" value={formData.mobile || ''} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase ml-1">Pincode</label>
                    <input type="text" value={formData.pincode || ''} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} maxLength="6" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-black text-black focus:border-blue-400 outline-none" />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} id="addr_default" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  <label htmlFor="addr_default" className="text-[11px] font-bold text-slate-700 uppercase">Set as Default</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-black uppercase text-[10px] shadow-lg hover:bg-blue-700 transition-all">
                    {isSubmitting ? 'Saving...' : 'Save'}
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

function UsersView({ users, fetchInitialData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [walletModal, setWalletModal] = useState({ show: false, user: null, amount: 0, type: 'credit' });
  
  const filteredUsers = (users || []).filter(u => 
    u.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleWalletUpdate = async () => {
    try {
      const { user, amount, type } = walletModal;
      const res = await handleERPAction(null, ACTION_TYPES.WALLET_ADJUST, {
        userId: user.user_id,
        amount: parseFloat(amount),
        type: type,
        reason: `Manual Adjustment by Admin`
      });
      if (res.success) {
        alert("Wallet Adjusted & Logged!");
        setWalletModal({ show: false, user: null, amount: 0, type: 'credit' });
        fetchInitialData();
      } else {
        throw new Error(res.error);
      }
    } catch (error) { 
      alert("Error: " + error.message); 
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-800" size={14} />
          <input 
            type="text" 
            placeholder="Filter User Database..." 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-[10px] font-black focus:ring-1 focus:ring-blue-500 transition-all text-slate-900 placeholder-slate-400" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest">User Details</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest text-center">Credit Balance</th>
              <th className="px-4 py-3 text-[9px] font-black text-slate-800 uppercase tracking-widest text-right">Ledger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-2.5">
                  <p className="text-[10px] font-black text-slate-800 leading-none">{user.user_id}</p>
                </td>
                <td className="px-4 py-2.5 text-center font-black text-slate-800 text-[11px]">
                  ₹{user.current_balance || 0}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button 
                    onClick={() => setWalletModal({ show: true, user, amount: 0, type: 'credit' })} 
                    className="bg-blue-700 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-md"
                  >
                    Adj. Wallet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Wallet Modal */}
      <AnimatePresence>
        {walletModal.show && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm">
              <h3 className="text-xs font-black uppercase tracking-widest mb-4">Adjust Wallet Balance</h3>
              <p className="text-[10px] font-bold text-slate-500 mb-4">User ID: {walletModal.user.user_id}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Amount (₹)</label>
                  <input 
                    type="number" 
                    value={walletModal.amount} 
                    onChange={(e) => setWalletModal({ ...walletModal, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-black"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Transaction Type</label>
                  <select 
                    value={walletModal.type} 
                    onChange={(e) => setWalletModal({ ...walletModal, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm font-black"
                  >
                    <option value="credit">Credit (Add Money)</option>
                    <option value="debit">Debit (Deduct Money)</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setWalletModal({ show: false, user: null, amount: 0, type: 'credit' })} className="flex-1 py-2 text-[10px] font-black uppercase bg-slate-100 rounded-xl">Cancel</button>
                  <button onClick={handleWalletUpdate} className="flex-1 py-2 text-[10px] font-black uppercase bg-blue-700 text-white rounded-xl shadow-lg">Confirm</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Field Definitions ---
const BANNER_FIELDS = [
  { name: 'image_url', label: 'Banner Image', type: 'image' },
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'text' },
  { name: 'redirect_path', label: 'Redirect Path', type: 'text' },
  { name: 'position', label: 'Position', type: 'number' },
  { name: 'is_active', label: 'Status', type: 'boolean' }
];

const MAIN_CATEGORY_FIELDS = [
  { name: 'name', label: 'Category Name', type: 'text', required: true },
  { name: 'image_url', label: 'Picture', type: 'image' },
  { name: 'is_active', label: 'Status', type: 'boolean' }
];

const CATEGORY_FIELDS = [
  { name: 'image_url', label: 'Image', type: 'image' }, 
  { name: 'name', label: 'Name', type: 'text', required: true }, 
  { name: 'position', label: 'Pos', type: 'number' }, 
  { name: 'is_active', label: 'Status', type: 'boolean' }
];

const SUBCATEGORY_FIELDS = [
  { name: 'image_url', label: 'Image', type: 'image' },
  { name: 'name', label: 'Name', type: 'text', required: true }, 
  { name: 'category_id', label: 'Category ID', type: 'text', required: true }, 
  { name: 'position', label: 'Pos', type: 'number' },
  { name: 'is_active', label: 'Status', type: 'boolean' }
];

const BRAND_FIELDS = [
  { name: 'logo_url', label: 'Logo', type: 'image' }, 
  { name: 'name', label: 'Name', type: 'text', required: true }, 
  { name: 'position', label: 'Pos', type: 'number' },
  { name: 'is_active', label: 'Status', type: 'boolean' }
];

const COUPON_FIELDS = [
  { name: 'code', label: 'Code', type: 'text', required: true }, 
  { name: 'discount_type', label: 'Type', type: 'select', options: [{label: 'Percentage', value: 'percentage'}, {label: 'Fixed', value: 'fixed'}] },
  { name: 'discount_value', label: 'Value', type: 'number' }, 
  { name: 'min_order_amount', label: 'Min Order', type: 'number' },
  { name: 'max_discount', label: 'Max Disc', type: 'number' },
  { name: 'is_active', label: 'Status', type: 'boolean' }
];

const OFFER_FIELDS = [
  { name: 'image_url', label: 'Offer Image', type: 'image' },
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'text' },
  { name: 'discount', label: 'Discount Text', type: 'text' },
  { name: 'is_active', label: 'Status', type: 'boolean' }
];

const PINCODE_FIELDS = [
  { name: 'pincode', label: 'Pincode', type: 'text', required: true },
  { name: 'is_allowed', label: 'Serviceable', type: 'boolean' }
];

const HOME_CONFIG_FIELDS = [
  { name: 'key', label: 'Config Key', type: 'text', required: true },
  { name: 'value', label: 'Config Value', type: 'text', required: true }
];

const ADDRESS_FIELDS = [
  { name: 'user_id', label: 'User ID', type: 'text', required: true },
  { name: 'full_name', label: 'Full Name', type: 'text' },
  { name: 'house_no', label: 'House No', type: 'text' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'pincode', label: 'Pincode', type: 'text' },
  { name: 'is_default', label: 'Default', type: 'boolean' }
];
