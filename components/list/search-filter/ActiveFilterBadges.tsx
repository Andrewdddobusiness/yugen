"use client";

import React from 'react';
import { Search, Tag, Clock, Calendar, DollarSign, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCategoryType } from '@/utils/formatting/types';
import { SearchFilters } from './types';
import { TIME_PERIODS, ACTIVITY_STATUS, FILTER_PRICE_LEVELS, DAYS_OF_WEEK } from './constants';


import { FilterBadge } from './badges';

interface ActiveFilterBadgesProps {
  filters: SearchFilters;
  hasActiveFilters: boolean;
  onUpdateFilter: (key: keyof SearchFilters, value: any) => void;
  onToggleArrayFilter: (key: keyof SearchFilters, value: string) => void;
  className?: string;
}

export function ActiveFilterBadges({
  filters,
  hasActiveFilters,
  onUpdateFilter,
  onToggleArrayFilter,
  className,
}: ActiveFilterBadgesProps) {
  if (!hasActiveFilters) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className || ''}`}>
      {/* Search Text Badge */}
      {filters.searchText && (
        <SearchTextBadge
          searchText={filters.searchText}
          onClear={() => onUpdateFilter('searchText', '')}
        />
      )}
      
      {/* Category Badges */}
      {filters.categories.map(category => (
        <FilterBadge
          key={category}
          icon={Tag}
          label={formatCategoryType(category)}
          onRemove={() => onToggleArrayFilter('categories', category)}
        />
      ))}

      {/* Time Period Badges */}
      {filters.timePeriods.map(period => {
        const timePeriod = TIME_PERIODS.find(tp => tp.value === period);
        const label = timePeriod?.label.split(' ')[0] || period;
        return (
          <FilterBadge
            key={period}
            icon={Clock}
            label={label}
            onRemove={() => onToggleArrayFilter('timePeriods', period)}
          />
        );
      })}

      {/* Activity Status Badges */}
      {filters.activityStatus.map(status => {
        const statusConfig = ACTIVITY_STATUS.find(s => s.value === status);
        const label = statusConfig?.label || status;
        return (
          <FilterBadge
            key={status}
            icon={Calendar}
            label={label}
            onRemove={() => onToggleArrayFilter('activityStatus', status)}
          />
        );
      })}

      {/* Price Level Badges */}
      {filters.priceLevel.map(price => {
        const priceConfig = FILTER_PRICE_LEVELS.find(p => p.value === price);
        const label = priceConfig?.label || price;
        return (
          <FilterBadge
            key={price}
            icon={DollarSign}
            label={label}
            onRemove={() => onToggleArrayFilter('priceLevel', price)}
          />
        );
      })}

      {/* Days of Week Badges */}
      {filters.daysOfWeek.map(day => {
        const dayConfig = DAYS_OF_WEEK.find(d => d.value === day);
        const label = dayConfig?.label || day;
        return (
          <FilterBadge
            key={day}
            icon={Calendar}
            label={label}
            onRemove={() => onToggleArrayFilter('daysOfWeek', day)}
          />
        );
      })}
    </div>
  );
}

interface SearchTextBadgeProps {
  searchText: string;
  onClear: () => void;
}

function SearchTextBadge({ searchText, onClear }: SearchTextBadgeProps) {
  return (
    <Badge variant="secondary" className="gap-1">
      <Search className="h-3 w-3" />
      &quot;{searchText}&quot;
      <button
        onClick={onClear}
        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}