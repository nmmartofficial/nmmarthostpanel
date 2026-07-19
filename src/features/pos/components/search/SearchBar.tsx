import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search Product Name / SKU / Barcode',
  className
}) => {
  return (
    <div className={cn('relative flex-1', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          'w-full bg-white border border-neutral-200 rounded-lg pl-10 pr-10 py-2 text-sm font-medium text-black shadow-sm outline-none focus:ring-2 focus:ring-blue-500'
        )}
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
