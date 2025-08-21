"use client";

import React from 'react';
import { Tag } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatCategoryType } from '@/utils/formatting/types';

interface CategoryFilterProps {
  availableCategories: string[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
}

export function CategoryFilter({ 
  availableCategories, 
  selectedCategories, 
  onToggleCategory 
}: CategoryFilterProps) {
  if (availableCategories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Tag className="h-4 w-4" />
        Categories
      </Label>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {availableCategories.map(category => (
          <div key={category} className="flex items-center space-x-2">
            <Checkbox
              id={`category-${category}`}
              checked={selectedCategories.includes(category)}
              onCheckedChange={() => onToggleCategory(category)}
            />
            <Label
              htmlFor={`category-${category}`}
              className="text-sm font-normal cursor-pointer"
            >
              {formatCategoryType(category)}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}