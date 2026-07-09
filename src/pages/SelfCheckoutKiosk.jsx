import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
  ShoppingCart, X, Plus, Minus, CheckCircle2, IndianRupee, QrCode, ShoppingBag, ShieldCheck, CreditCard, Camera, Scan
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import QRCodeLib from 'qrcode';
import { supabase } from '../supabase';

export default function SelfCheckoutKiosk() {
  const [cart, setCart] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
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
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*');
      if (!productsError) setProducts(productsData || []);

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*');
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
    } catch (error) {
      console.error('Error fetching data:', error);
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

  // --- Calculations ---
  const subTotal = cart.reduce((sum, item) => sum + (item.sale_rate * item.quantity), 0);
  const totalTax = cart.reduce((sum, item) => {
    const itemTotal = item.sale_rate * item.quantity;
    const itemTaxRate = item.gst_percent || item.gst || appConfig?.tax_rate || 5;
    return sum + (itemTotal * itemTaxRate) / 100;
  }, 0);
  const finalTotal = Math.round(subTotal + totalTax);

  // --- Cart Functions ---
  const addToCart = useCallback((product) => {
    if (!product) return;
    const productName = product.itname || product.name;
    const productStock = product.opstock || product.stock || 0;
    const productSaleRate = product.onlinerate || product.sale_rate || 0;

    if (productStock <= 0) {
      toast.error('Out of stock!');
      return;
    }

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
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden flex flex-col font-sans">
      {/* Header */}
      <header className="relative z-20 bg-white/30 backdrop-blur-xl border-b border-white/30 px-8 py-6 shadow-lg shadow-indigo-500/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
              <ShoppingBag size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">NM MART</h1>
              <p className="text-sm font-bold text-slate-600">Self Checkout Kiosk</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
            <ShieldCheck size={20} className="text-green-600" />
            <span className="text-sm font-black uppercase tracking-wide">Secure Payment</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Scan & Cart */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Cart Card - Glassmorphism */}
                <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-white/30 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 flex flex-col">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                        <ShoppingCart size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-800">Your Shopping Cart</h2>
                        <p className="text-sm font-bold text-slate-500">{cart.length} items</p>
                      </div>
                    </div>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-black text-sm hover:bg-red-100 transition-all border border-red-100"
                      >
                        <X size={18} />
                        Clear Cart
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {cart.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                        <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-8 shadow-inner">
                          <ShoppingCart size={64} className="text-indigo-400" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 mb-2">Welcome to NM MART</h3>
                        <p className="text-lg font-bold text-slate-500 max-w-md">Experience the fastest way to shop. Scan, Pay & Go!</p>
                      </div>
                    ) : (
                      cart.map((item, idx) => (
                        <motion.div
                          key={`${item.id}-${idx}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-6 p-6 bg-white/60 rounded-2xl border border-slate-200/50 hover:bg-white/80 transition-all"
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xl font-black text-slate-800">{item.itname}</h3>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => updateQty(item.id, item.quantity - 1)}
                                  className="w-10 h-10 flex items-center justify-center bg-white border-2 border-slate-300 rounded-full text-slate-700 font-black hover:bg-slate-50 transition-all shadow-sm"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="w-12 text-center text-2xl font-black text-slate-800">{item.quantity}</span>
                                <button
                                  onClick={() => updateQty(item.id, item.quantity + 1)}
                                  className="w-10 h-10 flex items-center justify-center bg-white border-2 border-slate-300 rounded-full text-slate-700 font-black hover:bg-slate-50 transition-all shadow-sm"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-base font-bold text-slate-500">₹{item.sale_rate.toLocaleString()}/item</p>
                              <div className="flex items-center gap-4">
                                <p className="text-2xl font-black text-slate-800">₹{(item.sale_rate * item.quantity).toLocaleString()}</p>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-all"
                                >
                                  <X size={20} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Scanner & Total Cards - Glassmorphism */}
                <div className="space-y-8">
                  {/* Scanner Card */}
                  <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200/50">
                      <Scan size={24} className="text-indigo-600" />
                      <h3 className="text-xl font-black text-slate-800">Scan Product</h3>
                    </div>
                    <div className="space-y-4">
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={handleBarcodeKeyDown}
                        placeholder="Enter barcode or scan..."
                        className="w-full px-6 py-5 bg-white/80 border-2 border-slate-200 rounded-2xl text-xl font-black text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder-slate-400"
                        autoFocus
                      />
                      <button
                        onClick={() => setShowScanner(true)}
                        className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black text-xl hover:from-indigo-700 hover:to-blue-700 transition-all shadow-xl shadow-indigo-500/30"
                      >
                        <Camera size={24} />
                        Quick Scan
                      </button>
                    </div>
                  </div>

                  {/* Total Card */}
                  <div className="bg-white/70 backdrop-blur-xl border border-white/30 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10">
                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center text-lg font-bold text-slate-600">
                        <span>Subtotal</span>
                        <span>₹{subTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-bold text-slate-600">
                        <span>Total Tax</span>
                        <span>₹{totalTax.toLocaleString()}</span>
                      </div>
                      <div className="h-px bg-slate-300/60 my-2" />
                      <div className="flex justify-between items-center text-3xl font-black text-slate-800">
                        <span>Total</span>
                        <span className="text-indigo-600">₹{finalTotal.toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentStep(2)}
                      disabled={cart.length === 0 || isProcessing}
                      className="w-full bg-gradient-to-r from-green-700 to-emerald-700 text-white py-6 rounded-2xl font-black text-2xl hover:from-green-800 hover:to-emerald-800 transition-all shadow-2xl shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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
                <Scanner
                  onScan={handleCameraScan}
                  onError={(err) => console.error(err)}
                  constraints={{ facingMode: 'environment' }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
