import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../../utils/helpers';

interface ProductSelectionOverlayProps {
  className?: string;
  isSelected?: boolean;
  isFocused?: boolean;
  isDisabled?: boolean;
  children: React.ReactNode;
}

const ProductSelectionOverlay: React.FC<ProductSelectionOverlayProps> = ({ 
  className, 
  isSelected = false, 
  isFocused = false, 
  isDisabled = false,
  children 
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}

      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute top-2 left-2 bg-primary-600 text-white rounded-full p-1.5 shadow-lg z-10">
          <Check size={14} />
        </div>
      )}

      {/* Focus Ring */}
      {isFocused && (
        <div className="absolute inset-0 ring-4 ring-primary-200 rounded-xl z-5 pointer-events-none" />
      )}

      {/* Disabled Overlay */}
      {isDisabled && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
          <span className="bg-red-600 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase">Unavailable</span>
        </div>
      )}
    </div>
  );
};

export default ProductSelectionOverlay;