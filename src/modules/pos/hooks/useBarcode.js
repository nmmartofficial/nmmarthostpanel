import { useState, useEffect, useCallback } from 'react';

export const useBarcode = ({ onScan }) => {
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastKeyTime, setLastKeyTime] = useState(0);

  const BARCODE_TIMEOUT = 100; // ms between keystrokes
  const MIN_BARCODE_LENGTH = 4;

  useEffect(() => {
    let timeoutId;

    const handleKeyDown = (e) => {
      const now = Date.now();

      if (e.key === 'Enter' && barcode.length >= MIN_BARCODE_LENGTH) {
        e.preventDefault();
        if (onScan) {
          onScan(barcode);
        }
        setBarcode('');
        setIsScanning(false);
        return;
      }

      if (e.key.length === 1) { // Character key
        if (now - lastKeyTime > BARCODE_TIMEOUT) {
          setBarcode(e.key);
        } else {
          setBarcode(prev => prev + e.key);
        }
        setIsScanning(true);
        setLastKeyTime(now);
      }

      // Reset after timeout
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (barcode.length < MIN_BARCODE_LENGTH) {
          setBarcode('');
          setIsScanning(false);
        }
      }, BARCODE_TIMEOUT);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, [barcode, lastKeyTime, onScan]);

  const manualScan = useCallback((code) => {
    if (onScan && code) {
      onScan(code);
    }
  }, [onScan]);

  return {
    barcode,
    isScanning,
    manualScan
  };
};
