"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/lib/utils';

interface WishlistCategoriesProps {
  categories: Record<string, number>;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  className?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'restaurant': '🍴 Restaurants',
  'tourist_attraction': '🏛️ Attractions',
  'shopping_mall': '🛍️ Shopping',
  'lodging': '🏨 Hotels',
  'museum': '🎭 Museums',
  'park': '🌳 Parks',
  'church': '⛪ Religious Sites',
  'night_club': '🌙 Nightlife',
  'food': '🍽️ Food & Dining',
  'entertainment': '🎪 Entertainment',
  'shopping': '🛒 Shopping',
  'transportation': '🚇 Transportation',
  'health': '🏥 Health & Wellness',
  'education': '🎓 Education',
  'government': '🏛️ Government',
  'finance': '🏦 Finance',
  'beauty_salon': '💄 Beauty & Spa',
  'gym': '💪 Fitness',
  'library': '📚 Library',
  'hospital': '🏥 Hospital'
};

export default function WishlistCategories({
  categories,
  selectedCategory,
  onCategorySelect,
  className = ""
}: WishlistCategoriesProps) {
  const sortedCategories = Object.entries(categories)
    .sort(([,a], [,b]) => b - a) // Sort by count descending
    .slice(0, 8); // Show top 8 categories

  if (sortedCategories.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-sm font-medium text-gray-700">Categories</h4>
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedCategory === '' ? 'default' : 'secondary'}
          className={cn(
            "cursor-pointer transition-colors",
            selectedCategory === '' 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "hover:bg-gray-200"
          )}
          onClick={() => onCategorySelect('')}
        >
          All ({Object.values(categories).reduce((sum, count) => sum + count, 0)})
        </Badge>
        
        {sortedCategories.map(([category, count]) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? 'default' : 'secondary'}
            className={cn(
              "cursor-pointer transition-colors",
              selectedCategory === category 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "hover:bg-gray-200"
            )}
            onClick={() => onCategorySelect(category)}
          >
            {CATEGORY_LABELS[category] || category.replace(/_/g, ' ')} ({count})
          </Badge>
        ))}
      </div>
    </div>
  );
}