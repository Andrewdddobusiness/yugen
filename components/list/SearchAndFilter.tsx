"use client";

import React from 'react';
import { SearchAndFilterContainer } from './search-filter/SearchAndFilterContainer';

// Re-export types for backward compatibility
export type {
  SearchFilters,
  FilterableActivity,
} from './search-filter/types';

interface SearchAndFilterProps {
  activities: import('./search-filter/types').FilterableActivity[];
  onFilteredActivitiesChange: (filtered: import('./search-filter/types').FilterableActivity[]) => void;
  onSearchTermChange?: (searchTerm: string) => void;
  className?: string;
}

/**
 * SearchAndFilter - Backward compatibility wrapper for SearchAndFilterContainer
 * 
 * This component has been refactored into smaller, focused components in the
 * search-filter/ directory. This wrapper maintains backward compatibility
 * for existing usage while providing the same functionality.
 * 
 * @deprecated Use SearchAndFilterContainer directly from search-filter/ directory
 */
export function SearchAndFilter(props: SearchAndFilterProps) {
  return <SearchAndFilterContainer {...props} />;
}