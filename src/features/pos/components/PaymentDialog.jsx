/**
 * Temporary Payment Dialog for Cash and UPI Payment
 * Phase 4 - Step 4
 * Display only - no styling changes outside Payment UI
 */

import React, { useState, useEffect } from 'react';
import { usePayment } from '../payment';

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
    clearUPIPayment,
    cardNumber,
    cardHolderName,
    expiryDate,
    cvv,
    cardType,
    cardTransactionId,
    cardStatus,
    setCardDetails,
    processCardPayment,
    clearCardPayment,
    splitPayments,
    splitStatus,
    splitTransactionIds,
    setSplitPayments,
    processSplitPayment,
    clearSplitPayment,
    creditCustomerId,
    creditCustomerName,
    creditReference,
    creditStatus,
    setCreditCustomer,
    processCreditPayment,
    clearCreditPayment,
    changeBreakdown,
    shortageAmount,
    updateChangeSummary,
    clearChangeSummary,
    validationErrors,
    validationStatus,
    runPaymentValidation,
    clearPaymentValidation,
    processPayment,
    resetPayment,
    actions
  } = usePayment();

  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentResult, setPaymentResult] = useState(null);

  useEffect(() => {
    updateChangeSummary();
  }, [paymentState.paidAmount, updateChangeSummary]);

  // Update selectedMethod in payment context when paymentMethod changes
  useEffect(() => {
    actions.setSelectedMethod(paymentMethod);
  }, [paymentMethod, actions]);

  const handleUpdateChangeSummary = () => {
    updateChangeSummary();
  };

  const handleClearChangeSummary = () => {
    clearChangeSummary();
  };

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

  const handleCardPay = () => {
    processCardPayment();
  };

  const handleCardClear = () => {
    clearCardPayment();
  };

  const handleCardInputChange = (e) => {
    const { name, value } = e.target;
    setCardDetails({
      cardNumber,
      cardHolderName,
      expiryDate,
      cvv,
      [name]: value
    });
  };

  const handleSplitPay = () => {
    processSplitPayment();
  };

  const handleSplitClear = () => {
    clearSplitPayment();
  };

  const handleSplitPaymentChange = (index, field, value) => {
    const newSplitPayments = [...splitPayments];
    if (field === 'amount') {
      newSplitPayments[index][field] = parseFloat(value) || 0;
    } else {
      newSplitPayments[index][field] = value;
    }
    setSplitPayments(newSplitPayments);
  };

  const addSplitPayment = () => {
    setSplitPayments([
      ...splitPayments,
      { method: 'CASH', amount: 0, status: 'PENDING' }
    ]);
  };

  const removeSplitPayment = (index) => {
    setSplitPayments(splitPayments.filter((_, i) => i !== index));
  };

  const handleCreditPay = () => {
    processCreditPayment();
  };

  const handleCreditClear = () => {
    clearCreditPayment();
  };

  const handleCreditInputChange = (e) => {
    const { name, value } = e.target;
    setCreditCustomer({
      creditCustomerId,
      creditCustomerName,
      creditReference,
      [name]: value
    });
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
          <option value="CARD">Card</option>
          <option value="SPLIT">Split</option>
          <option value="CREDIT">Credit</option>
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

      {paymentMethod === 'CARD' && (
        <div>
          <h4>Card Payment</h4>
          
          <div style={{ marginBottom: '15px' }}>
            <label>Card Number: </label>
            <input
              type="text"
              name="cardNumber"
              value={cardNumber}
              onChange={handleCardInputChange}
              placeholder="1234 5678 9012 3456"
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Card Holder Name: </label>
            <input
              type="text"
              name="cardHolderName"
              value={cardHolderName}
              onChange={handleCardInputChange}
              placeholder="John Doe"
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Expiry Date: </label>
            <input
              type="text"
              name="expiryDate"
              value={expiryDate}
              onChange={handleCardInputChange}
              placeholder="MM/YY"
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>CVV: </label>
            <input
              type="text"
              name="cvv"
              value={cvv}
              onChange={handleCardInputChange}
              placeholder="123"
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>

          {cardType && (
            <div style={{ marginBottom: '15px' }}>
              <label>Card Type: </label>
              <span>{cardType}</span>
            </div>
          )}

          {cardTransactionId && (
            <div style={{ marginBottom: '15px' }}>
              <label>Transaction ID: </label>
              <span>{cardTransactionId}</span>
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label>Card Status: </label>
            <span>{cardStatus}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCardPay}
              disabled={paymentState.loading}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              {paymentState.loading ? 'Processing...' : 'Pay Card'}
            </button>
            <button
              onClick={handleCardClear}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              Clear Card
            </button>
          </div>
        </div>
      )}

      {paymentMethod === 'SPLIT' && (
        <div>
          <h4>Split Payment</h4>
          
          {splitPayments.map((payment, index) => (
            <div key={index} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
              <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label>Method: </label>
                <select
                  value={payment.method}
                  onChange={(e) => handleSplitPaymentChange(index, 'method', e.target.value)}
                  style={{ padding: '5px' }}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                </select>
                <label>Amount: </label>
                <input
                  type="number"
                  value={payment.amount}
                  onChange={(e) => handleSplitPaymentChange(index, 'amount', e.target.value)}
                  style={{ padding: '5px', width: '100px' }}
                />
                <button
                  onClick={() => removeSplitPayment(index)}
                  style={{ padding: '5px 10px', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
              {payment.status && (
                <div>
                  <label>Status: </label>
                  <span>{payment.status}</span>
                </div>
              )}
            </div>
          ))}

          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={addSplitPayment}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              + Add Payment
            </button>
          </div>

          {splitTransactionIds.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <label>Transaction IDs: </label>
              <span>{splitTransactionIds.join(', ')}</span>
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label>Split Status: </label>
            <span>{splitStatus}</span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Overall Paid Amount: </label>
            <span>₹{paymentState.paidAmount.toFixed(2)}</span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Overall Remaining Amount: </label>
            <span>₹{paymentState.remainingAmount.toFixed(2)}</span>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Overall Status: </label>
            <span>{paymentState.paymentStatus}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSplitPay}
              disabled={paymentState.loading || splitPayments.length === 0}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              {paymentState.loading ? 'Processing...' : 'Process Split Payment'}
            </button>
            <button
              onClick={handleSplitClear}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              Clear Split
            </button>
          </div>
        </div>
      )}

      {paymentMethod === 'CREDIT' && (
        <div>
          <h4>Credit Payment</h4>
          
          <div style={{ marginBottom: '15px' }}>
            <label>Customer ID: </label>
            <input
              type="text"
              name="creditCustomerId"
              value={creditCustomerId}
              onChange={handleCreditInputChange}
              placeholder="Enter customer ID"
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Customer Name: </label>
            <input
              type="text"
              name="creditCustomerName"
              value={creditCustomerName}
              onChange={handleCreditInputChange}
              placeholder="Enter customer name"
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Reference: </label>
            <input
              type="text"
              name="creditReference"
              value={creditReference}
              onChange={handleCreditInputChange}
              placeholder="Enter reference"
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </div>

          {creditStatus && (
            <div style={{ marginBottom: '15px' }}>
              <label>Credit Status: </label>
              <span>{creditStatus}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCreditPay}
              disabled={paymentState.loading}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              {paymentState.loading ? 'Processing...' : 'Process Credit'}
            </button>
            <button
              onClick={handleCreditClear}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              Clear Credit
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

      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h4>Change Return Summary</h4>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Change Amount: </label>
          <span>₹{changeAmount.toFixed(2)}</span>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Shortage Amount: </label>
          <span>₹{shortageAmount.toFixed(2)}</span>
        </div>

        {changeBreakdown.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <label>Denomination Breakdown:</label>
            <ul style={{ margin: '10px 0 0 20px' }}>
              {changeBreakdown.map((item, index) => (
                <li key={index}>
                  ₹{item.denomination} × {item.count} = ₹{item.denomination * item.count}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleUpdateChangeSummary}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Update Change Summary
          </button>
          <button
            onClick={handleClearChangeSummary}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Clear Change Summary
          </button>
        </div>
      </div>

      {/* Validation Section (Phase 4 Step 9 - Temporary Display) */}
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h4>Payment Validation</h4>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Validation Status: </label>
          <span style={{ fontWeight: validationStatus === 'VALID' ? 'bold' : 'normal', color: validationStatus === 'VALID' ? 'green' : validationStatus === 'INVALID' ? 'red' : 'black' }}>
            {validationStatus || 'Not Validated'}
          </span>
        </div>

        {validationErrors.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <label>Validation Errors:</label>
            <ul style={{ margin: '10px 0 0 20px', color: 'red' }}>
              {validationErrors.map((err, index) => (
                <li key={index}><strong>{err.field}:</strong> {err.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              // Update payable amount in context before validation
              actions.setPayableAmount(payableAmount);
              runPaymentValidation();
            }}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Run Validation
          </button>
          <button
            onClick={clearPaymentValidation}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Clear Validation
          </button>
        </div>
      </div>

      {/* Payment Finalization Section (Phase 4 Step 10) */}
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h4>Payment Finalization</h4>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Current Method: </label>
          <span>{paymentState.selectedMethod}</span>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Current Status: </label>
          <span>{paymentState.paymentStatus}</span>
        </div>
        
        {paymentResult && (
          <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
            <h5>Last Payment Result</h5>
            <div><strong>Method:</strong> {paymentResult.method}</div>
            <div><strong>Status:</strong> {paymentResult.status}</div>
            <div><strong>Paid Amount:</strong> ₹{paymentResult.paidAmount.toFixed(2)}</div>
            <div><strong>Remaining Amount:</strong> ₹{paymentResult.remainingAmount.toFixed(2)}</div>
            <div><strong>Change Amount:</strong> ₹{paymentResult.changeAmount.toFixed(2)}</div>
            <div><strong>Transaction ID:</strong> {paymentResult.transactionId || 'N/A'}</div>
            {paymentResult.errors.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <strong>Errors:</strong>
                <ul style={{ marginLeft: '20px', color: 'red' }}>
                  {paymentResult.errors.map((err, idx) => (
                    <li key={idx}><strong>{err.field}:</strong> {err.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              actions.setPayableAmount(payableAmount);
              const result = processPayment();
              setPaymentResult(result);
            }}
            disabled={paymentState.loading}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            {paymentState.loading ? 'Processing...' : 'Process Payment'}
          </button>
          <button
            onClick={() => {
              resetPayment();
              setPaymentResult(null);
            }}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Reset Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDialog;
