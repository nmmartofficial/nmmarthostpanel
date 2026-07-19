/**
 * Temporary Payment Dialog for Cash Payment
 * Phase 4 - Step 3
 * Display only - no styling changes outside Payment UI
 */

import React from 'react';
import { usePayment } from '../../payment';

const PaymentDialog = ({ payableAmount = 0 }) => {
  const {
    cashAmount,
    remainingAmount,
    changeAmount,
    paymentState,
    setCashAmount,
    processCashPayment,
    clearCashPayment
  } = usePayment();

  const handlePay = () => {
    processCashPayment();
  };

  const handleClear = () => {
    clearCashPayment();
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Cash Payment</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label>Payable Amount: </label>
        <span>₹{payableAmount.toFixed(2)}</span>
      </div>

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

      <div style={{ marginBottom: '15px' }}>
        <label>Payment Status: </label>
        <span>{paymentState.paymentStatus}</span>
      </div>

      {paymentState.error && (
        <div style={{ marginBottom: '15px', color: 'red' }}>
          <label>Error: </label>
          <span>{paymentState.error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handlePay}
          disabled={paymentState.loading}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          {paymentState.loading ? 'Processing...' : 'Pay'}
        </button>
        <button
          onClick={handleClear}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default PaymentDialog;
