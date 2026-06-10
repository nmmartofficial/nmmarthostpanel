import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
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
  Repeat, Wrench, ArrowLeftRight, Key, QrCode,
  Pause, Star, LayoutGrid, TrendingUp, TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { dbSync } from './dbSync';
import { DB_SCHEMA, USER_ROLES } from './dbSchema';
import { handleERPAction, ERP_MODULES, ACTION_TYPES, parseERPCSV } from './erpController';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'sonner';

import MasterListView from './components/MasterListView';

// Import New Pages
import DashboardView from './pages/DashboardView';
import ProductsView from './pages/Inventory/ProductsView';
import OrdersView from './pages/Orders/OrdersView';
import NotificationsView from './pages/NotificationsView';
import SupportTicketsView from './pages/SupportTicketsView';
import AppConfigView from './pages/AppConfigView';
import AnalyticsView from './pages/AnalyticsView';
import POSView from './pages/POSView';
import ProfitLossView from './pages/ProfitLossView';
import HomeLayoutManager from './pages/HomeLayoutManager';
import SuppliersView from './pages/Inventory/SuppliersView';
import PurchaseEntryView from './pages/Inventory/PurchaseEntryView';
import StockLogsView from './pages/Inventory/StockLogsView';
import ExpensesView from './pages/ExpensesView';
import PurchaseView from './pages/Inventory/PurchaseView';

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

// --- Helper: Pagination Footer ---
function PaginationFooter({ currentPage, totalPages, rowsPerPage, setRowsPerPage, setCurrentPage, totalRecords }) {
  if (totalRecords === 0) return null;
  
  return (
    <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rows per page:</span>
          <select 
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[10px] font-black focus:ring-1 focus:ring-blue-500 transition-all"
          >
            {[10, 20, 50, 100, 500].map(val => <option key={val} value={val}>{val}</option>)}
          </select>
        </div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, totalRecords)} of {totalRecords}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
          title="First Page"
        >
          <div className="flex items-center">
            <ChevronDown size={14} className="rotate-90" />
            <ChevronDown size={14} className="rotate-90 -ml-2" />
          </div>
        </button>
        <button 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
        >
          <ChevronDown size={14} className="rotate-90" />
        </button>
        
        <div className="flex items-center gap-1">
          {(() => {
            const pages = [];
            const maxVisible = 5;
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, start + maxVisible - 1);
            
            if (end - start < maxVisible - 1) {
              start = Math.max(1, end - maxVisible + 1);
            }

            for (let i = start; i <= end; i++) {
              pages.push(
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                    currentPage === i ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {i}
                </button>
              );
            }
            return pages;
          })()}
        </div>

        <button 
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(prev => prev + 1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
        >
          <ChevronDown size={14} className="-rotate-90" />
        </button>
        <button 
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(totalPages)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
          title="Last Page"
        >
          <div className="flex items-center">
            <ChevronDown size={14} className="-rotate-90" />
            <ChevronDown size={14} className="-rotate-90 -ml-2" />
          </div>
        </button>
      </div>
    </div>
  );
}

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
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black transition-all whitespace-nowrap uppercase tracking-tighter shadow-sm",
          isActive ? "text-white bg-blue-600 shadow-blue-200" : "text-slate-900 bg-white border border-slate-200 hover:bg-slate-50"
        )}
      >
        <span className={cn(isActive ? "text-white" : "text-slate-800")}>{icon}</span>
        <span>{label}</span>
        <ChevronDown size={12} className={cn("transition-transform opacity-70", isOpen && "rotate-180")} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "absolute left-0 mt-2 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 py-2 z-[200] overflow-hidden w-64"
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

