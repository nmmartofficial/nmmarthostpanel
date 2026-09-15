import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface FilterSearchProps {
  className?: string;
  placeholder?: string;
}

const FilterSearch: React.FC<FilterSearchProps> = ({ 
  className, 
  placeholder = "Search Category or Brand" 
}) => {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
        autoComplete="off"
      />
    </div>
  );
};

export default FilterSearch;