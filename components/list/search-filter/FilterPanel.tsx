"use client";

import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { SearchFilters } from './types';
import {
  CategoryFilter,
  TimePeriodFilter,
  ActivityStatusFilter,
  PriceLevelFilter,
  DaysOfWeekFilter,
} from './filters';

interface FilterPanelProps {
  showFilters: boolean;
  onShowFiltersChange: (show: boolean) => void;
  filters: SearchFilters;
  onToggleArrayFilter: (key: keyof SearchFilters, value: string) => void;
  onClearAllFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  availableCategories: string[];
}

export function FilterPanel({
  showFilters,
  onShowFiltersChange,
  filters,
  onToggleArrayFilter,
  onClearAllFilters,
  hasActiveFilters,
  activeFilterCount,
  availableCategories,
}: FilterPanelProps) {
  return (
    <Popover open={showFilters} onOpenChange={onShowFiltersChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs rounded-full">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filters</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClearAllFilters}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <Separator />

          {/* Categories */}
          <CategoryFilter
            availableCategories={availableCategories}
            selectedCategories={filters.categories}
            onToggleCategory={(category) => onToggleArrayFilter('categories', category)}
          />

          {/* Time Periods */}
          <TimePeriodFilter
            selectedPeriods={filters.timePeriods}
            onTogglePeriod={(period) => onToggleArrayFilter('timePeriods', period)}
          />

          {/* Activity Status */}
          <ActivityStatusFilter
            selectedStatuses={filters.activityStatus}
            onToggleStatus={(status) => onToggleArrayFilter('activityStatus', status)}
          />

          {/* Price Level */}
          <PriceLevelFilter
            selectedLevels={filters.priceLevel}
            onToggleLevel={(level) => onToggleArrayFilter('priceLevel', level)}
          />

          {/* Days of Week */}
          <DaysOfWeekFilter
            selectedDays={filters.daysOfWeek}
            onToggleDay={(day) => onToggleArrayFilter('daysOfWeek', day)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}