function GuardVerificationView({ orders, appConfig, fetchInitialData }) {
  const [scanTerm, setScanTerm] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [lastVerified, setLastVerified] = useState(null);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!scanTerm) return;
    setVerifying(true);
    
    try {
      // Find order by ID or Number
      const order = orders.find(o => o.id === scanTerm || o.order_number === scanTerm);
      if (!order) throw new Error("Order not found!");

      if (order.order_status === 'verified') {
        alert("This order is already verified!");
        setLastVerified(order);
      } else {
        await handleERPAction(DB_SCHEMA.ORDERS.table, ACTION_TYPES.UPDATE, {
          id: order.id,
          order_status: 'verified'
        });
        alert(`Order #${order.order_number} Verified Successfully!`);
        setLastVerified({ ...order, order_status: 'verified' });
        fetchInitialData(true, true);
      }
      setScanTerm('');
    } catch (err) {
      alert(err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-10">
      <div className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-2xl text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
        
        <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner transform rotate-12">
          <ShieldCheck size={48} className="-rotate-12" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Guard Verification</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
            Scan Customer's Exit Pass to verify payment
          </p>
        </div>

        <form onSubmit={handleVerify} className="relative group max-w-sm mx-auto">
          <div className="absolute inset-0 bg-blue-600/5 blur-2xl rounded-full scale-150 opacity-0 group-focus-within:opacity-100 transition-all duration-500" />
          <input 
            type="text"
            placeholder="Scan / Enter Order ID"
            className="relative w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-6 text-center text-xl font-black uppercase tracking-[0.1em] focus:bg-white focus:border-blue-500 focus:ring-0 transition-all outline-none shadow-inner"
            value={scanTerm}
            onChange={(e) => setScanTerm(e.target.value)}
            autoFocus
          />
          {verifying && <RefreshCw className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={24} />}
        </form>

        <div className="pt-6 border-t border-slate-50 flex justify-center gap-4">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-600 uppercase bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Scanner Active
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lastVerified && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-emerald-600 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-200 flex items-center justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            <div className="flex items-center gap-6 relative z-10">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md"><CheckCircle size={32} /></div>
              <div>
                <p className="text-[10px] font-black uppercase opacity-70 tracking-[0.2em] mb-1">Last Verified Order</p>
                <h4 className="text-xl font-black tracking-tighter leading-none">#{lastVerified.order_number}</h4>
                <p className="text-sm font-bold opacity-90 mt-1 uppercase">{lastVerified.customer_name}</p>
              </div>
            </div>
            <div className="text-right relative z-10">
              <p className="text-[10px] font-black uppercase opacity-70 tracking-[0.2em] mb-1">Amount Paid</p>
              <h4 className="text-3xl font-black tracking-tighter">{lastVerified.total_amount}</h4>
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
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('nm_user_data');
    return saved ? JSON.parse(saved) : null;
  });
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // --- Refs for Stability (Infinite Loop Prevention) ---
  const isFetchingRef = useRef(false);
  const mountRef = useRef(false);
  const subscriptionsRef = useRef([]);

  // --- Auth Check ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!pin) return; // Prevent empty submit
    setIsProcessing(true);
    try {
      // Secure server-side PIN verification using RPC
      const { data: isValid, error } = await supabase.rpc('verify_admin_pin', { input_pin: pin });
      
      if (error) throw error;

      if (isValid) {
        // Fetch user details for profile and role
        const { data: userData } = await supabase
          .from(DB_SCHEMA.ADMIN_USERS.table)
          .select('*')
          .eq('pin', pin)
          .single();

        const profile = userData || { username: 'Admin', role: 'super_admin' };
        setCurrentUser(profile);
        localStorage.setItem('nm_user_data', JSON.stringify(profile));

        setIsAuthorized(true);
        localStorage.setItem('nm_admin_auth', 'true');
        localStorage.setItem('nm_auth_time', Date.now().toString());
        toast.success('Access Granted');
      } else {
        toast.error('Invalid Security PIN');
        setPin('');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Fallback to environment variable if database is disconnected
      const fallbackPin = import.meta.env.VITE_ADMIN_SECURITY_PIN || '1234';
      if (pin === fallbackPin) {
        const profile = { username: 'Offline Admin', role: 'super_admin' };
        setCurrentUser(profile);
        localStorage.setItem('nm_user_data', JSON.stringify(profile));

        setIsAuthorized(true);
        localStorage.setItem('nm_admin_auth', 'true');
        toast.success('Offline Access Granted');
      } else {
        toast.error('Connection Error or Invalid PIN');
      }
    } finally {
      setIsProcessing(false);
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
          // Safety: If item was soft-deleted (is_active: false), remove it from state
          if (newRecord.is_active === false) {
            return prev.filter(item => item.id !== newRecord.id);
          }
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

  const fetchInitialData = useCallback(async (force = false, silent = false) => {
    if (isFetchingRef.current) return;
    const now = Date.now();
    // Strict 5s debounce for global refetch to kill any lingering loops, unless forced
    if (!force && mountRef.current && (now - mountRef.current < 5000)) return; 
    
    isFetchingRef.current = true;
    mountRef.current = now; 

    if (!silent) setLoading(true);
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
        dbSync.fetch(DB_SCHEMA.ACCOUNTS.table),
        dbSync.fetch(DB_SCHEMA.INVENTORY_LOGS.table, { order: { column: 'created_at', ascending: false }, limit: 100 }),
        dbSync.fetch(DB_SCHEMA.EXPENSES.table, { order: { column: 'date', ascending: false } })
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
      const inventoryLogsData = getData(25);
      const expensesData = getData(26);

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
      setInventoryLogs(inventoryLogsData);
      setExpenses(expensesData);

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
  }, []);

  useEffect(() => {
    if (localStorage.getItem('nm_admin_auth') === 'true') {
      setIsAuthorized(true);
    }
    
    // Initial fetch only once on true mount
    if (!mountRef.current) {
      fetchInitialData(false, false);
    }

    const setupSubscriptions = () => {
      subscriptionsRef.current.forEach(s => s.unsubscribe());
      
      const tablesToWatch = [
        DB_SCHEMA.ORDERS.table,
        DB_SCHEMA.PRODUCTS.table,
        DB_SCHEMA.NOTIFICATIONS.table,
        DB_SCHEMA.BANNERS.table,
        DB_SCHEMA.BRANDS.table,
        DB_SCHEMA.CATEGORIES.table,
        DB_SCHEMA.WALLET_MASTER.table
      ];

      subscriptionsRef.current = tablesToWatch.map(table => 
        dbSync.subscribe(table, (payload) => handleRealtimeUpdate(table, payload))
      );
    };

    setupSubscriptions();
    return () => subscriptionsRef.current.forEach(s => s.unsubscribe());
  }, [handleRealtimeUpdate, fetchInitialData]);

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

  // --- Step 2: Session Timeout Logic ---
  useEffect(() => {
    if (!isAuthorized) return;

    const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout('Session expired due to inactivity');
      }, TIMEOUT_DURATION);
    };

    const handleLogout = (msg) => {
      localStorage.removeItem('nm_admin_auth');
      localStorage.removeItem('nm_user_data');
      setIsAuthorized(false);
      toast.warning(msg);
    };

    // Events to track user activity
    const events = ['mousemove', 'keypress', 'scroll', 'click', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthorized]);

  // --- RBAC: Filter Navigation Items (Hooks must be before conditional return) ---
  const userRole = currentUser?.role || 'super_admin';
  const roleData = useMemo(() => {
    return Object.values(USER_ROLES).find(r => r.id === userRole) || USER_ROLES.SUPER_ADMIN;
  }, [userRole]);
  
  const isAllowed = useCallback((tabId) => {
    if (roleData.allowedTabs.includes('*')) return true;
    return roleData.allowedTabs.includes(tabId);
  }, [roleData]);

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
              placeholder=""
              disabled={isProcessing}
              className="w-full bg-slate-100 border-none rounded-2xl px-6 py-4 text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-primary transition-all font-black text-slate-900 placeholder-slate-400 disabled:opacity-50"
              autoFocus
            />
            <button 
              type="submit"
              disabled={isProcessing}
              className="w-full bg-secondary text-primary font-black py-4 rounded-2xl hover:bg-black transition-all uppercase tracking-widest shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Verifying...' : 'Authorize Access'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

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
    { id: 'Suppliers', label: 'Supplier Master', icon: <Users size={14} /> },
  ].filter(item => isAllowed(item.id));

  const inventoryItems = [
    { id: 'PurchaseEntry', label: 'Purchase Entry', icon: <ShoppingBag size={14} /> },
    { id: 'StockLogs', label: 'Stock Movement Logs', icon: <History size={14} /> },
    { id: 'Products', label: 'Current Stock', icon: <Package size={14} /> },
  ].filter(item => isAllowed(item.id));

  const reportItemsNav = [
    { id: 'SaleSummary', label: 'Sale Summary', icon: <FileText size={14} /> },
    { id: 'SaleReportBill', label: 'Sale Bill Report', icon: <FileText size={14} /> },
    { id: 'SaleReportItem', label: 'Sale Item Report', icon: <FileText size={14} /> },
    { id: 'SaleReportItemSummary', label: 'Sale Item Summary', icon: <FileText size={14} /> },
    { id: 'SaleTrashBill', label: 'Trash Bill Report', icon: <Trash size={14} /> },
    { id: 'SaleCancelledBill', label: 'Cancelled Bill Report', icon: <XCircle size={14} /> },
    { id: 'PurchaseReport', label: 'Purchase Report', icon: <FileText size={14} /> },
    { id: 'StockReport', label: 'Stock Report', icon: <History size={14} /> },
    { id: 'ItemStatement', label: 'Item Statement', icon: <FileText size={14} /> },
    { id: 'Logbook', label: 'Log Book', icon: <Book size={14} /> },
    { id: 'LedgerView', label: 'Ledger View', icon: <Book size={14} /> },
    { id: 'PaymentReportDB', label: 'Delivery Payment', icon: <CreditCard size={14} /> },
    { id: 'CreditReport', label: 'Credit Report', icon: <FileText size={14} /> },
    { id: 'PaymentReminder', label: 'Payment Reminder', icon: <RefreshCw size={14} /> },
    { id: 'ProfitLoss', label: 'Profit & Loss Analysis', icon: <TrendingUp size={14} /> },
    { id: 'Expenses', label: 'Expense Management', icon: <Receipt size={14} /> },
  ].filter(item => isAllowed(item.id));

  const viewItems = [
    { id: 'Orders', label: 'Self-Checkout Tracker', icon: <QrCode size={14} />, shortcut: 'F9' },
    { id: 'OnlineOrder', label: 'Online Order', icon: <Monitor size={14} /> },
    { id: 'BillView', label: 'Bill View', icon: <Database size={14} /> },
    { id: 'BillViewDelivery', label: 'Bill View (Delivery)', icon: <Database size={14} /> },
    { id: 'BranchBill', label: 'Branch Bill', icon: <GitBranch size={14} /> },
    { id: 'PaymentMobile', label: 'Payment (Mobile No)', icon: <IndianRupee size={14} /> },
    { id: 'WalletRecharge', label: 'Wallet recharge', icon: <IndianRupee size={14} /> },
  ].filter(item => isAllowed(item.id));

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
  ].filter(item => isAllowed(item.id));

  const toolsItems = [
    { id: 'AppConfig', label: 'CONFIGURATION', icon: <Settings size={14} /> },
    { id: 'GuardVerification', label: 'GUARD VERIFICATION', icon: <ShieldCheck size={14} />, hidden: !appConfig?.enable_guard_verification },
    { id: 'StoreItemDisplay', label: 'STORE ITEM DISPLAY', icon: <ArrowLeftRight size={14} /> },
    { id: 'StoreSubCatDisplay', label: 'STORE SUB-CAT DISPLAY', icon: <ArrowLeftRight size={14} /> },
    { id: 'StoreMainCatDisplay', label: 'STORE MAIN-CAT DISPLAY', icon: <ArrowLeftRight size={14} /> },
    { id: 'TestBluetooth', label: 'TEST BLUETOOTH', icon: <ArrowLeftRight size={14} /> },
  ].filter(item => isAllowed(item.id));

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
              {masterItems.length > 0 && (
                <NavDropdown 
                  label="Master" 
                  icon={<Monitor size={14} className="mr-1.5" />} 
                  items={masterItems} 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                />
              )}
              
              {isAllowed('POS') && (
                <button 
                  onClick={() => setActiveTab('POS')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black transition-all whitespace-nowrap uppercase tracking-tighter",
                    activeTab === 'POS' ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <ShoppingCart size={14} className="text-slate-500" />
                  <span>Sale Entry</span>
                </button>
              )}

              {isAllowed('Purchase') && (
                <button 
                  onClick={() => setActiveTab('Purchase')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black transition-all whitespace-nowrap uppercase tracking-tighter",
                    activeTab === 'Purchase' ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Package size={14} className="text-slate-500" />
                  <span>Purchase</span>
                </button>
              )}

              {viewItems.length > 0 && (
                <NavDropdown 
                  label="View" 
                  icon={<List size={14} className="mr-1.5" />} 
                  items={viewItems} 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                />
              )}

              {reportItemsNav.length > 0 && (
                <NavDropdown 
                  label="Report" 
                  icon={<FileText size={14} className="mr-1.5" />} 
                  items={reportItemsNav} 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                />
              )}

              {storeItems.length > 0 && (
                <NavDropdown 
                  label="Store" 
                  icon={<Building2 size={14} className="mr-1.5" />} 
                  items={storeItems} 
                  activeTab={activeTab} 
                  setActiveTab={setActiveTab} 
                />
              )}

              {isAllowed('Transaction') && (
                <button 
                  onClick={() => setActiveTab('Transaction')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black transition-all whitespace-nowrap uppercase tracking-tighter",
                    activeTab === 'Transaction' ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <RefreshCw size={14} className="text-slate-500" />
                  <span>Transaction</span>
                </button>
              )}

              {toolsItems.length > 0 && (
                <NavDropdown 
                  label="Tools" 
                  icon={<Wrench size={14} className="mr-1.5" />} 
                  items={[...toolsItems.filter(i => !i.hidden), { id: 'Logout', label: 'LOGOUT SYSTEM', icon: <LogOut size={14} /> }]} 
                  activeTab={activeTab} 
                  setActiveTab={(tab) => {
                    if (tab === 'Logout') {
                      if (window.confirm("Are you sure you want to Logout?")) {
                        localStorage.removeItem('nm_admin_auth');
                        localStorage.removeItem('nm_auth_time');
                        setIsAuthorized(false);
                        toast.info('Logged out successfully');
                      }
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
              )}
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
                <span className="text-xs font-black text-blue-900 uppercase tracking-tighter leading-none">{currentUser?.username || BRAND_NAME}</span>
                <span className="text-[8px] font-black text-slate-800 uppercase tracking-widest leading-tight">
                  {roleData.label}
                </span>
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
                    {reportItemsNav.map(item => (
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
                purchases, departments, units, accounts, inventoryLogs, expenses,
                setAppConfig, setBanners, setCategories, setSubcategories, setBrands, setProducts, setOrders, setUsers, setCoupons,
                setAdminUsers, setCredits, setDeliveryBoys, setDeliveryCustomers, setPurchases, setDepartments, setUnits, setAccounts,
                uploadImage, fetchInitialData, setLoading
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = useMemo(() => {
    return reportData.filter(row => 
      row.ledgerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      row.vNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reportData, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
                    <td className="px-4 py-2 text-xs font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-xs font-black text-right text-slate-900">{item.amount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-xs font-medium text-slate-500 italic">{item.remarks}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-700 text-white font-black">
                  <td className="px-4 py-2 text-right text-[10px] uppercase tracking-widest">Total :</td>
                  <td className="px-4 py-2 text-right text-xs">{totalAmount.toFixed(2)}</td>
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
                <span className="text-xl font-black tracking-tighter">{totalAmount.toFixed(2)}</span>
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
          className="flex items-center gap-2 px-4 py-1.5 border-2 border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all shadow-sm"
        >
          <Plus size={14} /> Transaction
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 bg-white">
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase tracking-tight text-center">Date</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase tracking-tight text-center">V No</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase tracking-tight text-center">Type</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase tracking-tight text-center">Time</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase tracking-tight text-center">Ledger Name</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase tracking-tight text-center">Dr</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase tracking-tight text-center">Cr</th>
                <th className="px-6 py-4 text-xs font-black text-slate-800 uppercase tracking-tight text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                    No transactions found
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-xs font-bold text-slate-600 text-center">{row.date}</td>
                    <td className="px-6 py-3 text-xs font-black text-blue-700 text-center">{row.vNo}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded",
                        row.type === 'CR' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                      )}>{row.type}</span>
                    </td>
                    <td className="px-6 py-3 text-xs font-medium text-slate-500 text-center">{row.time}</td>
                    <td className="px-6 py-3 text-xs font-black text-slate-800 uppercase text-center">{row.ledgerName}</td>
                    <td className="px-6 py-3 text-xs font-bold text-red-600 text-center">{row.dr > 0 ? row.dr.toFixed(2) : ''}</td>
                    <td className="px-6 py-3 text-xs font-bold text-emerald-600 text-center">{row.cr > 0 ? row.cr.toFixed(2) : ''}</td>
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

        <PaginationFooter 
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setCurrentPage={setCurrentPage}
          totalRecords={filteredData.length}
        />
      </div>
    </div>
  );
}

function WastageReportView({ products }) {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = reportData;
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
          <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
            <Search size={14} /> Show
          </button>
          <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
            <FileJson size={14} /> Excel
          </button>
          <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
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
                <td className="px-4 py-2.5 text-xs text-center">0</td>
                <td className="px-4 py-2.5 text-xs text-right">0</td>
                <td colSpan={3} />
              </tr>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                    No records found
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    {/* Rows data */}
                  </tr>
                ))
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
          totalRecords={filteredData.length}
        />
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = reportData;
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
              <Search size={14} /> Show
            </button>
            <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
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
                  <td colSpan={5} className="px-4 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
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
          <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
            <Search size={14} /> Show
          </button>
          <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
            <FileJson size={14} /> Excel
          </button>
          <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
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
                <td className="px-4 py-2.5 text-xs text-center">0</td>
                <td />
                <td className="px-4 py-2.5 text-xs text-right">0.00</td>
              </tr>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
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
                    <td className="px-4 py-2 text-xs font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-xs font-medium text-slate-500">{item.barcode}</td>
                    <td className="px-4 py-2 text-xs font-bold text-center">{item.qty}</td>
                    <td className="px-4 py-2 text-xs font-bold text-center uppercase">{item.unit}</td>
                    <td className="px-4 py-2 text-xs font-bold text-right">{parseFloat(item.rate).toFixed(2)}</td>
                    <td className="px-4 py-2 text-xs font-black text-right text-blue-700">{parseFloat(item.amount).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800 text-white font-black">
                  <td colSpan={2} className="px-4 py-2 text-right text-[10px] uppercase tracking-widest">Total :</td>
                  <td className="px-4 py-2 text-center text-xs">{totalQty.toFixed(2)}</td>
                  <td colSpan={2} />
                  <td className="px-4 py-2 text-right text-xs">{totalAmount.toFixed(2)}</td>
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

        <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
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
                <td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No records found</td>
              </tr>
            ) : (
              reportData.map((po, index) => (
                <tr key={po.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-xs font-black text-blue-700 uppercase">{po.poNo}</td>
                  <td className="px-6 py-3 text-xs font-medium text-slate-600">{po.date}</td>
                  <td className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">{po.department}</td>
                  <td className="px-6 py-3 text-xs font-black text-slate-900">{po.totalQty.toFixed(2)}</td>
                  <td className="px-6 py-3 text-xs font-black text-right text-emerald-600">{po.totalAmount.toFixed(2)}</td>
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
                    <td className="px-4 py-2 text-xs font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-xs font-medium text-slate-500">{item.barcode}</td>
                    <td className="px-4 py-2 text-xs font-bold text-center">{item.qty}</td>
                    <td className="px-4 py-2 text-xs font-bold text-right">{parseFloat(item.rate).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </td>
                    <td className="px-4 py-2 text-xs font-bold text-center text-slate-500">{item.current_stock}</td>
                    <td className="px-4 py-2 text-xs font-medium text-slate-600 italic">{item.remarks}</td>
                  </tr>
                ))}
                <tr className="bg-slate-800 text-white font-black">
                  <td colSpan={2} className="px-4 py-2 text-right text-[10px] uppercase tracking-widest">Total :</td>
                  <td className="px-4 py-2 text-center text-xs">{totalQty.toFixed(2)}</td>
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

        <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
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
                <td colSpan={4} className="px-6 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No records found</td>
              </tr>
            ) : (
              reportData.map((w, index) => (
                <tr key={w.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-xs font-bold text-slate-500">{index + 1}</td>
                  <td className="px-6 py-3 text-xs font-medium text-slate-600">{w.date}</td>
                  <td className="px-6 py-3 text-xs font-black text-slate-900">{w.totalQty.toFixed(2)}</td>
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
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
              <Search size={14} /> Show
            </button>
            <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
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
                <td className="px-4 py-2.5 text-xs text-center">0.00</td>
                <td colSpan={2} />
                <td className="px-4 py-2.5 text-xs text-right">0.00</td>
              </tr>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
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
                    <td className="px-4 py-2 text-xs font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-xs font-medium text-slate-500">{item.barcode}</td>
                    <td className="px-4 py-2 text-xs font-bold text-center">{item.qty}</td>
                    <td className="px-4 py-2 text-xs font-bold text-right">{parseFloat(item.rate).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800 text-white font-black">
                  <td colSpan={2} className="px-4 py-2 text-right text-[10px] uppercase tracking-widest">Total :</td>
                  <td className="px-4 py-2 text-center text-xs">{totalQty.toFixed(2)}</td>
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

        <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
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
                <td colSpan={7} className="px-6 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No records found</td>
              </tr>
            ) : (
              reportData.map((tx, index) => (
                <tr key={tx.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-xs font-bold text-slate-500">{index + 1}</td>
                  <td className="px-6 py-3 text-xs font-medium text-slate-600">{tx.date}</td>
                  <td className="px-6 py-3 text-xs font-black text-blue-700 uppercase">{tx.poNo}</td>
                  <td className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">{tx.fromDept}</td>
                  <td className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">{tx.toDept}</td>
                  <td className="px-6 py-3 text-xs font-black text-center text-slate-900">{tx.totalQty.toFixed(2)}</td>
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
          <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
            <Search size={14} /> Show
          </button>
          <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
            <FileJson size={14} /> Excel
          </button>
          <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
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
                  <td colSpan={10} className="px-4 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                    No costing data found for the selected period
                  </td>
                </tr>
              ) : (
                reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2 text-xs font-bold text-slate-500">{index + 1}</td>
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
                    <td className="px-3 py-2 text-[10px] font-bold text-right">{parseFloat(item.rate).toFixed(2)}</td>
                    <td className="px-3 py-2 text-[10px] font-bold text-center">{item.dis_percent}%</td>
                    <td className="px-3 py-2 text-[10px] font-bold text-right">{((item.qty * item.rate) * item.dis_percent / 100).toFixed(2)}</td>
                    <td className="px-3 py-2 text-[10px] font-bold text-center">0%</td>
                    <td className="px-3 py-2 text-[10px] font-bold text-right">0.00</td>
                    <td className="px-3 py-2 text-[10px] font-black text-right text-blue-700">{parseFloat(item.amount).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800 text-white font-black">
                  <td colSpan={2} className="px-3 py-2 text-right text-[9px] uppercase tracking-widest">Total :</td>
                  <td className="px-3 py-2 text-center text-[10px]">{formData.items.reduce((sum, i) => sum + Number(i.qty), 0).toFixed(2)}</td>
                  <td colSpan={4} />
                  <td className="px-3 py-2 text-right text-[10px]">{totalGstAmt.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-[10px]">{totalAmount.toFixed(2)}</td>
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
                <span>{Math.round(totalAmount)}</span>
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

        <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
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
                <td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No records found</td>
              </tr>
            ) : (
              reportData.map((prod, index) => (
                <tr key={prod.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 text-xs font-bold text-slate-500">{index + 1}</td>
                  <td className="px-6 py-3 text-xs font-medium text-slate-600">{prod.date}</td>
                  <td className="px-6 py-3 text-xs font-black text-slate-900 uppercase">{prod.itemName}</td>
                  <td className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">{prod.department}</td>
                  <td className="px-6 py-3 text-xs font-black text-right text-blue-700">{prod.amount.toFixed(2)}</td>
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
          <div className="bg-slate-800 text-white text-center py-1.5 rounded text-xs font-black uppercase tracking-widest">
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
                    <td className="px-4 py-2 text-xs font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-xs font-medium text-slate-500">{item.barcode}</td>
                    <td className="px-4 py-2 text-xs font-bold text-center">{item.qty}</td>
                    <td className="px-4 py-2 text-xs font-bold text-center uppercase">{item.unit}</td>
                    <td className="px-4 py-2 text-xs font-bold text-right">{parseFloat(item.rate).toFixed(2)}</td>
                    <td className="px-4 py-2 text-xs font-black text-right text-blue-700">{parseFloat(item.amount).toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeRawItem(i)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-800 text-white font-black">
                  <td colSpan={2} className="px-4 py-2 text-right text-[10px] uppercase tracking-widest">Total :</td>
                  <td className="px-4 py-2 text-center text-xs">{totalRawQty.toFixed(2)}</td>
                  <td colSpan={2} />
                  <td className="px-4 py-2 text-right text-xs">{totalRawAmount.toFixed(2)}</td>
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
                <span>{Math.round(totalRawAmount)}</span>
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
          className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all"
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
                <td colSpan={3} className="px-6 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                  No BOM records found. Click 'Create New' to start.
                </td>
              </tr>
            ) : (
              reportData.map((bom, index) => (
                <tr key={bom.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 text-xs font-bold text-slate-500">{index + 1}</td>
                  <td className="px-6 py-3 text-xs font-black text-slate-900 uppercase">{bom.itemName}</td>
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
    const message = `Dear ${user.name}, this is a friendly reminder that you have a pending balance of ${user.pending.toFixed(2)} at NM MART. Please clear it at your earliest convenience. Thank you!`;
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
                  <td className="px-4 py-3 text-xs font-black text-blue-700">{user.accountId}</td>
                  <td className="px-4 py-3 text-xs font-black text-slate-800 uppercase">{user.name}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-600">{user.mobile}</td>
                  <td className="px-4 py-3 text-xs font-black text-red-600">{user.pending.toFixed(2)}</td>
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
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic text-xs font-bold uppercase tracking-widest">
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
                  <td className="px-3 py-2 text-[10px] font-black text-slate-900 text-right">{row.sale > 0 ? `${row.sale.toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-[10px] font-black text-emerald-600 text-right">{row.payment > 0 ? `${row.payment.toFixed(2)}` : '-'}</td>
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
                    <td className="px-4 py-2 text-xs font-black text-slate-800 uppercase">{item.name}</td>
                    <td className="px-4 py-2 text-xs font-bold text-slate-900 text-right">{item.sale.toFixed(2)}</td>
                    <td className="px-4 py-2 text-xs font-bold text-emerald-600 text-right">{item.payment.toFixed(2)}</td>
                    <td className="px-4 py-2 text-xs font-black text-blue-700 text-right">{item.closing.toFixed(2)}</td>
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
                  <td className="px-4 py-2.5 text-xs font-bold text-blue-600">#{row.id}</td>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-500">{row.date}</td>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-500">{row.acId}</td>
                  <td className="px-4 py-2.5 text-xs font-black text-slate-800 uppercase">{row.customer}</td>
                  <td className="px-4 py-2.5 text-xs font-medium text-slate-600">{row.mobile}</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-slate-700 uppercase">{row.deliveryBoy}</td>
                  <td className="px-4 py-2.5 text-xs font-black text-slate-900 text-right">{row.amount.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-emerald-600 uppercase">{row.paidBy}</td>
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
                <h4 className="text-base font-black text-blue-700">{item.total.toFixed(2)}</h4>
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = reportData;
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <Search size={14} /> Show
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <FileJson size={14} /> Excel
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
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
                <td className="px-6 py-2.5 text-right text-xs uppercase tracking-widest">Total:</td>
                <td className="px-6 py-2.5 text-xs text-right">{totals.debit}</td>
                <td className="px-6 py-2.5 text-xs text-right">{totals.credit}</td>
                <td className="px-6 py-2.5" />
              </tr>
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-2 text-xs font-bold text-slate-500">{item.date}</td>
                  <td className="px-6 py-2 text-xs font-black text-slate-900 uppercase">{item.partyName}</td>
                  <td className="px-6 py-2 text-xs font-bold text-right text-red-600">{item.debit > 0 ? item.debit.toFixed(2) : ''}</td>
                  <td className="px-6 py-2 text-xs font-bold text-right text-emerald-600">{item.credit > 0 ? item.credit.toFixed(2) : ''}</td>
                  <td className="px-6 py-2 text-xs font-black text-right text-slate-900">{item.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationFooter 
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setCurrentPage={setCurrentPage}
          totalRecords={filteredData.length}
        />
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
                    <td className="px-6 py-3 text-xs font-bold text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-black text-slate-700 uppercase tracking-widest">
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredData = reportData;
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <Search size={14} /> Show
            </button>
            <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
              <FileJson size={14} /> Excel
            </button>
            <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
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
                <td className="px-4 py-2 text-xs font-black text-red-600 uppercase">Opening</td>
                <td colSpan={3} />
                <td className="px-4 py-2 text-xs font-black text-red-600 text-right">{openingStock.toFixed(2)}</td>
                <td />
              </tr>
              {paginatedData.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2 text-xs font-bold text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-xs font-black text-blue-700">{item.voucher}</td>
                  <td className="px-4 py-2 text-xs font-bold text-slate-600 uppercase">{item.dept}</td>
                  <td className="px-4 py-2 text-xs font-black text-slate-900 uppercase">{item.itemName}</td>
                  <td className="px-4 py-2 text-xs font-medium text-slate-500">{item.barcode}</td>
                  <td className="px-4 py-2 text-xs font-bold text-center text-emerald-600">{item.inQty > 0 ? `+${item.inQty.toFixed(2)}` : ''}</td>
                  <td className="px-4 py-2 text-xs font-bold text-center text-red-600">{item.outQty > 0 ? `-${item.outQty.toFixed(2)}` : ''}</td>
                  <td className="px-4 py-2 text-xs font-black text-right text-slate-900">{item.closing.toFixed(2)}</td>
                  <td className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationFooter 
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setCurrentPage={setCurrentPage}
          totalRecords={filteredData.length}
        />
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
            <button onClick={handleShow} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
              <Search size={14} /> Show
            </button>
            <button onClick={handleExcel} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
              <FileJson size={14} /> Excel
            </button>
            <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-xs font-black uppercase hover:bg-blue-50 transition-all">
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
                  <td className="px-3 py-2 text-xs font-bold text-slate-500">{item.srNo}</td>
                  <td className="px-3 py-2 text-xs font-black text-slate-900 uppercase">{item.itemName}</td>
                  <td className="px-3 py-2 text-xs font-bold text-center">{item.opening.toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs font-bold text-center text-emerald-600">+{item.stockIn.toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs font-bold text-center text-red-600">-{item.stockOut.toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs font-black text-center">{item.closing.toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs font-bold text-center uppercase">{item.unit}</td>
                  <td className="px-3 py-2 text-xs font-bold text-center">{item.saleRate}</td>
                  <td className="px-3 py-2 text-xs font-black text-center">{item.amount.toFixed(2)}</td>
                  <td className="px-3 py-2 text-xs font-bold text-center">{item.purcRate}</td>
                  <td className="px-3 py-2 text-xs font-black text-right">{item.purcAmount.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-blue-100/50 font-black text-slate-900 border-t-2 border-slate-200">
                <td colSpan="5" className="px-3 py-2.5 text-right text-xs uppercase tracking-widest">Total QTY:</td>
                <td className="px-3 py-2.5 text-xs text-center">{totals.qty.toFixed(2)}</td>
                <td colSpan="2" />
                <td className="px-3 py-2.5 text-xs text-center">{totals.amount.toFixed(2)}</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-xs text-right">{totals.purcAmount.toFixed(2)}</td>
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

// --- Master Views using Generic MasterListView ---
const CategoriesView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'name', label: 'Category Name', type: 'text', required: true },
      { name: 'image_url', label: 'Image', type: 'image' },
      { name: 'is_active', label: 'Active', type: 'boolean' }
    ]} 
  />
);

const SubcategoriesView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'category_id', label: 'Category', type: 'select', options: props.categories?.map(c => ({ value: c.id, label: c.name })), required: true },
      { name: 'name', label: 'Subcategory Name', type: 'text', required: true },
      { name: 'is_active', label: 'Active', type: 'boolean' }
    ]} 
  />
);

const BrandsView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'name', label: 'Brand Name', type: 'text', required: true },
      { name: 'image_url', label: 'Image', type: 'image' },
      { name: 'is_active', label: 'Active', type: 'boolean' }
    ]} 
  />
);

const UnitsView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'name', label: 'Unit Name', type: 'text', required: true },
      { name: 'short_name', label: 'Short Name', type: 'text' },
      { name: 'is_active', label: 'Active', type: 'boolean' }
    ]} 
  />
);

const DepartmentsView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'name', label: 'Department Name', type: 'text', required: true },
      { name: 'is_active', label: 'Active', type: 'boolean' }
    ]} 
  />
);

const AccountsView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'name', label: 'Account Name', type: 'text', required: true },
      { name: 'mobile', label: 'Mobile', type: 'text' },
      { name: 'account_type', label: 'Type', type: 'select', options: [{value: 'Customer', label: 'Customer'}, {value: 'Supplier', label: 'Supplier'}] },
      { name: 'current_balance', label: 'Balance', type: 'number' },
      { name: 'is_active', label: 'Active', type: 'boolean' }
    ]} 
  />
);

const AdminUsersView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: !props.editingItem },
      { name: 'full_name', label: 'Full Name', type: 'text' },
      { name: 'role', label: 'Role', type: 'select', options: [{value: 'admin', label: 'Admin'}, {value: 'manager', label: 'Manager'}] }
    ]} 
  />
);

const UsersView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'name', label: 'Customer Name', type: 'text', required: true },
      { name: 'mobile', label: 'Mobile', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'is_active', label: 'Active', type: 'boolean' }
    ]} 
  />
);

const BannersView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'title', label: 'Banner Title', type: 'text' },
      { name: 'image_url', label: 'Banner Image', type: 'image', required: true },
      { name: 'is_active', label: 'Active', type: 'boolean' }
    ]} 
  />
);

const CouponsView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'code', label: 'Coupon Code', type: 'text', required: true },
      { name: 'discount_type', label: 'Type', type: 'select', options: [{value: 'percentage', label: 'Percentage'}, {value: 'flat', label: 'Flat Amount'}] },
      { name: 'discount_value', label: 'Value', type: 'number', required: true },
      { name: 'min_order_value', label: 'Min Order', type: 'number' },
      { name: 'is_active', label: 'Active', type: 'boolean' }
    ]} 
  />
);

const OffersView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'title', label: 'Offer Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'image_url', label: 'Image', type: 'image' },
      { name: 'is_active', label: 'Active', type: 'boolean' }
    ]} 
  />
);

const PincodesView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'pincode', label: 'Pincode', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'delivery_charge', label: 'Delivery Charge', type: 'number' },
      { name: 'is_active', label: 'Active', type: 'boolean' }
    ]} 
  />
);

const AddressesView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'full_name', label: 'Name', type: 'text', required: true },
      { name: 'mobile', label: 'Mobile', type: 'text', required: true },
      { name: 'address_line1', label: 'Address Line 1', type: 'text', required: true },
      { name: 'pincode', label: 'Pincode', type: 'text', required: true }
    ]} 
  />
);

const WalletView = (props) => (
  <MasterListView 
    {...props} 
    fields={[
      { name: 'user_id', label: 'User ID', type: 'text', required: true },
      { name: 'balance', label: 'Balance', type: 'number', required: true }
    ]} 
  />
);

// Missing Views for renderTabContent
const OnlineOrderView = (props) => <UnderDevelopmentView title="Online Orders" />;
const BillView = (props) => <UnderDevelopmentView title="Bill View" />;
const BranchBillView = (props) => <UnderDevelopmentView title="Branch Bill" />;
const PaymentMobileView = (props) => <UnderDevelopmentView title="Payment Mobile" />;
const WalletRechargeView = (props) => <UnderDevelopmentView title="Wallet Recharge" />;
const SaleSummaryView = (props) => <UnderDevelopmentView title="Sale Summary" />;
const SaleReportBillView = (props) => <UnderDevelopmentView title="Sale Report (Bill)" />;
const SaleReportItemView = (props) => <UnderDevelopmentView title="Sale Report (Item)" />;
const SaleReportItemSummaryView = (props) => <UnderDevelopmentView title="Sale Report (Item Summary)" />;
const SaleTrashBillView = (props) => <UnderDevelopmentView title="Sale Trash Bill" />;
const SaleCancelledBillView = (props) => <UnderDevelopmentView title="Sale Cancelled Bill" />;

// --- Tab Content Renderer ---
function renderTabContent(activeTab, props) {
  switch (activeTab) {
    // Core Views (Moved to Separate Files)
    case 'Dashboard': return <DashboardView {...props} />;
    case 'Products': return <ProductsView {...props} />;
    case 'Orders': return <OrdersView {...props} />;
    case 'Notifications': return <NotificationsView {...props} />;
    case 'SupportTickets': return <SupportTicketsView {...props} />;
    case 'AppConfig': return <AppConfigView {...props} />;
    case 'Analytics': return <AnalyticsView {...props} />;
    case 'POS': return <POSView orders={props.orders} {...props} />;
    case 'ProfitLoss': return <ProfitLossView orders={props.orders} purchases={props.purchases} expenses={props.expenses} />;
    case 'HomeLayout': return <HomeLayoutManager {...props} />;
    
    // Inventory Views
    case 'Suppliers': return <SuppliersView accounts={props.accounts} {...props} />;
    case 'PurchaseEntry': return <PurchaseEntryView products={props.products} accounts={props.accounts} {...props} />;
    case 'StockLogs': return <StockLogsView inventoryLogs={props.inventoryLogs} products={props.products} {...props} />;
    case 'Expenses': return <ExpensesView expenses={props.expenses} fetchInitialData={props.fetchInitialData} />;

    // Master Dropdown Cases
    case 'Categories': return <CategoriesView title="Main Categories" table={DB_SCHEMA.CATEGORIES.table} data={props.categories} {...props} />;
    case 'Subcategories': return <SubcategoriesView title="Sub Categories" table={DB_SCHEMA.SUBCATEGORIES.table} data={props.subcategories} categories={props.categories} {...props} />;
    case 'Brands': return <BrandsView title="Brand Master" table={DB_SCHEMA.BRANDS.table} data={props.brands} {...props} />;
    case 'Coupons': return <CouponsView title="Coupon Master" table={DB_SCHEMA.COUPONS.table} data={props.coupons} {...props} />;
    case 'Users': return <UsersView title="App Users" table={DB_SCHEMA.USERS.table} data={props.users} {...props} />;
    case 'Banners': return <BannersView title="App Banners" table={DB_SCHEMA.BANNERS.table} data={props.banners} {...props} />;
    case 'Offers': return <OffersView title="Offer Master" table={DB_SCHEMA.OFFERS.table} data={props.offers} {...props} />;
    case 'AdminUsers': return <AdminUsersView title="Admin Users" table={DB_SCHEMA.ADMIN_USERS.table} data={props.adminUsers} {...props} />;
    case 'Pincodes': return <PincodesView title="Pincode Master" table={DB_SCHEMA.PINCODES.table} data={props.pincodes} {...props} />;
    case 'Addresses': return <AddressesView title="Address Master" table={DB_SCHEMA.ADDRESSES.table} data={props.addresses} {...props} />;
    case 'WalletMaster': return <WalletView title="Wallet Master" table={DB_SCHEMA.WALLET_MASTER.table} data={props.credits} {...props} />;
    case 'Departments': return <DepartmentsView title="Department Master" table={DB_SCHEMA.DEPARTMENTS.table} data={props.departments} {...props} />;
    case 'Units': return <UnitsView title="Unit Master" table={DB_SCHEMA.UNITS.table} data={props.units} {...props} />;
    case 'Accounts': return <AccountsView title="Account Master" table={DB_SCHEMA.ACCOUNTS.table} data={props.accounts} {...props} />;
    
    // Store Dropdown Cases
    case 'StoreMainCat': return <StoreMainCatDisplayView categories={props.categories} departments={props.departments} />;
    case 'StoreSubCat': return <StoreSubCatDisplayView subcategories={props.subcategories} departments={props.departments} />;
    case 'StoreItem': return <StoreItemDisplayView products={props.products} departments={props.departments} />;
    
    // Process Cases
    case 'ProductionEntry': return <ProductionEntryView {...props} />;
    case 'CostingReport': return <CostingReportView {...props} />;
    case 'StockTransfer': return <StockTransferView {...props} />;
    case 'WastageEntry': return <WastageEntryView {...props} />;
    case 'PurchaseOrderPO': return <PurchaseOrderView {...props} />;
    case 'Purchase': return <PurchaseView title="Purchase" table={DB_SCHEMA.PURCHASES.table} data={props.purchases} products={props.products} departments={props.departments} {...props} />;

    // View Dropdown Cases
    case 'OnlineOrder': return <OnlineOrderView {...props} />;
    case 'BillView': return <BillView {...props} />;
    case 'BranchBill': return <BranchBillView {...props} />;
    case 'PaymentMobile': return <PaymentMobileView {...props} />;
    case 'WalletRecharge': return <WalletRechargeView {...props} />;
    case 'Transaction': return <TransactionView {...props} />;

    // Report Dropdown Cases
    case 'SaleSummary': return <SaleSummaryView {...props} />;
    case 'SaleReportBill': return <SaleReportBillView {...props} />;
    case 'SaleReportItem': return <SaleReportItemView {...props} />;
    case 'SaleReportItemSummary': return <SaleReportItemSummaryView {...props} />;
    case 'SaleTrashBill': return <SaleTrashBillView {...props} />;
    case 'SaleCancelledBill': return <SaleCancelledBillView {...props} />;
    case 'StockReport': return <StockReportView {...props} />;
    case 'ItemStatement': return <ItemStatementReportView {...props} />;
    case 'Logbook': return <LogbookView {...props} />;
    case 'GuardVerification': return <GuardVerificationView orders={props.orders} {...props} />;
    case 'LedgerView': return <LedgerView {...props} />;
    case 'PaymentReportDB': return <DeliveryBoyPaymentReportView {...props} />;
    case 'CreditReport': return <CreditReportView {...props} />;
    case 'PaymentReminder': return <PaymentReminderView {...props} />;

    // Tools Dropdown Cases
    case 'TestBluetooth': return <TestBluetoothView />;

    default: return <DashboardView {...props} />;
  }
}

// --- Dashboard View (Dense ERP Style) ---
