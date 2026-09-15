import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
  ShoppingCart, X, Plus, Minus, CheckCircle2, IndianRupee, QrCode, ShoppingBag, ShieldCheck, CreditCard, Camera, Scan, Search as SearchIcon, Package, AlertTriangle, XCircle, Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../supabase';
import { dbSync } from '../dbSync';
import { DB_SCHEMA } from '../dbSchema';

export default function SelfCheckoutKiosk() {
  const [cart, setCart] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [ScannerComponent, setScannerComponent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [appConfig, setAppConfig] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [upiId, setUpiId] = useState('example@upi');
  
  // Refs to prevent infinite loops
  const qrGeneratedForRef = useRef(null);
  const barcodeInputRef = useRef(null);

  // --- Full Screen Logic ---
  useEffect(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'F11') {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Fetch Initial Data ---
  const fetchInitialData = useCallback(async () => {
    try {
      const productsData = await dbSync.fetch(DB_SCHEMA.PRODUCTS.table, {});
      setProducts(productsData || []);
      if (import.meta.env.DEV) {
        console.log('[SelfCheckoutKiosk] Loaded products via dbSync:', productsData.length);
      }

      const ordersData = await dbSync.fetch(DB_SCHEMA.ORDERS.table, { limit: 100 });
      setOrders(ordersData || []);

      try {
        const configList = await dbSync.fetch(DB_SCHEMA.APP_CONFIG.table, { limit: 1 });
        const configData = Array.isArray(configList) ? configList[0] : null;
        if (configData) {
          setAppConfig(configData);
          if (configData.upi_id) {
            setUpiId(configData.upi_id);
          }
        }
      } catch (configErr) {
        console.error('[SelfCheckoutKiosk] app_config load error (non-fatal):', configErr?.message || configErr);
      }
    } catch (error) {
      console.error('[SelfCheckoutKiosk] dbSync fetch error, trying direct fallback:', error);
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('readable_products')
          .select('*')
          .limit(5000);
        if (!productsError && productsData) {
          setProducts(productsData);
        } else {
          const { data: fallbackProd, error: fallbackErr } = await supabase
            .from('products')
            .select('*')
            .limit(5000);
          if (!fallbackErr && fallbackProd) {
            setProducts(fallbackProd);
          }
        }

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .limit(100);
        if (!ordersError) setOrders(ordersData || []);

        const { data: configData, error: configError } = await supabase
          .from('app_config')
          .select('*')
          .limit(1)
          .single();
        if (!configError) {
          setAppConfig(configData);
          if (configData.upi_id) {
            setUpiId(configData.upi_id);
          }
        }
      } catch (fallbackErr2) {
        console.error('[SelfCheckoutKiosk] All fetch attempts failed:', fallbackErr2);
      }
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // --- Barcode Mapping ---
  const barcodeMap = useMemo(() => {
    const map = new Map();
    (products || []).forEach(p => {
      if (p.barcode) {
        const trimmedBarcode = p.barcode.trim();
        map.set(trimmedBarcode, p);
        console.log('[SelfCheckoutKiosk] Added product to barcodeMap:', { 
          barcode: trimmedBarcode, 
          name: p.itname || p.name 
        });
      }
    });
    console.log('[SelfCheckoutKiosk] Final barcodeMap has', map.size, 'products');
    return map;
  }, [products]);

  // --- Products Search & Filter ---
  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(p => {
      const name = (p.itname || p.name || '').toString().toLowerCase();
      const barcode = (p.barcode || '').toString().toLowerCase();
      const hsn = (p.hsncode || p.hsn_code || '').toString().toLowerCase();
      return name.includes(q) || barcode.includes(q) || hsn.includes(q);
    });
  }, [products, searchQuery]);

  // --- Calculations ---
  const subTotal = cart.reduce((sum, item) => sum + (item.sale_rate * item.quantity), 0);
  // GST is already included in MRP, so no separate tax calculation
  const finalTotal = Math.round(subTotal);

  // --- Cart Functions ---
  const addToCart = useCallback((product) => {
    if (!product) return;
    const productName = product.itname || product.name;
    const productStock = product.opstock || product.stock || 999; // Default to 999 if stock not available
    const productSaleRate = product.onlinerate || product.sale_rate || product.price || 0; // Default to 0 if price not available, or add product.price too

    // Allow even if productStock is 0 (kiosk mode, no strict stock check)
    // if (productStock <= 0) {
    //   toast.error('Out of stock!');
    //   return;
    // }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= productStock) {
          toast.error('Not enough stock!');
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { 
        ...product, 
        name: productName, 
        sale_rate: productSaleRate,
        itname: productName,
        onlinerate: productSaleRate,
        opstock: productStock,
        stock: productStock,
        gst: product.gst,
        gst_percent: product.gst_percent,
        quantity: 1 
      }];
    });
    toast.success(`Added ${productName} to cart`);
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  }, []);

  const updateQty = useCallback((productId, newQty) => {
    if (newQty === 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQty } : item));
  }, [removeFromCart]);

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to clear the cart?')) {
      setCart([]);
      toast.success('Cart cleared!');
    }
  };

  // --- Barcode Handling ---
  const handleBarcodeKeyDown = useCallback((e) => {
    console.log('[SelfCheckoutKiosk] Key pressed:', e.key);
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission if any
      const code = barcodeInput.trim(); // Use state value directly
      console.log('[SelfCheckoutKiosk] Barcode entered:', code);
      if (!code) {
        console.log('[SelfCheckoutKiosk] No barcode entered!');
        return;
      }
      
      console.log('[SelfCheckoutKiosk] Looking for barcode in barcodeMap...');
      const product = barcodeMap.get(code);
      console.log('[SelfCheckoutKiosk] Found product:', product);
      
      if (product) {
        addToCart(product);
        setBarcodeInput('');
        setTimeout(() => {
          barcodeInputRef.current?.focus();
        }, 50); // Slightly faster
      } else {
        console.log('[SelfCheckoutKiosk] Product not found for barcode:', code);
        toast.error('Product not found!');
      }
    }
  }, [addToCart, barcodeMap, barcodeInput]);

  const handleCameraScan = useCallback((detectedCodes) => {
    if (detectedCodes.length > 0) {
      const code = detectedCodes[0].rawValue;
      const product = barcodeMap.get(code);
      if (product) {
        addToCart(product);
        setShowScanner(false);
        setTimeout(() => {
          barcodeInputRef.current?.focus();
        }, 100);
      } else {
        toast.error('Product not found!');
      }
    }
  }, [addToCart, barcodeMap]);

  // --- UPI QR Generation ---
  const generateUPIQR = useCallback(async () => {
    const upiUrl = `upi://pay?pa=${upiId}&pn=NM%20MART&am=${finalTotal.toFixed(2)}&cu=INR`;
    try {
      const QRCodeLib = (await import('qrcode')).default;
      const qrDataUrl = await QRCodeLib.toDataURL(upiUrl, { width: 300, margin: 2 });
      setQrImageUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  }, [finalTotal, upiId]);

  useEffect(() => {
    if (currentStep === 2 && cart.length > 0) {
      const currentKey = `${finalTotal}-${upiId}`;
      if (qrGeneratedForRef.current !== currentKey) {
        generateUPIQR();
        qrGeneratedForRef.current = currentKey;
      }
    }
  }, [currentStep, finalTotal, upiId, cart.length, generateUPIQR]);

  // Load Scanner component dynamically when needed
  useEffect(() => {
    if (showScanner && !ScannerComponent) {
      import('@yudiel/react-qr-scanner').then(module => {
        setScannerComponent(() => module.Scanner);
      });
    }
  }, [showScanner, ScannerComponent]);

  // --- Complete Order ---
  const completeOrder = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const lastOrderNo = orders.reduce((max, o) => {
        const num = parseInt(o.order_number);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      const nextBillNo = lastOrderNo + 1;

      const orderData = {
        order_number: nextBillNo.toString(),
        user_id: 'self-checkout-kiosk',
        customer_name: 'Kiosk Customer',
        user_mobile: '',
        address: '',
        subtotal: subTotal,
        tax: totalTax,
        total_amount: finalTotal,
        payment_method: 'UPI',
        payment_status: 'paid',
        order_status: 'completed',
        discount: 0,
        delivery_charge: 0
      };

      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select();
      
      if (orderError) throw orderError;

      const order = createdOrder[0];

      for (const item of cart) {
        await supabase.from('order_items').insert([{
          order_id: order.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          rate: item.sale_rate,
          total: item.sale_rate * item.quantity
        }]);

        const product = products.find(p => p.id === item.id);
        if (product) {
          const productStock = product.opstock || product.stock || 0;
          const newStock = productStock - item.quantity;
          await supabase.from('products').update({
            stock: newStock,
            opstock: newStock
          }).eq('id', product.id);

          await supabase.from('inventory_logs').insert([{
            id: crypto.randomUUID(),
            product_id: product.id,
            old_stock: productStock,
            new_stock: newStock,
            change_type: 'sale',
            reference_id: order.order_number
          }]);
        }
      }

      setLastOrder(order);
      setCart([]);
      setCurrentStep(3);
      fetchInitialData();
      toast.success('Payment successful! Thank you for shopping!');
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Order failed!');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCurrentStep(1);
    setLastOrder(null);
    setQrImageUrl('');
    qrGeneratedForRef.current = null;
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  // Auto-focus barcode input on mount and when on step 1
  useEffect(() => {
    if (currentStep === 1) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 300);
    }
  }, [currentStep]);

  return (
    <div className="fixed inset-0 w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="relative z-20 bg-white/30 backdrop-blur-xl border-b border-white/30 px-6 py-4 shadow-lg shadow-indigo-500/10 flex-shrink-0">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
              <ShoppingBag size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">NM MART</h1>
              <p className="text-xs font-bold text-slate-600">Self Checkout Kiosk</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
            <ShieldCheck size={18} className="text-green-600" />
            <span className="text-xs font-black uppercase tracking-wide">Secure Payment</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col overflow-hidden">
        <div className="flex-1 w-full h-full">
          <AnimatePresence mode="wait">
            {/* Step 1: Browse Products, Cart & Scan */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 xl:grid-cols-12 gap-5 h-full"
              >
                {/* Col 1/2: Products Browse Panel */}
                <div className="xl:col-span-6 bg-white/70 backdrop-blur-xl border border-white/30 rounded-[2rem] p-5 shadow-2xl shadow-indigo-500/10 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/50 gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
                        <Package size={20} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-black text-slate-800 truncate">Products</h2>
                        <p className="text-xs font-bold text-slate-500 truncate">Showing {filteredProducts.length} of {products.length} items</p>
                      </div>
                    </div>
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                      <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, barcode or HSN..."
                        className="w-full pl-11 pr-4 py-3 bg-white/90 border-2 border-slate-200 rounded-2xl text-base font-bold text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* Products Grid */}
                  <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                    {products.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-12">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-5 shadow-inner animate-pulse">
                          <Package size={44} className="text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Loading Products...</h3>
                        <p className="text-sm font-bold text-slate-500 max-w-xs">Syncing inventory from Supabase — please wait a moment.</p>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-12">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-5">
                          <SearchIcon size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">No Products Found</h3>
                        <p className="text-sm font-bold text-slate-500 max-w-xs">Try a different search keyword or scan a barcode directly.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
                        {filteredProducts.map((product, idx) => {
                          const name = product.itname || product.name || 'Unknown Item';
                          const stock = parseFloat(product.opstock ?? product.stock ?? 0);
                          const saleRate = parseFloat(product.onlinerate || product.sale_rate || product.restrate || 0);
                          const mrp = parseFloat(product.mrp || saleRate);
                          const unit = product.unitcode || product.unit_name || 'PCS';
                          const imageUrl = product.picture || product.image_url || null;
                          const barcode = product.barcode || '';
                          const outOfStock = stock <= 0;
                          return (
                            <button
                              key={`prod-${product.id}-${idx}`}
                              onClick={() => !outOfStock && addToCart(product)}
                              disabled={outOfStock}
                              className={
                                "bg-white rounded-xl border transition-all flex flex-col h-auto relative group overflow-hidden shadow-sm hover:shadow-lg hover:translate-y-[-2px] active:scale-95 text-left " +
                                (outOfStock ? "border-slate-200 bg-slate-50 cursor-not-allowed opacity-70" : "border-slate-200 hover:border-indigo-300")
                              }
                            >
                              <div className="relative aspect-square w-full bg-slate-100 flex items-center justify-center border-b border-slate-100 overflow-hidden p-2">
                                {imageUrl ? (
                                  <img src={imageUrl} alt={name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                ) : (
                                  <div className="flex flex-col items-center gap-1 opacity-25">
                                    <Package size={28} />
                                    <span className="text-[8px] font-black uppercase">No Image</span>
                                  </div>
                                )}
                                {outOfStock && (
                                  <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
                                    <div className="bg-red-600 text-white font-black uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1 text-[9px] px-3 py-1">
                                      <XCircle size={10} /> Out of Stock
                                    </div>
                                  </div>
                                )}
                                <div className="absolute top-1.5 right-1.5 bg-white/95 backdrop-blur text-slate-800 font-black rounded border border-slate-200 shadow-sm uppercase text-[8px] px-2 py-0.5">
                                  {unit}
                                </div>
                              </div>
                              <div className="space-y-1.5 flex-1 flex flex-col justify-between p-2.5">
                                <div className="space-y-1 min-w-0">
                                  <h4 className="font-black text-slate-800 uppercase leading-tight line-clamp-2 text-[10.5px] min-h-[20px] break-words">
                                    {name}
                                  </h4>
                                  <div className="flex items-center gap-1 font-bold text-slate-400 uppercase tracking-wider text-[8px] min-w-0">
                                    <Hash size={8} className="flex-shrink-0" />
                                    <span className="truncate">{barcode || 'No Barcode'}</span>
                                  </div>
                                </div>
                                <div className="flex items-end justify-between pt-0.5 gap-1">
                                  <div className="flex flex-col min-w-0">
                                    {mrp > 0 && mrp > saleRate && (
                                      <span className="text-[8.5px] font-bold text-slate-400 line-through truncate">₹{mrp.toFixed(0)}</span>
                                    )}
                                    <span className="font-black text-indigo-600 tracking-tighter text-sm leading-none whitespace-nowrap">₹{saleRate.toFixed(0)}</span>
                                  </div>
                                  {stock > 10 ? (
                                    <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 rounded font-black uppercase tracking-tight border border-emerald-100 px-1.5 py-0.5 text-[8px] flex-shrink-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      Stock
                                    </div>
                                  ) : stock > 0 ? (
                                    <div className="flex items-center gap-1 text-orange-600 bg-orange-50 rounded font-black uppercase tracking-tight border border-orange-100 animate-pulse px-1.5 py-0.5 text-[8px] flex-shrink-0">
                                      <AlertTriangle size={9} />
                                      {stock}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-red-600 bg-red-50 rounded font-black uppercase tracking-tight border border-red-100 px-1.5 py-0.5 text-[8px] flex-shrink-0">
                                      <XCircle size={9} />
                                      0
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Col 3: Cart Card */}
                <div className="xl:col-span-4 bg-white/70 backdrop-blur-xl border border-white/30 rounded-[2rem] p-5 shadow-2xl shadow-indigo-500/10 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <ShoppingCart size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-800">Your Cart</h2>
                        <p className="text-xs font-bold text-slate-500">{cart.length} items</p>
                      </div>
                    </div>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl font-black text-xs hover:bg-red-100 transition-all border border-red-100"
                      >
                        <X size={14} /> Clear
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
                    {cart.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-10 h-full">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                          <ShoppingCart size={40} className="text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-1">Cart is empty</h3>
                        <p className="text-sm font-bold text-slate-500 max-w-xs">Tap any product card to add it here, or scan a barcode.</p>
                      </div>
                    ) : (
                      cart.map((item, idx) => (
                        <motion.div
                          key={`${item.id}-${idx}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                          className="flex items-center gap-3 p-3 bg-white/70 rounded-2xl border border-slate-200/50 hover:bg-white/95 transition-all"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1 gap-2">
                              <h3 className="text-sm font-black text-slate-800 leading-tight line-clamp-2 break-words">{item.itname || item.name}</h3>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => updateQty(item.id, item.quantity - 1)}
                                  className="w-7 h-7 flex items-center justify-center bg-white border-2 border-slate-300 rounded-full text-slate-700 font-black hover:bg-slate-50 transition-all shadow-sm"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-8 text-center text-base font-black text-slate-800 tabular-nums">{item.quantity}</span>
                                <button
                                  onClick={() => updateQty(item.id, item.quantity + 1)}
                                  className="w-7 h-7 flex items-center justify-center bg-white border-2 border-slate-300 rounded-full text-slate-700 font-black hover:bg-slate-50 transition-all shadow-sm"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-slate-500">₹{(item.sale_rate || 0).toLocaleString()}/item</p>
                              <div className="flex items-center gap-3">
                                <p className="text-base font-black text-slate-800 tabular-nums">₹{((item.sale_rate || 0) * (item.quantity || 0)).toLocaleString()}</p>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-all"
                                  aria-label="Remove item"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Col 4: Scanner & Total Cards */}
                <div className="xl:col-span-2 space-y-5 flex flex-col min-h-0">
                  {/* Scanner Card */}
                  <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-[2rem] p-5 shadow-2xl shadow-indigo-500/10 flex-shrink-0">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-200/50">
                      <Scan size={18} className="text-indigo-600" />
                      <h3 className="text-base font-black text-slate-800">Scan Product</h3>
                    </div>
                    <div className="space-y-3">
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={handleBarcodeKeyDown}
                        placeholder="Barcode or scan..."
                        className="w-full px-4 py-3 bg-white/90 border-2 border-slate-200 rounded-2xl text-base font-black text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder-slate-400"
                        autoFocus
                      />
                      <button
                        onClick={() => setShowScanner(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black text-base hover:from-indigo-700 hover:to-blue-700 transition-all shadow-xl shadow-indigo-500/30"
                      >
                        <Camera size={20} /> Quick Scan
                      </button>
                    </div>
                  </div>

                  {/* Total Card */}
                  <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-[2rem] p-5 shadow-2xl shadow-indigo-500/10 flex-1 flex flex-col min-h-0">
                    <div className="space-y-3 mb-5">
                      <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                        <span>Subtotal</span>
                        <span className="tabular-nums">₹{subTotal.toLocaleString()}</span>
                      </div>
                      <div className="h-px bg-slate-300/60 my-0.5" />
                      <div className="flex justify-between items-center text-2xl font-black text-slate-800">
                        <span>Total</span>
                        <span className="text-indigo-600 tabular-nums">₹{finalTotal.toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentStep(2)}
                      disabled={cart.length === 0 || isProcessing}
                      className="w-full mt-auto bg-gradient-to-r from-green-700 to-emerald-700 text-white py-4 rounded-2xl font-black text-lg hover:from-green-800 hover:to-emerald-800 transition-all shadow-2xl shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-2xl mx-auto bg-white/70 backdrop-blur-xl border border-white/30 rounded-[2.5rem] p-12 shadow-2xl shadow-indigo-500/10"
              >
                <div className="text-center mb-10">
                  <div className="w-28 h-28 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow-2xl mb-6">
                    <IndianRupee size={56} />
                  </div>
                  <h2 className="text-4xl font-black text-slate-800 mb-3">Complete Your Payment</h2>
                  <p className="text-xl font-bold text-slate-500">Total Amount: ₹{finalTotal.toLocaleString()}</p>
                </div>

                {/* QR Code */}
                <div className="bg-white/80 rounded-3xl p-10 mb-10 flex flex-col items-center gap-5 border-2 border-dashed border-slate-300/60">
                  {qrImageUrl ? (
                    <img src={qrImageUrl} alt="UPI QR Code" className="rounded-2xl shadow-lg" />
                  ) : (
                    <QrCode size={300} className="text-slate-300" />
                  )}
                  <div className="text-center">
                    <p className="text-xl font-black text-slate-800">Scan to Pay via UPI</p>
                    <p className="text-sm font-bold text-slate-500 mt-1">{upiId}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 bg-slate-100 text-slate-700 py-5 rounded-2xl font-black text-xl hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    Back to Cart
                  </button>
                  <button
                    onClick={completeOrder}
                    disabled={isProcessing}
                    className="flex-1 bg-gradient-to-r from-green-700 to-emerald-700 text-white py-5 rounded-2xl font-black text-xl hover:from-green-800 hover:to-emerald-800 transition-all shadow-xl shadow-green-500/30 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Mark as Paid'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Complete */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto bg-white/70 backdrop-blur-xl border border-white/30 rounded-[2.5rem] p-12 text-center shadow-2xl shadow-indigo-500/10"
              >
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white shadow-2xl mb-8">
                  <CheckCircle2 size={64} />
                </div>
                <h2 className="text-4xl font-black text-slate-800 mb-4">Thank You for Shopping!</h2>
                <p className="text-lg font-bold text-slate-500 mb-10">Your order has been placed successfully</p>
                {lastOrder && (
                  <div className="bg-white/80 rounded-2xl p-8 mb-10 border border-slate-200/50">
                    <p className="text-sm font-black text-slate-600 uppercase tracking-wide">Order Number</p>
                    <p className="text-4xl font-black text-slate-800 mt-2">{lastOrder.order_number}</p>
                  </div>
                )}
                <button
                  onClick={reset}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-6 rounded-2xl font-black text-2xl hover:from-indigo-700 hover:to-blue-700 transition-all shadow-xl shadow-indigo-500/30"
                >
                  Start New Order
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl max-w-3xl w-full mx-8 overflow-hidden border border-white/50"
            >
              <div className="p-8 border-b border-slate-200/50 flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-800">Scan Product Barcode</h3>
                <button onClick={() => setShowScanner(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all">
                  <X size={28} />
                </button>
              </div>
              <div className="relative aspect-video bg-slate-100">
                {ScannerComponent && (
                  <ScannerComponent
                    onScan={handleCameraScan}
                    onError={(err) => console.error(err)}
                    constraints={{ facingMode: 'environment' }}
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
