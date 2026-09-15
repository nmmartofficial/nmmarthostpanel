import React from 'react';
import { Package } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface EmptyStateProps {
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ className }) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-10 text-center",
      className
    )}>
      <div className="bg-slate-100 rounded-full p-6 mb-4">
        <Package size={48} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-black text-slate-900">No Products Found</h3>
      <p className="mt-2 text-sm text-slate-500">Try adjusting your filters or search terms.</p>
    </div>
  );
};

export default EmptyState;
