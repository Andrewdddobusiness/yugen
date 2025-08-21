"use client";

import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterableActivity, SearchFilters } from './types';

interface NoResultsMessageProps {
  filteredActivities: FilterableActivity[];
  totalActivities: number;
  searchText: string;
  onUpdateFilter: (key: keyof SearchFilters, value: any) => void;
  onClearAllFilters: () => void;
  className?: string;
}

export function NoResultsMessage({
  filteredActivities,
  totalActivities,
  searchText,
  onUpdateFilter,
  onClearAllFilters,
  className,
}: NoResultsMessageProps) {
  // Only show if there are activities but none match filters
  if (filteredActivities.length > 0 || totalActivities === 0) {
    return null;
  }

  return (
    <div className={`text-center py-6 text-muted-foreground ${className || ''}`}>
      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm mb-2">
        {searchText 
          ? `No activities match "${searchText}"` 
          : 'No activities match your current filters'
        }
      </p>
      {searchText ? (
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onUpdateFilter('searchText', '')}
          >
            Clear search
          </Button>
          <span className="text-xs text-muted-foreground">or</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearAllFilters}
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearAllFilters} 
          className="mt-2"
        >
          Clear filters to see all activities
        </Button>
      )}
    </div>
  );
}