import React from 'react';
import { cn } from '../../../utils/helpers';
import CartPanel from './CartPanel.tsx';

interface RightSidebarProps {
  className?: string;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ className }) => {
  return (
    <aside className={cn(
      'bg-white flex flex-col border-l border-neutral-200 shadow-xl',
      'w-80 md:w-96', // 25-30% width as per Phase 1 requirements
      className
    )}>
      <div className="flex-1 overflow-hidden">
        <CartPanel />
      </div>
      <div className="p-4 border-t border-neutral-200">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-lg">Total</span>
          <span className="font-bold text-xl text-primary-600">₹0.00</span>
        </div>
        <button className="w-full bg-primary-600 text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition-colors">
          Pay Now
        </button>
      </div>
    </aside>
  );
};

export default RightSidebar;
