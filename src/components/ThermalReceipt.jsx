import React from 'react';
import { formatReceiptHeader, formatInvoiceNo, formatDate, formatTime } from '../utils/pos';

export default function ThermalReceipt({ orderData, cart, subTotal, discountAmount, deliveryChargeAmount, finalTotal, roundOff, appConfig }) {
  const dateObj = new Date();
  const date = formatDate(dateObj);
  const time = formatTime(dateObj);
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Dynamic Tax Calculation (Assuming 5% GST total)
  const taxRate = parseFloat(appConfig?.tax_rate || 5); // Default 5%
  const totalTax = (finalTotal * (taxRate / 105) * 5); // Assuming inclusive tax
  const cgst = (totalTax / 2).toFixed(2);
  const sgst = (totalTax / 2).toFixed(2);

  return (
    <div className="bg-white p-2 w-[76mm] mx-auto text-black font-mono text-[10px] print-receipt">
      {/* Header */}
      <div className="text-center mb-1">
        <h2 className="text-[16px] font-black uppercase leading-none mb-1">{formatReceiptHeader(appConfig?.shop_name || 'NM MART')}</h2>
        <div className="text-[9px] font-bold leading-tight">
          <p>{appConfig?.address || 'Manjhanpur Kaushambi, UP'}</p>
          <p>Mob: {appConfig?.mobile || '7081154604'}</p>
          {appConfig?.gst_no && <p>GSTIN: {appConfig.gst_no}</p>}
        </div>
      </div>

      <div className="border-t border-dashed border-black my-1"></div>

      {/* Bill Info */}
      <div className="space-y-0.5 text-[10px] font-black uppercase">
        <div className="flex justify-between">
          <span>BILL No: #{formatInvoiceNo(orderData?.order_number || 0)}</span>
          <span>{date}</span>
        </div>
        <div className="flex justify-between">
          <span>Customer: {orderData?.customer_name || 'Walk-in'}</span>
          <span>{time}</span>
        </div>
      </div>

      <div className="border-t border-black my-1"></div>

      {/* Items Table */}
      <div className="mb-1">
        <div className="flex font-black border-b border-black pb-0.5 uppercase text-[9px]">
          <span className="flex-1">ITEM</span>
          <span className="w-8 text-right">QTY</span>
          <span className="w-12 text-right">RATE</span>
          <span className="w-12 text-right">AMT</span>
        </div>
        <div className="space-y-0.5 py-1">
          {cart.map((item, idx) => (
            <div key={idx} className="flex font-bold leading-tight text-[9px]">
              <span className="flex-1 uppercase truncate">{item.name}</span>
              <span className="w-8 text-right">{item.quantity}</span>
              <span className="w-12 text-right">{item.sale_rate}</span>
              <span className="w-12 text-right">{(item.sale_rate * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-black my-1"></div>

      {/* Summary Section */}
      <div className="space-y-0.5 font-black uppercase text-[10px]">
        <div className="flex justify-between">
          <span>Total Items: {cart.length}</span>
          <span>Qty: {totalItems}</span>
        </div>
        <div className="flex justify-between text-[12px] border-y border-black py-0.5 my-0.5">
          <span>NET AMOUNT</span>
          <span>₹{finalTotal}</span>
        </div>
        <div className="flex justify-between text-[9px] font-bold">
          <span>CGST (2.5%)</span>
          <span>{cgst}</span>
        </div>
        <div className="flex justify-between text-[9px] font-bold">
          <span>SGST (2.5%)</span>
          <span>{sgst}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-[9px] font-bold text-red-600">
            <span>DISCOUNT</span>
            <span>-{discountAmount.toFixed(0)}</span>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-black mt-2 mb-1"></div>

      {/* Payment Details */}
      <div className="flex justify-between font-black uppercase text-[10px]">
        <span>PAY MODE:</span>
        <span>{orderData?.payment_method || 'CASH'}</span>
      </div>

      {/* Footer */}
      <div className="mt-3 text-center space-y-0.5 border-t border-black pt-1">
        <p className="font-black text-[10px]">THANK YOU! VISIT AGAIN</p>
        <p className="text-[8px] italic">Software by: NM MART Tech</p>
      </div>

      {/* Auto-cut Space */}
      <div className="print-footer-cut"></div>
    </div>
  );
}
