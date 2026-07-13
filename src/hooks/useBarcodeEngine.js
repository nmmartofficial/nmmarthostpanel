import { useState, useRef, useCallback, useEffect } from 'react';
import { normalizeBarcode } from '../utils/pos';

export const useBarcodeEngine = ({
  barcodeMap,
  addToCart,
  addSessionActivity,
  addHardwareLog
}) => {
  const [scanStatus, setScanStatus] = useState({ type: 'idle', message: '' });
  const scanFeedbackTimerRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const processingScan = useRef(false);
  const scanQueue = useRef([]);

  const triggerScanFeedback = useCallback((type, message = '') => {
    if (scanFeedbackTimerRef.current) clearTimeout(scanFeedbackTimerRef.current);
    setScanStatus({ type, message });
    scanFeedbackTimerRef.current = setTimeout(() => setScanStatus({ type: 'idle', message: '' }), 1500);
  }, []);

  const processScanCode = useCallback(async (rawCode) => {
    const code = normalizeBarcode(rawCode);
    if (!code) return;

    processingScan.current = true;
    try {
      const product = barcodeMap.get(code);
      if (product) {
        addToCart(product);
        triggerScanFeedback('success');
        addHardwareLog?.('Barcode Read Successful', 'Barcode Scanner', 'success');
      } else {
        addSessionActivity?.('Scan Failed', `Barcode: ${code}`, 'Inventory Alerts', 'error');
        addHardwareLog?.(`Unknown Barcode: ${code}`, 'Barcode Scanner', 'warning');
        triggerScanFeedback('error', 'Product Not Found');
      }
    } finally {
      processingScan.current = false;
      if (scanQueue.current.length > 0) {
        const nextCode = scanQueue.current.shift();
        setTimeout(() => processScanCode(nextCode), 10);
      }
    }
  }, [barcodeMap, addToCart, triggerScanFeedback, addSessionActivity, addHardwareLog]);

  const handleBarcodeScan = (e) => {
    if (e.key === 'Enter') {
      const code = e.target.value;
      e.target.value = '';
      if (!code || processingScan.current) {
        if (code) scanQueue.current.push(code);
        return;
      }
      processScanCode(code);
    }
  };

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  return {
    scanStatus,
    barcodeInputRef,
    handleBarcodeScan,
    triggerScanFeedback,
    scanQueue
  };
};
