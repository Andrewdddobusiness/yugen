"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SearchInput } from './SearchInput';
import { QuickFilters } from './QuickFilters';
import { FilterPanel } from './FilterPanel';
import { ActiveFilterBadges } from './ActiveFilterBadges';
import { NoResultsMessage } from './NoResultsMessage';
import { SearchFilterProps } from './types';
import { 
  useSearchFilters, 
  useActivityFiltering, 
  useAvailableCategories,
  useKeyboardShortcuts,
  useFilterChangeNotification
} from './hooks';

/**
 * SearchAndFilterContainer - Main orchestration component for search and filtering functionality
 * 
 * Features:
 * - Text search with debouncing
 * - Category, time period, status, price level filters
 * - Quick filter shortcuts
 * - Active filter badges with individual removal
 * - Keyboard shortcuts (Ctrl+K for search, Esc, Ctrl+Shift+C for clear all)
 * - Persistent filter state via localStorage
 * - Results count display
 * - No results messaging with clear actions
 * 
 * @example
 * <SearchAndFilterContainer 
 *   activities={activities}
 *   onFilteredActivitiesChange={handleFilteredActivitiesChange}
 *   onSearchTermChange={handleSearchTermChange}
 * />
 */
export function SearchAndFilterContainer({ 
  activities, 
  onFilteredActivitiesChange, 
  onSearchTermChange, 
  className 
}: SearchFilterProps) {
  const {
    filters,
    showFilters,
    setShowFilters,
    debouncedSearchText,
    updateFilter,
    toggleArrayFilter,
    clearAllFilters,
    applyQuickFilter,
    hasActiveFilters,
    activeFilterCount,
  } = useSearchFilters();

  const { filteredActivities } = useActivityFiltering(activities, filters, debouncedSearchText);
  const availableCategories = useAvailableCategories(activities);

  // Set up keyboard shortcuts
  useKeyboardShortcuts(
    showFilters,
    setShowFilters,
    filters.searchText,
    updateFilter,
    clearAllFilters
  );

  // Notify parent component of changes
  useFilterChangeNotification(
    filteredActivities,
    debouncedSearchText,
    onFilteredActivitiesChange,
    onSearchTermChange
  );

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Search Bar */}
        <SearchInput
          searchText={filters.searchText}
          onSearchChange={updateFilter}
        />

        {/* Quick Filters */}
        <QuickFilters onApplyQuickFilter={applyQuickFilter} />

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FilterPanel
              showFilters={showFilters}
              onShowFiltersChange={setShowFilters}
              filters={filters}
              onToggleArrayFilter={toggleArrayFilter}
              onClearAllFilters={clearAllFilters}
              hasActiveFilters={hasActiveFilters}
              activeFilterCount={activeFilterCount}
              availableCategories={availableCategories}
            />

            {/* Results count */}
            <span className="text-sm text-muted-foreground">
              {filteredActivities.length === activities.length
                ? `${activities.length} activities`
                : `${filteredActivities.length} of ${activities.length} activities`
              }
            </span>
          </div>

          {/* Quick clear button */}
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              title="Clear all filters (Ctrl+Shift+C)"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Active Filter Badges */}
        <ActiveFilterBadges
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onUpdateFilter={updateFilter}
          onToggleArrayFilter={toggleArrayFilter}
        />

        {/* No Results Message */}
        <NoResultsMessage
          filteredActivities={filteredActivities}
          totalActivities={activities.length}
          searchText={filters.searchText}
          onUpdateFilter={updateFilter}
          onClearAllFilters={clearAllFilters}
        />
      </CardContent>
    </Card>
  );
}