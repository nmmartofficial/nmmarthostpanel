import React, { useState } from 'react';
import { useCart } from '../cart/hooks/useCart';
import { calculateLineTotal } from '../cart/utils/cart.utils';

const CartPanel: React.FC = () => {
  const { items, cart, increaseQty, decreaseQty, updateQty, setDiscount, clearDiscount, setGSTRate, setGSTMode, clearGST, removeItem, clearCart } = useCart();
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [gstMode, setGSTModeState] = useState<'cgst_sgst' | 'igst'>('cgst_sgst');
  const [gstRate, setGSTRateState] = useState('');

  const handleSetDiscount = () => {
    const value = parseFloat(discountValue);
    if (!isNaN(value)) {
      setDiscount(discountType, value);
    }
  };

  const handleSetGST = () => {
    const rate = parseFloat(gstRate);
    if (!isNaN(rate)) {
      setGSTMode(gstMode);
      setGSTRate(rate);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">Cart</h2>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Total Items: {cart.totalItems}</span>
          <span>Total Qty: {cart.totalQty}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            Cart is empty
          </div>
        ) : (
          items.map(item => (
            <div 
              key={item.product.id}
              className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="font-semibold text-slate-800 text-sm truncate">
                    {item.product.productName}
                  </div>
                  <div className="text-xs text-slate-500">
                    Unit: ₹{(item.product.price || 0).toFixed(2)}
                  </div>
                </div>
                <div className="text-sm font-bold text-primary-600">
                  ₹{calculateLineTotal(item).toFixed(2)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decreaseQty(item.product.id)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-md text-slate-700 font-bold transition-colors"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQty(item.product.id, parseInt(e.target.value) || 1)}
                    className="w-14 h-8 text-center border border-slate-300 rounded-md text-sm font-medium text-slate-700"
                    min={1}
                  />

                  <button
                    onClick={() => increaseQty(item.product.id)}
                    className="w-8 h-8 flex items-center justify-center bg-primary-100 hover:bg-primary-200 rounded-md text-primary-700 font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.product.id)}
                  className="w-8 h-8 flex items-center justify-center bg-red-100 hover:bg-red-200 rounded-md text-red-700 font-bold transition-colors"
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}

        {/* Discount Controls */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
          <h3 className="font-semibold text-sm text-slate-700">Discount</h3>
          <div className="flex gap-2">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (₹)</option>
            </select>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="Value"
              className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSetDiscount}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
            >
              Apply Discount
            </button>
            <button
              onClick={clearDiscount}
              className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300"
            >
              Clear
            </button>
          </div>

          {/* Discount Info */}
          {cart.discountType && cart.discountValue !== null && (
            <div className="text-sm text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Discount Type:</span>
                <span className="font-medium">{cart.discountType === 'percentage' ? 'Percentage' : 'Fixed'}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount Value:</span>
                <span className="font-medium">
                  {cart.discountType === 'percentage' ? `${cart.discountValue}%` : `₹${cart.discountValue.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount Amount:</span>
                <span className="font-medium">-₹{cart.discount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* GST Controls */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
          <h3 className="font-semibold text-sm text-slate-700">GST</h3>
          <div className="flex gap-2">
            <select
              value={gstMode}
              onChange={(e) => setGSTModeState(e.target.value as 'cgst_sgst' | 'igst')}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md"
            >
              <option value="cgst_sgst">CGST + SGST</option>
              <option value="igst">IGST</option>
            </select>
            <select
              value={gstRate}
              onChange={(e) => setGSTRateState(e.target.value)}
              className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-md"
            >
              <option value="">Rate</option>
              <option value="0">0%</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSetGST}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
            >
              Apply GST
            </button>
            <button
              onClick={clearGST}
              className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300"
            >
              Clear
            </button>
          </div>

          {/* GST Info */}
          {cart.gstMode && cart.gstRate !== null && (
            <div className="text-sm text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>GST Mode:</span>
                <span className="font-medium">{cart.gstMode === 'cgst_sgst' ? 'CGST + SGST' : 'IGST'}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Rate:</span>
                <span className="font-medium">{cart.gstRate}%</span>
              </div>
              {cart.gstMode === 'cgst_sgst' && (
                <>
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span className="font-medium">₹{cart.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span className="font-medium">₹{cart.sgst.toFixed(2)}</span>
                  </div>
                </>
              )}
              {cart.gstMode === 'igst' && (
                <div className="flex justify-between">
                  <span>IGST:</span>
                  <span className="font-medium">₹{cart.igst.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-blue-600">
                <span>Total GST:</span>
                <span className="font-medium">₹{cart.tax.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-slate-200 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-600">Subtotal</span>
          <span className="text-sm font-bold text-slate-800">₹{cart.subtotal.toFixed(2)}</span>
        </div>
        {cart.discount > 0 && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-600">Discount</span>
              <span className="text-sm font-bold text-green-600">-₹{cart.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-600">Subtotal After Discount</span>
              <span className="text-sm font-bold text-slate-800">₹{cart.subtotalAfterDiscount.toFixed(2)}</span>
            </div>
          </>
        )}
        {cart.tax > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-600">Total GST</span>
            <span className="text-sm font-bold text-blue-600">₹{cart.tax.toFixed(2)}</span>
          </div>
        )}
        {cart.roundOff !== 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-600">Round Off</span>
            <span className={`text-sm font-bold ${cart.roundOff >= 0 ? 'text-yellow-600' : 'text-orange-600'}`}>
              {cart.roundOff >= 0 ? '+' : ''}₹{cart.roundOff.toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
          <span className="text-lg font-semibold text-slate-800">Grand Total</span>
          <span className="text-lg font-bold text-primary-700">₹{cart.grandTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-md font-semibold text-slate-700">Payable Amount</span>
          <span className="text-md font-bold text-primary-800">₹{cart.payableAmount.toFixed(2)}</span>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors mt-2"
          >
            Clear Cart
          </button>
        )}
      </div>
    </div>
  );
};

export default CartPanel;
