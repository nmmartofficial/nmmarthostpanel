import React, { memo } from 'react';
import { cn } from '../utils/helpers';
import { usePOS } from '../context';

const BarcodeInput = memo(({
  placeholder = "Scan Barcode..."
}) => {
  const {
    barcodeInputRef: inputRef,
    handleBarcodeScan: onKeyDown,
    scanStatus,
    isTouchMode
  } = usePOS();

  return (
    <div className="relative group">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className={cn(
          "border rounded font-black text-black shadow-sm outline-none transition-all",
          scanStatus.type === 'success' ? "bg-emerald-50 border-emerald-500" :
          scanStatus.type === 'error' ? "bg-red-50 border-red-500" :
          "bg-white border-neutral-200",
          isTouchMode ? "w-64 px-5 py-3 text-sm" : "w-48 px-3 py-1.5 text-xs"
        )}
        onKeyDown={onKeyDown}
        autoFocus
      />
      {scanStatus.message && (
        <div className={cn(
          "absolute -bottom-5 left-0 right-0 text-center font-black uppercase",
          isTouchMode ? "text-[10px]" : "text-[8px]",
          scanStatus.type === 'success' ? "text-emerald-600" : "text-red-600"
        )}>
          {scanStatus.message}
        </div>
      )}
    </div>
  );
});

export default BarcodeInput;
