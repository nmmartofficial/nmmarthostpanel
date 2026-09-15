import React from 'react';
import { cn } from '../../../../utils/helpers';
import ProductCard from './ProductCard';
import ProductHoverState from './ProductHoverState';
import ProductSelectionOverlay from './ProductSelectionOverlay';

// Mock Constants ONLY - No Logic
const MOCK_SELECTED_INDEX = 2;
const MOCK_FOCUSED_INDEX = 5;

interface ProductSelectionContainerProps {
  className?: string;
}

const ProductSelectionContainer: React.FC<ProductSelectionContainerProps> = ({ 
  className 
}) => {
  return (
    <div className={cn(
      "grid gap-3 overflow-y-auto p-3",
      "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
      className
    )}>
      {Array.from({ length: 10 }).map((_, idx) => (
        <ProductHoverState key={idx}>
          <ProductSelectionOverlay
            isSelected={idx === MOCK_SELECTED_INDEX}
            isFocused={idx === MOCK_FOCUSED_INDEX}
            isDisabled={idx === 7}
          >
            <ProductCard
              isSelected={idx === MOCK_SELECTED_INDEX}
              isFocused={idx === MOCK_FOCUSED_INDEX}
              isDisabled={idx === 7}
              onClick={() => {}} // Placeholder
            />
          </ProductSelectionOverlay>
        </ProductHoverState>
      ))}
    </div>
  );
};

export default ProductSelectionContainer;