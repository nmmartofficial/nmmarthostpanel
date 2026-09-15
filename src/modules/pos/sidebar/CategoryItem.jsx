
import React from 'react';
import {
  LayoutGrid,
  TrendingUp,
  Star,
  Droplets,
  Coffee,
  Utensils,
  Smile,
  Heart,
  Candy,
  Wheat,
  GlassWater,
} from 'lucide-react';

const iconMap = {
  'layout-grid': LayoutGrid,
  'trending-up': TrendingUp,
  star: Star,
  droplet: Droplets,
  coffee: Coffee,
  utensils: Utensils,
  smile: Smile,
  heart: Heart,
  candy: Candy,
  wheat: Wheat,
  'glass-water': GlassWater,
};

export default function CategoryItem({ category, isSelected, onClick }) {
  const IconComponent = iconMap[category.icon] || LayoutGrid;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isSelected
          ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <IconComponent size={18} />
      <span className="font-semibold">{category.name}</span>
    </button>
  );
}
