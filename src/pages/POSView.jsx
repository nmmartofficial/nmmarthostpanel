import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Zap, CheckCircle2, Bell, X, Clock, Box, ShoppingCart, 
  RefreshCw, ArrowLeftRight, LayoutGrid, Save, IndianRupee, Printer, Star, Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/helpers';
import { handleERPAction, ACTION_TYPES, ERP_MODULES } from '../erpController';
import { dbSync } from '../dbSync';
import { DB_SCHEMA } from '../dbSchema';
import ProductCard from '../components/ProductCard';
import CartItem from '../components/CartItem';
import ThermalReceipt from '../components/ThermalReceipt';

export default function POSView({ products, categories, fetchInitialData, appConfig, setActiveTab, orders }) {
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', mob: '', add: '' });
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcode, setBarcode] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [billDiscount, setBillDiscount] = useState(0);
  const [deliveryChargePercent, setDeliveryChargePercent] = useState(0);
  const [flatDiscount, setFlatDiscount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [lastOrderData, setLastOrderData] = useState(null);
  const [searchBillNo, setSearchBillNo] = useState('');
  const [isCreditNote, setIsCreditNote] = useState(false);
  const [posFilter, setPosFilter] = useState('All'); // 'All', 'TopSale', 'Favourite'
  const searchInputRef = useRef(null);
  const barcodeInputRef = useRef(null);

  // --- Optimization: Barcode Map for Instant Lookup ---
  const barcodeMap = useMemo(() => {
    const map = new Map();
    (products || []).forEach(p => {
      if (p.barcode) map.set(p.barcode.trim(), p);
      if (p.hsn_code) map.set(p.hsn_code.trim(), p);
    });
    return map;
  }, [products]);

  // --- Step 1 State: Split Payment & Hold Bill ---
  const [cashAmount, setCashAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);
  const [heldBills, setHeldBills] = useState(() => {
    const saved = localStorage.getItem('pos_held_bills');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  // --- Step 1 Feature: Low Stock & Expiry Alerts Logic ---
  const posAlerts = useMemo(() => {
    const lowStock = (products || []).filter(p => p.stock > 0 && p.stock <= 10).map(p => ({
      type: 'low_stock',
      id: p.id,
      name: p.name,
      value: p.stock,
      msg: `Low Stock: ${p.stock} remaining`
    }));

    const outOfStock = (products || []).filter(p => p.stock <= 0).map(p => ({
      type: 'out_of_stock',
      id: p.id,
      name: p.name,
      value: 0,
      msg: `Out of Stock!`
    }));

    // Mocking Expiry (assuming products have expiry_date column)
    const expiringSoon = (products || []).filter(p => {
      if (!p.expiry_date) return false;
      const daysToExpiry = Math.ceil((new Date(p.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysToExpiry > 0 && daysToExpiry <= 30; // Expiring in next 30 days
    }).map(p => ({
      type: 'expiry',
      id: p.id,
      name: p.name,
      value: p.expiry_date,
      msg: `Expiring soon: ${new Date(p.expiry_date).toLocaleDateString()}`
    }));

    return [...outOfStock, ...lowStock, ...expiringSoon];
  }, [products]);

  // --- Step 3 State: Customer History & Loyalty ---
  const [customerHistory, setCustomerHistory] = useState([]);
  const [customerLoyalty, setCustomerLoyalty] = useState({ points: 0, wallet: 0 });
  const [redeemPoints, setRedeemPoints] = useState(0);

  // --- Loyalty Points Configuration ---
  const POINTS_PER_RUPEE = 0.01; // ₹100 spend = 1 point
  const RUPEE_PER_POINT = 1;     // 1 point = ₹1 discount

  const pointsDiscount = redeemPoints * RUPEE_PER_POINT;

  // Fetch Customer Data when mobile number changes
  useEffect(() => {
    if (customerInfo.mob && customerInfo.mob.length >= 10) {
      fetchCustomerData(customerInfo.mob);
    } else {
      setCustomerHistory([]);
      setCustomerLoyalty({ points: 0, wallet: 0 });
      setRedeemPoints(0);
    }
  }, [customerInfo.mob]);

  const fetchCustomerData = async (mobile) => {
    try {
      // 1. Fetch History (Last 5 orders)
      const history = await dbSync.fetch(DB_SCHEMA.ORDERS.table, {
        eq: { column: 'user_mobile', value: mobile },
        limit: 5,
        order: { column: 'created_at', ascending: false }
      });
      setCustomerHistory(history || []);

      // 2. Fetch Loyalty Info from Users table
      const userData = await dbSync.fetch(DB_SCHEMA.USERS.table, {
        eq: { column: 'mobile', value: mobile }
      });
      if (userData && userData.length > 0) {
        setCustomerLoyalty({
          points: userData[0].points || 0,
          wallet: userData[0].wallet || 0
        });
      }
    } catch (e) { console.error("Error fetching customer data:", e); }
  };

  useEffect(() => {
    localStorage.setItem('pos_held_bills', JSON.stringify(heldBills));
  }, [heldBills]);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerInfo({ name: '', mob: '', add: '', dob: '', doa: '', wallet: 0, points: 0 });
  }, []);

  const updateQty = useCallback((productId, newQty) => {
    if (newQty === 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQty } : item));
  }, [removeFromCart]);

  const addToCart = useCallback((product) => {
    if (!product) return;
    if (product.stock <= 0) {
      alert(`"${product.name}" is Out of Stock!`);
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Cannot add more! Only ${product.stock} units available.`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  // Hold Bill Logic
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const newHold = {
      id: Date.now(),
      cart,
      customerInfo,
      time: new Date().toLocaleTimeString(),
      total: finalTotal
    };
    setHeldBills([...heldBills, newHold]);
    clearCart();
    alert("Bill put on Hold!");
  };

  const resumeHoldBill = (heldBill) => {
    setCart(heldBill.cart);
    setCustomerInfo(heldBill.customerInfo);
    setHeldBills(heldBills.filter(b => b.id !== heldBill.id));
  };

  // Search Bill / Credit Note Logic
  const handleBillSearch = async (e) => {
    if (e.key === 'Enter' && searchBillNo) {
      try {
        const upCaseNo = searchBillNo.toUpperCase();
        // 1. Search for Credit Note First (returned orders)
        const cnRes = await dbSync.fetch(DB_SCHEMA.ORDERS.table, {
          eq: { column: 'order_number', value: upCaseNo }
        });

        if (cnRes && cnRes.length > 0 && cnRes[0].order_status === 'returned') {
          const cn = cnRes[0];
          if (cn.payment_status === 'used') {
            alert("This Credit Note has already been used!");
            return;
          }
          setFlatDiscount(prev => prev + Math.abs(parseFloat(cn.total_amount)));
          alert(`Credit Note Applied: ₹${Math.abs(cn.total_amount)} discount added.`);
          await handleERPAction(DB_SCHEMA.ORDERS.table, ACTION_TYPES.UPDATE, { id: cn.id, payment_status: 'used' });
          setSearchBillNo('');
          return;
        }

        // 2. Search for Order
        const orderRes = await dbSync.fetch(DB_SCHEMA.ORDERS.table, {
          eq: { column: 'order_number', value: searchBillNo }
        });

        if (orderRes && orderRes.length > 0) {
          const order = orderRes[0];
          setCustomerInfo({ name: order.customer_name, mob: order.user_mobile, address: order.address });
          setPaymentMethod(order.payment_method);
          const itemsRes = await dbSync.fetch(DB_SCHEMA.ORDER_ITEMS.table, { eq: { column: 'order_id', value: order.id } });
          if (itemsRes) {
            const newCart = itemsRes.map(item => {
              const product = products.find(p => p.id === item.product_id);
              return { ...product, quantity: item.quantity, sale_rate: item.rate, id: item.product_id };
            });
            setCart(newCart);
            alert(`Bill #${searchBillNo} Loaded for Edit/Return`);
          }
        } else {
          alert("Bill/CN Number not found!");
        }
      } catch (error) {
        alert("Search failed: " + error.message);
      }
    }
  };

  const handleCreateCreditNote = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    try {
      const cnNumber = `CN-${Date.now().toString().slice(-6)}`.toUpperCase();
      
      const orderData = {
        order_number: cnNumber,
        user_id: customerInfo.mob || 'POS-CUST',
        customer_name: customerInfo.name || 'Walk-in (Return)',
        user_mobile: customerInfo.mob || '',
        address: customerInfo.add || '',
        subtotal: -subTotal,
        total_amount: -finalTotal,
        payment_method: 'Credit Note',
        payment_status: 'active',
        order_status: 'returned',
        discount: 0,
        delivery_charge: 0
      };

      const orderRes = await handleERPAction(ERP_MODULES.ORDER_MASTER, ACTION_TYPES.INSERT, orderData);
      if (!orderRes.success) throw new Error(orderRes.error);

      // 2. Return Stock & Log
      for (const item of cart) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          const oldStock = parseFloat(product.stock) || 0;
          const newStock = oldStock + item.quantity;

          await handleERPAction(ERP_MODULES.ITEM_MASTER, ACTION_TYPES.UPDATE, {
            id: product.id,
            stock: newStock
          });

          // Create Inventory Log
          await handleERPAction(DB_SCHEMA.INVENTORY_LOGS.table, ACTION_TYPES.INSERT, {
            id: crypto.randomUUID(),
            product_id: product.id,
            old_stock: oldStock,
            new_stock: newStock,
            change_type: 'return',
            reference_id: cnNumber
          });
        }
      }

      alert(`Credit Note Created: ${cnNumber}. Stock returned. Use this CN # in POS to apply credit.`);
      setCart([]);
      setCustomerInfo({ name: '', mob: '', add: '' });
      fetchInitialData();
    } catch (error) {
      alert("Credit Note failed: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search Results (Debounced)
  const searchResults = useMemo(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < 1) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
      (p.barcode && p.barcode.includes(debouncedSearchTerm))
    ).slice(0, 10);
  }, [debouncedSearchTerm, products]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setSearchTerm(product.name);
    setShowSearchDropdown(false);
  };

  const handleSerialClick = () => {
    const bCode = barcodeInputRef.current?.value?.trim();
    
    if (bCode) {
      const product = barcodeMap.get(bCode);
      if (product) {
        addToCart(product);
        barcodeInputRef.current.value = ''; // Clear after add
        barcodeInputRef.current?.focus(); // Refocus
      } else {
        alert("Product not found with this barcode!");
      }
      return;
    }

    if (searchTerm) {
      const product = products.find(p => p.name.toLowerCase() === searchTerm.toLowerCase() || p.barcode === searchTerm);
      if (product) setSelectedProduct(product);
      else alert("Product not found!");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || p.category_id === activeCategory;
      
      if (posFilter === 'TopSale') {
        return matchesSearch && matchesCategory && (p.stock > 50);
      }
      if (posFilter === 'Favourite') {
        return matchesSearch && matchesCategory && (p.is_favourite || p.rating > 4);
      }
      
      return matchesSearch && matchesCategory;
    });
  }, [products, debouncedSearchTerm, activeCategory, posFilter]);

  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter') {
      const code = e.target.value.trim();
      if (!code) return;

      const product = barcodeMap.get(code);
      if (product) {
        addToCart(product);
        e.target.value = ''; // Clear input immediately
        setBarcode(''); // Clear state if any
      } else {
        alert("Product not found with this barcode!");
      }
    }
  };

  const subTotal = cart.reduce((sum, item) => sum + (item.sale_rate * item.quantity), 0);
  const discountAmount = (subTotal * billDiscount) / 100;
  const deliveryChargeAmount = (subTotal * deliveryChargePercent) / 100;
  const finalTotal = Math.round(subTotal - discountAmount + deliveryChargeAmount - flatDiscount - pointsDiscount);
  const roundOff = (subTotal - discountAmount + deliveryChargeAmount - flatDiscount - pointsDiscount) - finalTotal;

  const handleCheckout = async (pMethod = 'Cash') => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    
    try {
      // Get next bill number robustly
      const lastOrderNo = orders.reduce((max, o) => {
        const num = parseInt(o.order_number);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      const nextBillNo = lastOrderNo + 1;

      // Handle Split Payment Label
      let finalPaymentMethod = pMethod;
      if (isSplitPayment) {
        finalPaymentMethod = `Split (Cash: ₹${cashAmount}, UPI: ₹${upiAmount})`;
      }

      // 1. Create Order
      const orderData = {
        order_number: nextBillNo.toString(),
        user_id: customerInfo.mob || 'POS-CUST',
        customer_name: customerInfo.name || 'Walk-in Customer',
        user_mobile: customerInfo.mob || '',
        address: customerInfo.add || '',
        subtotal: subTotal,
        total_amount: finalTotal,
        payment_method: finalPaymentMethod,
        payment_status: 'paid',
        order_status: 'completed',
        discount: discountAmount + flatDiscount,
        delivery_charge: deliveryChargeAmount
      };

      const orderRes = await handleERPAction(ERP_MODULES.ORDER_MASTER, ACTION_TYPES.INSERT, orderData);
      
      if (!orderRes.success) throw new Error(orderRes.error);

      const createdOrder = orderRes.data[0];
      setLastOrderData(createdOrder);

      // 2. Create Order Items
      const orderItemsData = cart.map(item => ({
        order_id: createdOrder.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        rate: item.sale_rate,
        total: item.sale_rate * item.quantity
      }));

      for (const item of orderItemsData) {
        await handleERPAction(ERP_MODULES.ORDER_ITEMS, ACTION_TYPES.INSERT, item);
        
        // 3. Update Stock & Log
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          const oldStock = parseFloat(product.stock) || 0;
          const newStock = oldStock - item.quantity;

          await handleERPAction(ERP_MODULES.ITEM_MASTER, ACTION_TYPES.UPDATE, {
            id: product.id,
            stock: newStock
          });

          // Create Inventory Log
          await handleERPAction(DB_SCHEMA.INVENTORY_LOGS.table, ACTION_TYPES.INSERT, {
            id: crypto.randomUUID(),
            product_id: product.id,
            old_stock: oldStock,
            new_stock: newStock,
            change_type: 'sale',
            reference_id: createdOrder.order_number
          });
        }
      }

      setIsProcessing(false);
      setShowReceipt(true);

      // 4. Update Loyalty Points for Customer
      if (customerInfo.mob && customerInfo.mob.length >= 10) {
        const earnedPoints = Math.floor(finalTotal * POINTS_PER_RUPEE);
        const newPointsBalance = (customerLoyalty.points - redeemPoints) + earnedPoints;
        
        await handleERPAction(DB_SCHEMA.USERS.table, ACTION_TYPES.UPDATE, {
          mobile: customerInfo.mob,
          points: newPointsBalance
        });
      }

      fetchInitialData(); // Refresh stock and orders in frontend
    } catch (error) {
      console.error("Checkout Error:", error);
      alert("Billing failed: " + error.message);
      setIsProcessing(false);
    }
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
        else clearCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, showReceipt, clearCart]);

  // --- Auto Print Logic ---
  useEffect(() => {
    if (showReceipt && lastOrderData) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showReceipt, lastOrderData]);

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
          <button 
            onClick={() => {
              setPosFilter(posFilter === 'TopSale' ? 'All' : 'TopSale');
              setActiveCategory('All');
            }}
            className={cn(
              "w-full p-2 rounded font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-md transition-all",
              posFilter === 'TopSale' ? "bg-red-600 text-white" : "bg-[#FBBF24] text-slate-900"
            )}
          >
            <Zap size={14} /> Top Sale
          </button>
          <button 
            onClick={() => {
              setPosFilter(posFilter === 'Favourite' ? 'All' : 'Favourite');
              setActiveCategory('All');
            }}
            className={cn(
              "w-full p-2 rounded font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-md transition-all",
              posFilter === 'Favourite' ? "bg-red-600 text-white" : "bg-[#1E293B] text-white"
            )}
          >
            <CheckCircle2 size={14} /> Favourite
          </button>
        </div>
      </div>

      {/* CENTER - Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-2 flex gap-2 bg-[#A5D1E1] relative">
          {/* Alerts Bell Component */}
          <div className="relative">
            <button 
              onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
              className={cn(
                "p-2 rounded-lg relative transition-all active:scale-95",
                posAlerts.length > 0 ? "bg-red-500 text-white shadow-lg animate-pulse" : "bg-white text-slate-400"
              )}
              title="Inventory Alerts"
            >
              <Bell size={18} />
              {posAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {posAlerts.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showAlertsDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-white shadow-2xl rounded-xl border border-slate-200 z-[150] overflow-hidden"
                >
                  <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">System Alerts</span>
                    <button onClick={() => setShowAlertsDropdown(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {posAlerts.length === 0 ? (
                      <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase">No active alerts</div>
                    ) : (
                      posAlerts.map((alert, idx) => (
                        <div key={idx} className="p-3 border-b border-slate-50 last:border-none flex gap-3 hover:bg-slate-50 transition-colors">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            alert.type === 'expiry' ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                          )}>
                            {alert.type === 'expiry' ? <Clock size={16} /> : <Box size={16} />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black text-slate-800 uppercase truncate">{alert.name}</span>
                            <span className="text-[9px] font-bold text-slate-500">{alert.msg}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-slate-800 group-hover:text-blue-700">{p.name}</span>
                        {p.stock <= 5 && (
                          <span className={cn(
                            "text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-tighter",
                            p.stock <= 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                          )}>
                            {p.stock <= 0 ? 'Out of Stock' : `Low: ${p.stock}`}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500">Barcode: {p.barcode || 'N/A'}</span>
                    </div>
                    <span className="text-xs font-black text-red-600">₹{p.sale_rate}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Bill No Search */}
          <input 
            type="text" 
            placeholder="Bill # / CN #" 
            className="w-32 bg-yellow-100 border-2 border-yellow-400 rounded px-3 py-1.5 text-xs font-black text-black shadow-sm outline-none focus:bg-yellow-200"
            value={searchBillNo}
            onChange={(e) => setSearchBillNo(e.target.value)}
            onKeyDown={handleBillSearch}
          />

          <input 
            ref={barcodeInputRef}
            type="text" 
            placeholder="Scan Barcode..." 
            className="w-48 bg-white border-none rounded px-3 py-1.5 text-xs font-black text-black shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
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
          {products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            const matchesCategory = activeCategory === 'All' || p.category_id === activeCategory;
            
            if (posFilter === 'TopSale') {
              return matchesSearch && matchesCategory && (p.stock > 50);
            }
            if (posFilter === 'Favourite') {
              return matchesSearch && matchesCategory && (p.is_favourite || p.rating > 4);
            }
            
            return matchesSearch && matchesCategory;
          }).map(product => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} />
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
                  orderData={lastOrderData}
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
      <div className="w-[420px] bg-white flex flex-col border-l border-slate-300 shadow-2xl">
        {/* Customer Header */}
        <div className="bg-slate-800 text-white p-4 space-y-3 relative">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Name</label>
              <input 
                type="text" 
                placeholder="Enter Name" 
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-semibold placeholder-white/30 outline-none focus:bg-white/20 focus:border-white/40 transition-all"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
              />
            </div>
            <div className="w-32 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mobile No</label>
              <input 
                type="text" 
                placeholder="Number" 
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-semibold placeholder-white/30 outline-none focus:bg-white/20 focus:border-white/40 transition-all"
                value={customerInfo.mob}
                onChange={(e) => setCustomerInfo({...customerInfo, mob: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</label>
            <textarea 
              placeholder="Enter Customer Address" 
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-semibold placeholder-white/30 outline-none focus:bg-white/20 focus:border-white/40 h-16 resize-none transition-all"
              value={customerInfo.add}
              onChange={(e) => setCustomerInfo({...customerInfo, add: e.target.value})}
            />
          </div>

          {/* Customer History & Loyalty Strip */}
          {(customerHistory.length > 0 || customerLoyalty.points > 0) && (
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              {/* Loyalty Info */}
              {customerLoyalty.points > 0 && (
                <div className="flex justify-between items-center bg-blue-500/20 p-2 rounded-lg border border-blue-400/30">
                  <div className="flex items-center gap-2">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-black uppercase">Points: {customerLoyalty.points}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setFlatDiscount(prev => prev + customerLoyalty.points);
                      alert(`₹${customerLoyalty.points} redeemed from points!`);
                    }}
                    className="bg-white text-blue-600 px-2 py-0.5 rounded text-[9px] font-black uppercase shadow-sm"
                  >
                    Redeem
                  </button>
                </div>
              )}

              {/* History Preview */}
              {customerHistory.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Recent Visits</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {customerHistory.map(h => (
                      <div key={h.id} className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[9px] whitespace-nowrap">
                        <span className="font-bold">₹{h.total_amount}</span>
                        <span className="mx-1 opacity-40">|</span>
                        <span className="opacity-60">{new Date(h.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Table Header */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex justify-between text-xs font-bold text-slate-600 uppercase tracking-widest">
          <span className="w-1/2">Item Name</span>
          <span className="w-1/4 text-center">Qty</span>
          <span className="w-1/4 text-right">Amount</span>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto bg-white relative">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
              <ShoppingCart size={48} strokeWidth={1} />
              <p className="text-sm font-medium uppercase tracking-widest">Cart is empty</p>
            </div>
          ) : cart.map((item, idx) => (
            <CartItem 
              key={item.id} 
              item={item} 
              removeFromCart={removeFromCart} 
              updateQty={updateQty} 
            />
          ))}
        </div>

        {/* Bill Summary */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
          {/* Held Bills Quick Access */}
          {heldBills.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {heldBills.map(hb => (
                <button 
                  key={hb.id}
                  onClick={() => resumeHoldBill(hb)}
                  className="bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg text-[9px] font-bold uppercase whitespace-nowrap flex items-center gap-2"
                >
                  <Clock size={10} /> Hold: {hb.time} (₹{hb.total})
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
              <span className="font-bold text-slate-800">₹{subTotal.toLocaleString()}</span>
            </div>
            
            {/* Split Payment Inputs */}
            {isSplitPayment && (
              <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-2 shadow-sm">
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Split Payment (Cash + UPI)</p>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase">Cash Amt</label>
                    <input 
                      type="number" 
                      value={cashAmount} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCashAmount(val);
                        setUpiAmount(Math.max(0, finalTotal - val));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase">UPI Amt</label>
                    <input 
                      type="number" 
                      value={upiAmount} 
                      className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-400 outline-none cursor-not-allowed"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bill Discount</span>
                <div className="flex items-center bg-white border border-slate-200 rounded px-2">
                  <input 
                    type="number" 
                    value={billDiscount} 
                    onChange={(e) => setBillDiscount(e.target.value)} 
                    className="w-10 py-1 text-xs font-bold text-blue-600 focus:ring-0 border-none bg-transparent text-right" 
                  />
                  <span className="text-[10px] font-bold text-slate-400">%</span>
                </div>
              </div>
              <span className="text-xs font-bold text-red-500">-₹{discountAmount.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Flat Discount</span>
                <input 
                  type="number" 
                  value={flatDiscount} 
                  onChange={(e) => setFlatDiscount(e.target.value)} 
                  className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-red-600 focus:ring-1 focus:ring-red-200 outline-none text-right" 
                />
              </div>
              <span className="text-xs font-bold text-red-500">-₹{parseFloat(flatDiscount || 0).toLocaleString()}</span>
            </div>

            {/* Tax Display */}
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span className="font-bold uppercase tracking-widest">GST (CGST 2.5% + SGST 2.5%)</span>
              <span className="font-bold">₹{(finalTotal * 0.05).toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Round Off</span>
              <span className="text-xs font-bold text-slate-400">{roundOff.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-800 uppercase tracking-tighter">Total Bill Amount</span>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">₹{finalTotal.toLocaleString()}</h3>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <button 
              onClick={clearCart}
              className="bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
              title="Clear Cart"
            >
              <RefreshCw size={14} />
            </button>
            <button 
              onClick={handleHoldBill}
              disabled={cart.length === 0}
              className="bg-amber-50 text-amber-600 border border-amber-200 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              title="Hold Bill"
            >
              <Pause size={14} />
            </button>
            <button 
              onClick={handleCreateCreditNote}
              disabled={cart.length === 0 || isProcessing}
              className="bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 disabled:opacity-50 transition-colors"
              title="Return / Create CN"
            >
              <ArrowLeftRight size={14} />
            </button>
            <button 
              onClick={() => {
                setIsSplitPayment(!isSplitPayment);
                setCashAmount(finalTotal);
                setUpiAmount(0);
              }}
              className={cn(
                "border py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
                isSplitPayment ? "bg-blue-600 text-white border-blue-700" : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
              )}
              title="Split Payment"
            >
              <LayoutGrid size={14} />
            </button>
            <button 
              disabled={cart.length === 0 || isProcessing}
              onClick={() => handleCheckout('UPI')}
              className="bg-purple-50 text-purple-600 border border-purple-200 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-purple-100 disabled:opacity-50 transition-colors"
              title="UPI Pay"
            >
              <Zap size={14} />
            </button>
          </div>

          <button 
            disabled={cart.length === 0 || isProcessing}
            onClick={() => {
              if (isSplitPayment) handleCheckout('Split');
              else setShowPaymentModal(true);
            }}
            className="w-full bg-[#E11D48] text-white py-5 rounded-2xl font-black text-sm uppercase shadow-xl shadow-red-200 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <><Save size={20}/> {isSplitPayment ? 'Complete Split Sale' : 'Complete Bill (F12)'}</>}
          </button>
        </div>
      </div>

      {/* Payment Mode Selection Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Select Payment Mode</h3>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { setShowPaymentModal(false); handleCheckout('Cash'); }}
                  className="bg-orange-500 text-white p-6 rounded-2xl flex flex-col items-center gap-2 hover:bg-orange-600 transition-all shadow-lg"
                >
                  <IndianRupee size={32} />
                  <span className="font-black text-sm">CASH</span>
                </button>
                <button 
                  onClick={() => { setShowPaymentModal(false); handleCheckout('UPI'); }}
                  className="bg-blue-600 text-white p-6 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
                >
                  <Zap size={32} />
                  <span className="font-black text-sm">UPI</span>
                </button>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 font-bold uppercase text-xs hover:text-slate-600">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
