import React from 'react';
import { cn } from '../../../../utils/helpers';
import { Skeleton } from '../../../../components/Skeleton';

interface LoadingGridProps {
  className?: string;
}

const LoadingGrid: React.FC<LoadingGridProps> = ({ className }) => {
  return (
    <div className={cn(
      "grid gap-3 overflow-y-auto p-3",
      "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
      className
    )}>
      {Array.from({ length: 10 }).map((_, idx) => (
        <div key={idx} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col gap-3">
          <Skeleton className="w-full aspect-square rounded-lg" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-3/4 h-3" />
          <Skeleton className="w-1/2 h-3" />
        </div>
      ))}
    </div>
  );
};

export default LoadingGrid;
