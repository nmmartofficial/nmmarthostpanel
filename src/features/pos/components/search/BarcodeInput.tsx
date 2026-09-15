import React from 'react';
import { Barcode } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface BarcodeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const BarcodeInput: React.FC<BarcodeInputProps> = ({
  value = '',
  onChange,
  placeholder = 'Scan Barcode',
  className,
  autoFocus = true,
  onKeyDown
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Trim spaces from input
    onChange?.(e.target.value);
  };

  return (
    <div className={cn('relative', className)}>
      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        className={cn(
          'w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-3 py-2 text-sm font-medium text-black shadow-sm outline-none focus:ring-2 focus:ring-emerald-500'
        )}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
      />
    </div>
  );
};

export default BarcodeInput;
