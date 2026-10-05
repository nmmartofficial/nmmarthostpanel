import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabase';
import { DB_SCHEMA } from '../dbSchema';
import { dbSync } from '../dbSync';
import { secureStorage } from '../utils/security';
import { shouldSkipGlobalFetch } from '../utils/fetchControl';
import { isLocalPosReadOnlyMode, isLocalPosTestMode } from '../utils/localPosTestMode';

const GlobalContext = createContext();

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};

const DEFAULT_APP_CONFIG = {
  id: 'default',
  store_name: 'NM MART'
};

const FETCH_THROTTLE_MS = 5000;
const ONE_DAY_MS = 86400000;
const FESTIVAL_LOOKBACK_DAYS = 7;
const FESTIVAL_LOOKAHEAD_DAYS = 3;

const INITIAL_FESTIVALS = [
  {
    id: '1',
    name: 'Diwali 🪔',
    date: `${new Date().getFullYear()}-10-20`,
    primaryColor: '#FF6B35',
    secondaryColor: '#FFD93D',
    accentColor: '#FFF6E0',
    isActive: true,
    description: 'Festival of Lights',
    autoApply: true
  },
  {
    id: '2',
    name: 'Holi 🎨',
    date: `${new Date().getFullYear()}-03-24`,
    primaryColor: '#FF5E87',
    secondaryColor: '#9B59B6',
    accentColor: '#FDE2E7',
    isActive: true,
    description: 'Festival of Colors',
    autoApply: true
  },
  {
    id: '3',
    name: 'Christmas 🎄',
    date: `${new Date().getFullYear()}-12-25`,
    primaryColor: '#2E7D32',
    secondaryColor: '#C62828',
    accentColor: '#FFFDE7',
    isActive: true,
    description: 'Christmas Day',
    autoApply: true
  }
];

