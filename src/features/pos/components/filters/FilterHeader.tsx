import React from 'react';
import { Filter } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface FilterHeaderProps {
  className?: string;
  title?: string;
}

const FilterHeader: React.FC<FilterHeaderProps> = ({ 
  className, 
  title = "Filters" 
}) => {
  return (
    <div className={cn("flex items-center gap-2 mb-4", className)}>
      <Filter className="text-primary-600" size={20} />
      <h3 className="text-lg font-black text-slate-800">{title}</h3>
    </div>
  );
};

export default FilterHeader;