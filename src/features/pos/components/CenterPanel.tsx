import React from 'react';
import { cn } from '../../../utils/helpers';
import SearchContainer from './search/SearchContainer';
import ProductGridContainer from './products/ProductGridContainer';

interface CenterPanelProps {
  className?: string;
}

const CenterPanel: React.FC<CenterPanelProps> = ({ className }) => {
  return (
    <section className={cn(
      'flex-1 flex flex-col min-w-0 bg-neutral-50',
      className
    )}>
      <SearchContainer />
      <ProductGridContainer />
    </section>
  );
};

export default CenterPanel;
