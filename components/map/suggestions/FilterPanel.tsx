"use client";

import React from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { AVAILABLE_TYPES } from './constants';
import type { FilterPanelProps } from './types';
import type { SearchType } from '@/lib/googleMaps/includedTypes';

/**
 * Filter panel for refining location suggestions
 * Includes search type, activity types, and quick filters
 */
export function FilterPanel({ filters, setFilters, onRefresh }: FilterPanelProps) {
  const handleTypeToggle = (typeValue: string, checked: boolean) => {
    if (checked) {
      setFilters({
        ...filters,
        types: [...filters.types, typeValue]
      });
    } else {
      setFilters({
        ...filters,
        types: filters.types.filter(t => t !== typeValue)
      });
    }
  };

  const handleSearchTypeChange = (searchType: string) => {
    setFilters({
      ...filters,
      searchType: searchType as SearchType
    });
  };

  const handleOpenNowToggle = () => {
    setFilters({ 
      ...filters, 
      openNow: !filters.openNow 
    });
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      {/* Search Category Dropdown */}
      <div>
        <label className="text-xs font-medium mb-2 block">Search Category</label>
        <select
          value={filters.searchType}
          onChange={(e) => handleSearchTypeChange(e.target.value)}
          className="w-full text-xs border rounded px-2 py-1"
        >
          <option value="all">All Types</option>
          <option value="food">🍽️ Food & Dining</option>
          <option value="shopping">🛍️ Shopping</option>
          <option value="historical">🏛️ Historical & Cultural</option>
        </select>
      </div>
      
      {/* Activity Type Checkboxes */}
      <div>
        <label className="text-xs font-medium mb-2 block">Activity Types</label>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {AVAILABLE_TYPES.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                id={type.value}
                checked={filters.types.includes(type.value)}
                onCheckedChange={(checked) => handleTypeToggle(type.value, checked as boolean)}
              />
              <label htmlFor={type.value} className="text-xs flex items-center gap-1">
                <span>{type.emoji}</span>
                <span>{type.label}</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenNowToggle}
          className={cn(
            "text-xs flex-1",
            filters.openNow && "bg-green-50 border-green-200"
          )}
        >
          {filters.openNow ? '✓ Open Now' : 'Open Now'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="text-xs"
          title="Refresh suggestions"
        >
          <Zap className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}