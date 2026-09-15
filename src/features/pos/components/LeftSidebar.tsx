import React from 'react';
import { cn } from '../../../utils/helpers';

interface LeftSidebarProps {
  className?: string;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ className }) => {
  return (
    <aside className={cn(
      'bg-white flex flex-col border-r border-neutral-200 transition-all duration-300',
      'w-64 md:w-64', // 20-25% width as per Phase 1 requirements
      className
    )}>
      <div className="p-4 border-b border-neutral-100">
        <h2 className="font-bold text-lg text-neutral-800">Categories</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {/* Placeholder categories */}
        <div className="space-y-2">
          {['All Items', 'Groceries', 'Electronics', 'Clothing', 'Household'].map((cat, idx) => (
            <button
              key={idx}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