export const GlobalProvider = ({ children }) => {
  // --- Auth & Tenant State ---
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = secureStorage.getItem('nm_user_data');
    return saved || null;
  });

  // --- Data States ---
  const [stats, setStats] = useState({ products: 0, categories: 0, orders: 0, users: 0 });
  const [appConfig, setAppConfig] = useState(DEFAULT_APP_CONFIG);
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
  const [orderItems, setOrderItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [offers, setOffers] = useState([]);
  const [pincodes, setPincodes] = useState([]);
  const [homeConfig, setHomeConfig] = useState([]);
  const [walletTx, setWalletTx] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState([
    { id: '1', name: 'Bronze', minPoints: 0, maxPoints: 999, discount: 2, color: '#CD7F32' },
    { id: '2', name: 'Silver', minPoints: 1000, maxPoints: 4999, discount: 5, color: '#C0C0C0' },
    { id: '3', name: 'Gold', minPoints: 5000, maxPoints: 99999, discount: 10, color: '#FFD700' }
  ]);
  const [festivals, setFestivals] = useState(() => {
    const saved = secureStorage.getItem('nm_festivals');
    return Array.isArray(saved) ? saved : INITIAL_FESTIVALS;
  });
  const [activeFestival, setActiveFestival] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Refs ---
  const isFetchingRef = useRef(false);
  const mountRef = useRef(false);

  // --- Fetch Logic ---
  if (typeof window !== 'undefined') window.__NM_REFRESH_DATA__ = (s) => fetchInitialData(s);
  const fetchInitialData = useCallback(async (force = false, silent = false, options = {}) => {
    if (isLocalPosTestMode && !isLocalPosReadOnlyMode) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    if (shouldSkipGlobalFetch({
      isFetching: isFetchingRef.current,
      force,
      lastFetchedAt: mountRef.current,
      now,
      throttleMs: FETCH_THROTTLE_MS
    })) {
      return;
    }

    // Get Company Code from Secure Storage
    const userData = secureStorage.getItem('nm_user_data');
    const companyCode = userData?.company_code || 'NMM001';

    isFetchingRef.current = true;
    mountRef.current = now;

    if (!silent) setLoading(true);

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString();

      const productsQuery = options?.productsIncludeDeleted ? { includeDeleted: true } : undefined;

      const results = await Promise.allSettled([
        dbSync.fetch(DB_SCHEMA.PRODUCTS.table, productsQuery),
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
        dbSync.fetch(DB_SCHEMA.EXPENSES.table, { order: { column: 'date', ascending: false } }),
        supabase.from(DB_SCHEMA.ORDER_ITEMS.table).select('*').gte('created_at', dateStr),
        dbSync.fetch(DB_SCHEMA.USERS.table)
      ]);

      const getData = (index, fallback = []) => {
        if (!results[index]) return fallback;
        if (results[index].status === 'fulfilled') {
          if (index === 27) return results[index].value.data || fallback;
          return results[index].value;
        }
        return fallback;
      };

      setProducts(getData(0));
      setCategories(getData(1));
      setOrders(getData(2));

      const appConfigData = getData(3, {});
      const loadedAppConfig = Array.isArray(appConfigData) ? appConfigData[0] : appConfigData;
      if (loadedAppConfig && Object.keys(loadedAppConfig).length > 0) {
        setAppConfig(loadedAppConfig);
      }

      setBanners(getData(4));
      setSubcategories(getData(5));
      setBrands(getData(6));
      setCoupons(getData(7));
      setNotifications(getData(8));
      setWallets(getData(9));
      setHomeConfig(getData(10));
      setOffers(getData(11));
      setPincodes(getData(12));
      setWalletTx(getData(13));
      setAddresses(getData(14));
      setCart(getData(15));
      setWishlist(getData(16));
      setAdminUsers(getData(17));
      setCredits(getData(18));
      setDeliveryBoys(getData(19));
      setDeliveryCustomers(getData(20));
      setPurchases(getData(21));
      setDepartments(getData(22));
      setUnits(getData(23));
      setAccounts(getData(24));
      setInventoryLogs(getData(25));
      setExpenses(getData(26));
      setOrderItems(getData(27));
      setUsers(getData(28));

      setStats({
        products: getData(0).length,
        categories: getData(1).length,
        orders: getData(2).length,
        users: getData(28).length
      });

    } catch (error) {
      console.error("[GlobalContext] Fetching Failed:", error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const syncSetters = {
      [DB_SCHEMA.PRODUCTS.table]: setProducts,
      [DB_SCHEMA.ORDERS.table]: setOrders,
      [DB_SCHEMA.ORDER_ITEMS.table]: setOrderItems,
      [DB_SCHEMA.USERS.table]: setUsers,
      [DB_SCHEMA.NOTIFICATIONS.table]: setNotifications,
      [DB_SCHEMA.BANNERS.table]: setBanners,
      [DB_SCHEMA.CATEGORIES.table]: setCategories,
      [DB_SCHEMA.SUBCATEGORIES.table]: setSubcategories,
      [DB_SCHEMA.BRANDS.table]: setBrands,
      [DB_SCHEMA.COUPONS.table]: setCoupons,
      [DB_SCHEMA.WALLET_MASTER.table]: setWallets,
      [DB_SCHEMA.WALLET_TRANSACTIONS.table]: setWalletTx,
      [DB_SCHEMA.PURCHASES.table]: setPurchases,
      [DB_SCHEMA.EXPENSES.table]: setExpenses,
      [DB_SCHEMA.INVENTORY_LOGS.table]: setInventoryLogs,
      [DB_SCHEMA.ADMIN_USERS.table]: setAdminUsers,
      [DB_SCHEMA.OFFERS.table]: setOffers,
      [DB_SCHEMA.ADDRESSES.table]: setAddresses,
      [DB_SCHEMA.CREDITS.table]: setCredits,
      [DB_SCHEMA.DELIVERY_BOYS.table]: setDeliveryBoys,
      [DB_SCHEMA.DELIVERY_CUSTOMERS.table]: setDeliveryCustomers,
      [DB_SCHEMA.PINCODES.table]: setPincodes,
      [DB_SCHEMA.CART.table]: setCart,
      [DB_SCHEMA.WISHLIST.table]: setWishlist,
      [DB_SCHEMA.LOYALTY_POINTS.table]: setLoyaltyPoints,
      [DB_SCHEMA.LOYALTY_TRANSACTIONS.table]: setLoyaltyTransactions,
      [DB_SCHEMA.LOYALTY_TIERS.table]: setLoyaltyTiers,
      [DB_SCHEMA.DEPARTMENTS.table]: setDepartments,
      [DB_SCHEMA.UNITS.table]: setUnits,
      [DB_SCHEMA.ACCOUNTS.table]: setAccounts,
      [DB_SCHEMA.HOME_CONFIG.table]: setHomeConfig
    };
    const handleResourceInvalidation = (event) => {
      const { resources = [], data = {} } = event.detail || {};
      resources.forEach((resource) => {
        const rows = data[resource];
        const setter = syncSetters[resource];
        if (!setter || !Array.isArray(rows)) return;
        setter(rows);
        if (resource === DB_SCHEMA.PRODUCTS.table) {
          setStats((previous) => ({ ...previous, products: rows.filter((row) => row.is_active !== false && row.is_active !== 0).length }));
        } else if (resource === DB_SCHEMA.CATEGORIES.table) {
          setStats((previous) => ({ ...previous, categories: rows.length }));
        } else if (resource === DB_SCHEMA.ORDERS.table) {
          setStats((previous) => ({ ...previous, orders: rows.length }));
        } else if (resource === DB_SCHEMA.USERS.table) {
          setStats((previous) => ({ ...previous, users: rows.length }));
        }
      });
      if (resources.includes(DB_SCHEMA.APP_CONFIG.table) && Array.isArray(data[DB_SCHEMA.APP_CONFIG.table])) {
        setAppConfig(data[DB_SCHEMA.APP_CONFIG.table][0] || DEFAULT_APP_CONFIG);
      }
    };
    window.addEventListener('nm:resource-invalidated', handleResourceInvalidation);
    return () => window.removeEventListener('nm:resource-invalidated', handleResourceInvalidation);
  }, []);

  // --- Theme / Festival Logic ---
  useEffect(() => {
    const isDateInRange = (festivalDate, daysBefore = FESTIVAL_LOOKBACK_DAYS, daysAfter = FESTIVAL_LOOKAHEAD_DAYS) => {
      const today = new Date(); today.setHours(0,0,0,0);
      const targetDate = new Date(festivalDate);
      targetDate.setHours(0,0,0,0);
      targetDate.setFullYear(today.getFullYear());
      const startDate = new Date(targetDate); startDate.setDate(startDate.getDate() - daysBefore);
      const endDate = new Date(targetDate); endDate.setDate(endDate.getDate() + daysAfter);
      return today >= startDate && today <= endDate;
    };

    const currentFestivals = festivals
      .filter(f => f.isActive && f.autoApply && isDateInRange(f.date))
      .sort((a,b) => Math.abs(new Date(a.date) - new Date()) - Math.abs(new Date(b.date) - new Date()));

    if (currentFestivals.length > 0) {
      const festival = currentFestivals[0];
      setActiveFestival(festival);
      const lastManualTheme = secureStorage.getItem('nm_last_manual_theme');
      if (!lastManualTheme || Date.now() - parseInt(lastManualTheme) > ONE_DAY_MS) {
        setAppConfig(prev => ({ ...prev, primary_color: festival.primaryColor, secondary_color: festival.secondaryColor }));
      }
    } else {
      setActiveFestival(null);
    }
  }, [festivals]);

  useEffect(() => {
    if (appConfig) {
      const root = document.documentElement;
      if (appConfig.primary_color) root.style.setProperty('--theme-primary', appConfig.primary_color);
      if (appConfig.secondary_color) root.style.setProperty('--theme-secondary', appConfig.secondary_color);
    }
  }, [appConfig]);

  const value = useMemo(() => ({
    stats, appConfig, banners, categories, subcategories, brands, adminUsers, credits,
    deliveryBoys, deliveryCustomers, purchases, departments, units, accounts, products,
    orders, orderItems, users, coupons, offers, pincodes, homeConfig, walletTx, wallets, addresses,
    cart, wishlist, notifications, inventoryLogs, expenses, loyaltyPoints, loyaltyTransactions,
    loyaltyTiers, festivals, activeFestival, loading,
    setAppConfig, setBanners, setCategories, setSubcategories, setBrands, setProducts,
    setOrders, setOrderItems, setUsers, setWallets, setCoupons, setAdminUsers, setCredits, setDeliveryBoys,
    setDeliveryCustomers, setPurchases, setDepartments, setUnits, setAccounts,
    setFestivals, setLoyaltyPoints, setLoyaltyTransactions, setLoyaltyTiers,
    fetchInitialData, setLoading
  }), [
    stats, appConfig, banners, categories, subcategories, brands, adminUsers, credits,
    deliveryBoys, deliveryCustomers, purchases, departments, units, accounts, products,
    orders, orderItems, users, coupons, offers, pincodes, homeConfig, walletTx, wallets, addresses,
    cart, wishlist, notifications, inventoryLogs, expenses, loyaltyPoints, loyaltyTransactions,
    loyaltyTiers, festivals, activeFestival, loading,
    fetchInitialData
  ]);

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};
