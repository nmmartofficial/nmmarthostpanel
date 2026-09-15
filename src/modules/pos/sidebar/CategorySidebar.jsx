
import React from 'react';
import CategoryItem from './CategoryItem';
import { usePOS } from '../context/POSContext';

export default function CategorySidebar() {
  const { categories, selectedCategory, selectCategory } = usePOS();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <div className="bg-gradient-to-br from-emerald-600 to-blue-600 rounded-xl text-white p-4 shadow-lg">
          <h2 className="text-xl font-extrabold">NM MART</h2>
          <p className="text-sm opacity-90">Enterprise POS</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {categories.map((category) => (
          <CategoryItem
          key={category.id}
          category={category}
          isSelected={selectedCategory === category.id}
          onClick={() => selectCategory(category.id)}
        />
      ))}
    </div>
    </aside>
  );
}
