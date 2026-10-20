import React from 'react';
import { formatReceiptHeader, formatInvoiceNo, formatDate, formatTime } from '../utils/pos';

const formatAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '—';
};

export default function ThermalReceipt({ orderData, appConfig }) {
  if (!orderData) return null;

  const items = orderData.items || [];
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const timestamp = new Date(orderData.created_at);
  const validTimestamp = Number.isFinite(timestamp.getTime());
  const storeName = appConfig?.shop_name || appConfig?.store_name || 'NM MART';
  const gstAmount = orderData.total_gst;
  const discount = orderData.discount;
  const deliveryCharge = orderData.delivery_charge;
  const roundOff = orderData.round_off;

  return (
    <div className="bg-white p-2 w-[76mm] mx-auto text-black font-mono text-[10px] print-receipt">
      <div className="text-center mb-1">
        <h2 className="text-[16px] font-black uppercase leading-none mb-1">{formatReceiptHeader(storeName)}</h2>
        <div className="text-[9px] font-bold leading-tight">
          {appConfig?.address && <p>{appConfig.address}</p>}
          {(appConfig?.mobile || appConfig?.phone) && <p>Mob: {appConfig.mobile || appConfig.phone}</p>}
          {appConfig?.gst_no && <p>GSTIN: {appConfig.gst_no}</p>}
        </div>
      </div>

      <div className="border-t border-dashed border-black my-1" />
      <div className="space-y-0.5 text-[10px] font-black uppercase">
        <div className="flex justify-between">
          <span>Invoice: #{formatInvoiceNo(orderData.order_number)}</span>
          <span>{validTimestamp ? formatDate(timestamp) : 'Date unavailable'}</span>
        </div>
        <div className="flex justify-between">
          <span>Customer: {orderData.customer_name || 'Walk-in Customer'}</span>
          <span>{validTimestamp ? formatTime(timestamp) : ''}</span>
        </div>
        {orderData.user_mobile && <p>Mobile: {orderData.user_mobile}</p>}
      </div>

      <div className="border-t border-black my-1" />
      <div className="mb-1">
        <div className="flex font-black border-b border-black pb-0.5 uppercase text-[9px]">
          <span className="flex-1">Item</span>
          <span className="w-8 text-right">Qty</span>
          <span className="w-14 text-right">Rate</span>
          <span className="w-14 text-right">Amount</span>
        </div>
        <div className="space-y-1 py-1">
          {items.map((item) => (
            <div key={item.id} className="font-bold leading-tight text-[9px]">
              <div className="flex">
                <span className="flex-1 uppercase break-words">{item.name || 'Item'}</span>
                <span className="w-8 text-right">{item.quantity}</span>
                <span className="w-14 text-right">{formatAmount(item.rate)}</span>
                <span className="w-14 text-right">{formatAmount(item.total)}</span>
              </div>
              {(Number(item.discount_amount) > 0 || item.gst_amount != null) && (
                <div className="pl-1 text-[8px] font-medium">
                  {Number(item.discount_amount) > 0 && <span>Discount: -₹{formatAmount(item.discount_amount)} </span>}
                  {item.gst_amount != null && <span>GST {item.gst_percent ?? '—'}% (included): ₹{formatAmount(item.gst_amount)}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-black my-1" />
      <div className="space-y-0.5 font-black uppercase text-[9px]">
        <div className="flex justify-between">
          <span>Items: {items.length}</span>
          <span>Qty: {totalQuantity}</span>
        </div>
        <div className="flex justify-between"><span>Subtotal</span><span>₹{formatAmount(orderData.subtotal)}</span></div>
        {Number(discount) > 0 && (
          <div className="flex justify-between text-red-600"><span>Total discounts</span><span>-₹{formatAmount(discount)}</span></div>
        )}
        {deliveryCharge != null && Number(deliveryCharge) !== 0 && (
          <div className="flex justify-between"><span>Delivery</span><span>₹{formatAmount(deliveryCharge)}</span></div>
        )}
        {gstAmount != null && <div className="flex justify-between"><span>Total GST (included)</span><span>₹{formatAmount(gstAmount)}</span></div>}
        {Number(roundOff) !== 0 && <div className="flex justify-between italic"><span>Round off</span><span>₹{formatAmount(roundOff)}</span></div>}
        <div className="flex justify-between text-[12px] border-y border-black py-0.5 my-0.5">
          <span>Net payable</span>
          <span>₹{formatAmount(orderData.total_amount)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black mt-2 mb-1" />
      <div className="flex justify-between font-black uppercase text-[10px]">
        <span>Pay mode:</span>
        <span>{orderData.payment_method || 'Unavailable'}</span>
      </div>
      <div className="flex justify-between font-bold uppercase text-[9px]">
        <span>Payment status:</span>
        <span>{orderData.payment_status || 'Unavailable'}</span>
      </div>
      <div className="mt-3 text-center space-y-0.5 border-t border-black pt-1">
        <p className="font-black text-[10px]">THANK YOU! VISIT AGAIN</p>
      </div>
      <div className="print-footer-cut" />
    </div>
  );
}
