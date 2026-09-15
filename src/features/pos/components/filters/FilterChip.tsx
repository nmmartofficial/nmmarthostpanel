import React from 'react';
import { cn } from '../../../../utils/helpers';

interface FilterChipProps {
  className?: string;
  label: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ 
  className, 
  label, 
  isActive = false, 
  isDisabled = false, 
  onClick 
}) => {
  return (
    <button
      onClick={!isDisabled ? onClick : undefined}
      disabled={isDisabled}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-black uppercase transition-all duration-200",
        isActive 
          ? "bg-primary-600 text-white shadow-md" 
          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
        isDisabled 
          ? "bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed opacity-50" 
          : "",
        className
      )}
    >
      {label}
    </button>
  );
};

export default FilterChip;