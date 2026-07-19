/**
 * Temporary Payment Dialog for Cash and UPI Payment
 * Phase 4 - Step 4
 * Display only - no styling changes outside Payment UI
 */

import React, { useState } from 'react';
import { usePayment } from '../../payment';

const PaymentDialog = ({ payableAmount = 0 }) => {
  const {
    cashAmount,
    remainingAmount,
    changeAmount,
    paymentState,
    setCashAmount,
    processCashPayment,
    clearCashPayment,
    upiId,
    upiTransactionId,
    upiStatus,
    setUPIId,
    processUPIPayment,
    clearUPIPayment
  } = usePayment();

  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const handleCashPay = () => {
    processCashPayment();
  };

  const handleCashClear = () => {
    clearCashPayment();
  };

  const handleUPIPay = () => {
    processUPIPayment();
  };

  const handleUPIClear = () => {
    clearUPIPayment();
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Payment</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label>Payable Amount: </label>
        <span>₹{payableAmount.toFixed(2)}</span>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>Payment Method: </label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
        </select>
      </div>

      {paymentMethod === 'CASH' && (
        <div>
          <h4>Cash Payment</h4>
          
          <div style={{ marginBottom: '15px' }}>
            <label>Cash Amount: </label>
            <input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Remaining Amount: </label>
            <span>₹{remainingAmount.toFixed(2)}</span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Change Amount: </label>
            <span>₹{changeAmount.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCashPay}
              disabled={paymentState.loading}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              {paymentState.loading ? 'Processing...' : 'Pay Cash'}
            </button>
            <button
              onClick={handleCashClear}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              Clear Cash
            </button>
          </div>
        </div>
      )}

      {paymentMethod === 'UPI' && (
        <div>
          <h4>UPI Payment</h4>
          
          <div style={{ marginBottom: '15px' }}>
            <label>UPI ID: </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUPIId(e.target.value)}
              placeholder="user@upi"
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>

          {upiTransactionId && (
            <div style={{ marginBottom: '15px' }}>
              <label>Transaction ID: </label>
              <span>{upiTransactionId}</span>
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label>UPI Status: </label>
            <span>{upiStatus}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleUPIPay}
              disabled={paymentState.loading}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              {paymentState.loading ? 'Processing...' : 'Pay UPI'}
            </button>
            <button
              onClick={handleUPIClear}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              Clear UPI
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '15px', marginBottom: '15px' }}>
        <label>Payment Status: </label>
        <span>{paymentState.paymentStatus}</span>
      </div>

      {paymentState.error && (
        <div style={{ marginBottom: '15px', color: 'red' }}>
          <label>Error: </label>
          <span>{paymentState.error}</span>
        </div>
      )}
    </div>
  );
};

export default PaymentDialog;
