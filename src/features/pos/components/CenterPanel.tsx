import React from 'react';
import { cn } from '../../../utils/helpers';
import CustomerPanel from '../../../components/CustomerPanel';
import CartPanel from '../../../components/CartPanel';
import { usePOS } from '../../../context';

interface CenterPanelProps {
  className?: string;
}

const CenterPanel: React.FC<CenterPanelProps> = ({ className }) => {
  const { posLayoutSettings } = usePOS();
  return (
    <section className={cn(
      'flex flex-1 flex-col min-w-0 overflow-hidden border-r border-slate-200 bg-slate-50',
      className
    )}>
      {posLayoutSettings?.showCustomerSection && (
        <div className="shrink-0 border-b border-slate-200 bg-white">
          <CustomerPanel compact />
        </div>
      )}
      <CartPanel />
    </section>
  );
};

export default CenterPanel;
