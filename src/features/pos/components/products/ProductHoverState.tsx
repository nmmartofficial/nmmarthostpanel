import React from 'react';
import { cn } from '../../../../utils/helpers';

interface ProductHoverStateProps {
  className?: string;
  children: React.ReactNode;
}

const ProductHoverState: React.FC<ProductHoverStateProps> = ({ 
  className, 
  children 
}) => {
  return (
    <div className={cn(
      "relative group transition-all duration-200",
      className
    )}>
      {children}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary-300 rounded-xl pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100" />
    </div>
  );
};

export default ProductHoverState;