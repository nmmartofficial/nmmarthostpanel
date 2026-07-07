import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
  ShoppingCart, X, Plus, Minus, Camera, CheckCircle2, IndianRupee, QrCode, Smartphone, ShoppingBag, ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion, AnimatePresence } from 'framer-motion';
import { handleERPAction, ACTION_TYPES, ERP_MODULES } from '../erpController';
import { DB_SCHEMA } from '../dbSchema';
import { cn } from '../utils/helpers';
import { toast } from 'sonner';

export default function SelfCheckoutView({ products, fetchInitialData, appConfig, orders, customerMode, setCustomerMode }) {
  const [cart, setCart] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [showBarcodeInput, setShowBarcodeInput] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: Scan Items, 2: Payment, 3: Complete
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Full screen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const barcodeMap = useMemo(() => {
    const map = new Map();
    (products || []).forEach(p => {
      if (p.barcode) map.set(p.barcode.trim(), p);
    });
    return map;
  }, [products]);

  const subTotal = cart.reduce((sum, item) => sum + (item.sale_rate * item.quantity), 0);
  const tax = cart.reduce((sum, item) => {
    const itemTotal = item.sale_rate * item.quantity;
    const itemTaxRate = item.gst_percent || item.gst || appConfig?.tax_rate || 5;
    return sum + (itemTotal * itemTaxRate) / 100;
  }, 0);
  const finalTotal = Math.round(subTotal + tax);

  const addToCart = useCallback((product) => {
    console.log('[SelfCheckout] addToCart called with product:', product);
    if (!product) {
      console.warn('[SelfCheckout] addToCart: No product provided!');
      return;
    }
    const productName = product.itname || product.name;
    const productStock = product.opstock || product.stock || 0;
    const productSaleRate = product.onlinerate || product.sale_rate || 0;

    console.log('[SelfCheckout] Product details:', { productName, productStock, productSaleRate });

    if (productStock <= 0) {
      console.warn('[SelfCheckout] addToCart: Product out of stock!');
      toast.error('Out of stock!');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      console.log('[SelfCheckout] Existing item in cart:', existing);
      if (existing) {
        if (existing.quantity >= productStock) {
          console.warn('[SelfCheckout] addToCart: Not enough stock!');
          toast.error('Not enough stock!');
          return prev;
        }
        console.log('[SelfCheckout] Incrementing quantity of existing item');
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
    }
    console.log('[SelfCheckout] Adding new item to cart');
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
    console.log('[SelfCheckout] removeFromCart called with productId:', productId);
    setCart(prev => prev.filter(item => item.id !== productId));
  }, []);

  const updateQty = useCallback((productId, newQty) => {
    console.log('[SelfCheckout] updateQty called with productId:', productId, 'newQty:', newQty);
    if (newQty === 0) {
      console.log('[SelfCheckout] updateQty: Quantity is 0, removing from cart');
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQty } : item));
  }, [removeFromCart]);

  const handleBarcodeKeyDown = useCallback((e) => {
    console.log('[SelfCheckout] handleBarcodeKeyDown called, key:', e.key);
    if (e.key === 'Enter') {
      const code = showBarcodeInput.trim();
      console.log('[SelfCheckout] Barcode entered:', code);
      if (!code) {
        console.warn('[SelfCheckout] No barcode entered!');
        return;
      }
      const product = barcodeMap.get(code);
      console.log('[SelfCheckout] Product found for barcode:', product);
      if (product) {
        addToCart(product);
        setShowBarcodeInput('');
      } else {
        toast.error('Product not found!');
      }
    }
  }, [addToCart, barcodeMap, showBarcodeInput]);

  const handleCameraScan = useCallback((detectedCodes) => {
    console.log('[SelfCheckout] handleCameraScan called, detectedCodes:', detectedCodes);
    if (detectedCodes.length > 0) {
      const code = detectedCodes[0].rawValue;
      console.log('[SelfCheckout] Scanned barcode:', code);
      const product = barcodeMap.get(code);
      console.log('[SelfCheckout] Product found for scanned barcode:', product);
      if (product) {
        addToCart(product);
        setShowScanner(false);
      } else {
        toast.error('Product not found!');
      }
    }
  }, [addToCart, barcodeMap]);

  const completePayment = async () => {
    console.log('[SelfCheckout] completePayment called, cart:', cart);
    if (cart.length === 0) {
      console.warn('[SelfCheckout] completePayment: Cart is empty!');
      return;
    }
    setIsProcessing(true);
    try {
      const lastOrderNo = orders.reduce((max, o) => {
        const num = parseInt(o.order_number);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      const nextBillNo = lastOrderNo + 1;
      console.log('[SelfCheckout] Next bill number:', nextBillNo);

      const orderData = {
        order_number: nextBillNo.toString(),
        user_id: 'self-checkout-customer',
        customer_name: 'Self Checkout Customer',
        user_mobile: '',
        address: '',
        subtotal: subTotal,
        total_amount: finalTotal,
        payment_method: paymentMethod,
        payment_status: 'paid',
        order_status: 'completed',
        discount: 0,
        delivery_charge: 0
      };
      console.log('[SelfCheckout] Order data to insert:', orderData);

      const orderRes = await handleERPAction(ERP_MODULES.ORDER_MASTER, ACTION_TYPES.INSERT, orderData);
      console.log('[SelfCheckout] Order insert response:', orderRes);
      if (!orderRes.success) throw new Error(orderRes.error);

      const createdOrder = orderRes.data[0];
      console.log('[SelfCheckout] Created order:', createdOrder);

      for (const item of cart) {
        console.log('[SelfCheckout] Processing order item:', item);
        await handleERPAction(ERP_MODULES.ORDER_ITEMS, ACTION_TYPES.INSERT, {
          order_id: createdOrder.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          rate: item.sale_rate,
          total: item.sale_rate * item.quantity
        });

        const product = products.find(p => p.id === item.id);
        console.log('[SelfCheckout] Found product for stock update:', product);
        if (product) {
          const productStock = product.opstock || product.stock || 0;
          const newStock = productStock - item.quantity;
          console.log('[SelfCheckout] Updating stock:', { productStock, newStock });
          await handleERPAction(ERP_MODULES.ITEM_MASTER, ACTION_TYPES.UPDATE, {
            id: product.id,
            stock: newStock,
            opstock: newStock
          });

          await handleERPAction(DB_SCHEMA.INVENTORY_LOGS.table, ACTION_TYPES.INSERT, {
            id: crypto.randomUUID(),
            product_id: product.id,
            old_stock: productStock,
            new_stock: newStock,
            change_type: 'sale',
            reference_id: createdOrder.order_number
          });
        }
      }

      setLastOrder(createdOrder);
      setCart([]);
      setCurrentStep(3);
      fetchInitialData();
      toast.success('Payment successful! Thank you for shopping!');
    } catch (error) {
      console.error('[SelfCheckout] Payment error:', error);
      toast.error('Payment failed!');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearCart = () => {
    console.log('[SelfCheckout] clearCart called');
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to clear the cart?')) {
      setCart([]);
      toast.success('Cart cleared!');
    }
  };

  const reset = () => {
    setCurrentStep(1);
    setLastOrder(null);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Smartphone size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800">Self Checkout</h1>
            <p className="text-xs md:text-sm text-slate-500 font-bold">Scan items yourself!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentStep !== 1 && (
            <button 
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-slate-700 hover:bg-slate-100 transition-all font-bold text-xs"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center w-10 h-10 bg-white rounded-xl text-slate-700 hover:bg-slate-100 transition-all shadow-sm"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      {currentStep === 1 && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ShoppingBag className="text-indigo-600" size={24} />
                <h2 className="text-lg font-black text-slate-800">Your Cart</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                  {cart.length} items
                </span>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold hover:bg-red-200 transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto flex-1 max-h-96">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                  <ShoppingCart size={64} strokeWidth={1} />
                  <p className="font-black text-sm">Cart is empty</p>
                  <p className="text-xs">Start by scanning a product</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <motion.div
                    key={`${item.id}-${idx}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-slate-800">{item.name}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded-full text-slate-700 font-black hover:bg-slate-100 transition-all"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-black text-slate-800">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 rounded-full text-slate-700 font-black hover:bg-slate-100 transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-slate-500 font-bold">₹{item.sale_rate.toLocaleString()} each</p>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-800 text-lg">₹{(item.sale_rate * item.quantity).toLocaleString()}</p>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-full"
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

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6">
              <h3 className="font-black text-slate-800 mb-4">Scan Products</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={showBarcodeInput}
                  onChange={(e) => setShowBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="Enter barcode"
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-bold text-slate-800"
                  autoFocus
                />
                <button
                  onClick={() => setShowScanner(true)}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold flex items-center gap-2"
                >
                  <Camera size={18} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{subTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-600">
                  <span>Tax ({appConfig?.tax_rate || 5}%)</span>
                  <span>₹{tax.toLocaleString()}</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex justify-between text-xl font-black text-slate-800">
                  <span>Total</span>
                  <span className="text-indigo-600">₹{finalTotal.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={cart.length === 0 || isProcessing}
                className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black text-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow-lg mb-4">
              <IndianRupee size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Complete Payment</h2>
            <p className="text-slate-500 text-sm font-bold">Total: ₹{finalTotal.toLocaleString()}</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 mb-8">
            {['UPI', 'Cash', 'Card'].map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={cn(
                  "p-6 rounded-2xl border-2 text-left font-black transition-all hover:shadow-md",
                  paymentMethod === method
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-center gap-3">
                  {method === 'UPI' && <QrCode size={24} />}
                  {method === 'Cash' && <IndianRupee size={24} />}
                  {method === 'Card' && <ShoppingCart size={24} />}
                  <div>
                    <p className="font-black text-lg">{method}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {paymentMethod === 'UPI' && (
            <div className="bg-slate-50 rounded-2xl p-8 text-center">
              <QrCode size={64} className="mx-auto text-slate-400 mb-4" />
              <p className="font-bold text-slate-600 mb-2">Scan to Pay</p>
              <p className="text-xs text-slate-400">₹{finalTotal.toLocaleString()}</p>
            </div>
          )}
          
          <button
            onClick={completePayment}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-2xl font-black text-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Completing...' : 'Pay Now'}
          </button>
        </div>
      )}

      {currentStep === 3 && (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-10 text-center"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center text-white shadow-2xl mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-3">Thank You!</h2>
            <p className="text-slate-500 font-bold mb-8">Your payment was successful</p>
            {lastOrder && (
              <div className="bg-slate-50 rounded-2xl p-6 mb-8">
                <p className="text-xs font-black text-slate-600">Order #</p>
                <p className="text-2xl font-black text-slate-800">{lastOrder.order_number}</p>
              </div>
            )}
            <button
              onClick={reset}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black text-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              Start New Order
            </button>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-black text-slate-800">Scan Product</h3>
                <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
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
