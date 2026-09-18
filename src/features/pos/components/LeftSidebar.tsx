import React from 'react';
import { cn } from '../../../utils/helpers';
import { usePOS } from '../../../context';

interface LeftSidebarProps {
  className?: string;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ className }) => {
  const { categories = [], activeCategory = 'All', setActiveCategory } = usePOS();
  const realCategories = (Array.isArray(categories) ? categories : [])
    .map((category: any) => ({
      id: category?.id,
      label: category?.name || category?.category_name || category?.catname || ''
    }))
    .filter((category) => category.id != null && category.label);

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
        <div className="space-y-2">
          <button
            type="button"
            className={cn(
              'w-full text-left px-4 py-2 rounded-lg hover:bg-neutral-100 transition-colors',
              activeCategory === 'All' && 'bg-neutral-100 font-semibold'
            )}
            onClick={() => setActiveCategory?.('All')}
          >
            All Items
          </button>
          {realCategories.length === 0 ? (
            <p className="px-4 py-2 text-sm text-neutral-500">No Categories Available</p>
          ) : realCategories.map((category) => (
            <button
              type="button"
              key={String(category.id)}
              className={cn(
                'w-full text-left px-4 py-2 rounded-lg hover:bg-neutral-100 transition-colors',
                String(activeCategory) === String(category.id) && 'bg-neutral-100 font-semibold'
              )}
              onClick={() => setActiveCategory?.(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
