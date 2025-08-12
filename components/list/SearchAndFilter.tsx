"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Filter, X, ChevronDown, Calendar, Clock, Star, DollarSign, MapPin, Tag, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCategoryType } from '@/utils/formatting/types';
import { useDebounce } from '@/components/hooks/use-debounce';

export interface SearchFilters {
  searchText: string;
  categories: string[];
  timePeriods: string[];
  activityStatus: string[];
  priceLevel: string[];
  ratingRange: number[];
  daysOfWeek: string[];
  hasNotes: boolean | null;
  hasTime: boolean | null;
  hasCoordinates: boolean | null;
}

export interface FilterableActivity {
  itinerary_activity_id: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes?: string;
  activity?: {
    name: string;
    address?: string;
    types?: string[];
    rating?: number;
    price_level?: string;
    coordinates?: [number, number];
  };
}

interface SearchAndFilterProps {
  activities: FilterableActivity[];
  onFilteredActivitiesChange: (filtered: FilterableActivity[]) => void;
  onSearchTermChange?: (searchTerm: string) => void;
  className?: string;
}

const TIME_PERIODS = [
  { value: 'morning', label: 'Morning (6AM-12PM)', start: 6, end: 12 },
  { value: 'afternoon', label: 'Afternoon (12PM-6PM)', start: 12, end: 18 },
  { value: 'evening', label: 'Evening (6PM-12AM)', start: 18, end: 24 },
  { value: 'late-night', label: 'Late Night (12AM-6AM)', start: 0, end: 6 },
];

const ACTIVITY_STATUS = [
  { value: 'scheduled', label: 'Scheduled (has time)' },
  { value: 'unscheduled', label: 'Unscheduled (no time)' },
  { value: 'with-notes', label: 'Has notes' },
  { value: 'without-notes', label: 'No notes' },
];

const PRICE_LEVELS = [
  { value: '1', label: '$' },
  { value: '2', label: '$$' },
  { value: '3', label: '$$$' },
  { value: '4', label: '$$$$' },
];

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const QUICK_FILTERS = [
  { label: 'Scheduled', filters: { activityStatus: ['scheduled'] } },
  { label: 'Unscheduled', filters: { activityStatus: ['unscheduled'] } },
  { label: 'Has Notes', filters: { activityStatus: ['with-notes'] } },
  { label: 'Morning', filters: { timePeriods: ['morning'] } },
  { label: 'Evening', filters: { timePeriods: ['evening'] } },
  { label: 'High Rated', filters: { ratingRange: [4, 5] } },
  { label: 'Weekend', filters: { daysOfWeek: ['0', '6'] } },
];

const DEFAULT_FILTERS: SearchFilters = {
  searchText: '',
  categories: [],
  timePeriods: [],
  activityStatus: [],
  priceLevel: [],
  ratingRange: [0, 5],
  daysOfWeek: [],
  hasNotes: null,
  hasTime: null,
  hasCoordinates: null,
};

export function SearchAndFilter({ activities, onFilteredActivitiesChange, onSearchTermChange, className }: SearchAndFilterProps) {
  const [filters, setFilters] = useState<SearchFilters>(() => {
    // Try to restore from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('itinerary-list-filters');
        if (saved) {
          const parsedFilters = JSON.parse(saved);
          return { ...DEFAULT_FILTERS, ...parsedFilters };
        }
      } catch (error) {
        console.warn('Failed to load filters from localStorage:', error);
      }
    }
    return DEFAULT_FILTERS;
  });

  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearchText = useDebounce(filters.searchText, 300);

  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayFilter = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const currentArray = prev[key] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
      
      // Escape to clear search and close filters
      if (event.key === 'Escape') {
        if (showFilters) {
          setShowFilters(false);
        } else if (filters.searchText) {
          updateFilter('searchText', '');
        }
      }
      
      // Ctrl/Cmd + Shift + C to clear all filters
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        clearAllFilters();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFilters, filters.searchText, updateFilter, clearAllFilters]);

  // Extract unique categories from activities
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    activities.forEach(activity => {
      activity.activity?.types?.forEach(type => categories.add(type));
    });
    return Array.from(categories).sort();
  }, [activities]);

  // Save filters to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('itinerary-list-filters', JSON.stringify(filters));
      } catch (error) {
        console.warn('Failed to save filters to localStorage:', error);
      }
    }
  }, [filters]);

  // Filter activities based on current filters
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Text search
      if (debouncedSearchText) {
        const searchLower = debouncedSearchText.toLowerCase();
        const matchesName = activity.activity?.name?.toLowerCase().includes(searchLower);
        const matchesAddress = activity.activity?.address?.toLowerCase().includes(searchLower);
        const matchesNotes = activity.notes?.toLowerCase().includes(searchLower);
        
        if (!matchesName && !matchesAddress && !matchesNotes) {
          return false;
        }
      }

      // Category filter
      if (filters.categories.length > 0) {
        const activityTypes = activity.activity?.types || [];
        const hasMatchingCategory = filters.categories.some(cat => activityTypes.includes(cat));
        if (!hasMatchingCategory) return false;
      }

      // Time period filter
      if (filters.timePeriods.length > 0 && activity.start_time) {
        const [hours] = activity.start_time.split(':').map(Number);
        const matchesTimePeriod = filters.timePeriods.some(period => {
          const timePeriod = TIME_PERIODS.find(tp => tp.value === period);
          if (!timePeriod) return false;
          return hours >= timePeriod.start && hours < timePeriod.end;
        });
        if (!matchesTimePeriod) return false;
      } else if (filters.timePeriods.length > 0 && !activity.start_time) {
        // If filtering by time periods but activity has no time, exclude it
        return false;
      }

      // Activity status filter
      if (filters.activityStatus.length > 0) {
        const hasTime = !!activity.start_time;
        const hasNotes = !!activity.notes && activity.notes.trim() !== '';
        
        const matchesStatus = filters.activityStatus.some(status => {
          switch (status) {
            case 'scheduled': return hasTime;
            case 'unscheduled': return !hasTime;
            case 'with-notes': return hasNotes;
            case 'without-notes': return !hasNotes;
            default: return false;
          }
        });
        if (!matchesStatus) return false;
      }

      // Price level filter
      if (filters.priceLevel.length > 0 && activity.activity?.price_level) {
        if (!filters.priceLevel.includes(activity.activity.price_level)) {
          return false;
        }
      } else if (filters.priceLevel.length > 0 && !activity.activity?.price_level) {
        // If filtering by price but activity has no price, exclude it
        return false;
      }

      // Rating filter
      if (activity.activity?.rating) {
        const rating = activity.activity.rating;
        if (rating < filters.ratingRange[0] || rating > filters.ratingRange[1]) {
          return false;
        }
      }

      // Day of week filter
      if (filters.daysOfWeek.length > 0 && activity.date) {
        const dayOfWeek = new Date(activity.date).getDay().toString();
        if (!filters.daysOfWeek.includes(dayOfWeek)) {
          return false;
        }
      } else if (filters.daysOfWeek.length > 0 && !activity.date) {
        // If filtering by days but activity has no date, exclude it
        return false;
      }

      return true;
    });
  }, [activities, debouncedSearchText, filters]);

  // Notify parent component of filtered activities and search term
  const prevFilteredActivitiesRef = useRef<FilterableActivity[]>([]);
  const prevSearchTermRef = useRef<string>('');
  
  useEffect(() => {
    // Only call if actual changes occurred
    if (filteredActivities !== prevFilteredActivitiesRef.current) {
      prevFilteredActivitiesRef.current = filteredActivities;
      onFilteredActivitiesChange(filteredActivities);
    }
    
    if (debouncedSearchText !== prevSearchTermRef.current) {
      prevSearchTermRef.current = debouncedSearchText;
      if (onSearchTermChange) {
        onSearchTermChange(debouncedSearchText);
      }
    }
  }, [filteredActivities, debouncedSearchText]);

  const applyQuickFilter = useCallback((quickFilter: typeof QUICK_FILTERS[0]) => {
    setFilters(prev => ({
      ...prev,
      ...quickFilter.filters,
    }));
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchText !== '' ||
      filters.categories.length > 0 ||
      filters.timePeriods.length > 0 ||
      filters.activityStatus.length > 0 ||
      filters.priceLevel.length > 0 ||
      filters.ratingRange[0] > 0 ||
      filters.ratingRange[1] < 5 ||
      filters.daysOfWeek.length > 0
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchText !== '') count++;
    if (filters.categories.length > 0) count += filters.categories.length;
    if (filters.timePeriods.length > 0) count += filters.timePeriods.length;
    if (filters.activityStatus.length > 0) count += filters.activityStatus.length;
    if (filters.priceLevel.length > 0) count += filters.priceLevel.length;
    if (filters.ratingRange[0] > 0 || filters.ratingRange[1] < 5) count++;
    if (filters.daysOfWeek.length > 0) count += filters.daysOfWeek.length;
    return count;
  }, [filters]);

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search activities, addresses, or notes... (Ctrl+K)"
            value={filters.searchText}
            onChange={(e) => updateFilter('searchText', e.target.value)}
            className="pl-10 pr-16"
          />
          {filters.searchText && (
            <button
              onClick={() => updateFilter('searchText', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              title="Clear search (Esc)"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map(quickFilter => (
            <Button
              key={quickFilter.label}
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter(quickFilter)}
              className="h-7 text-xs"
            >
              {quickFilter.label}
            </Button>
          ))}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Popover open={showFilters} onOpenChange={setShowFilters}>
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
                      <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>

                  <Separator />

                  {/* Categories */}
                  {availableCategories.length > 0 && (
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
                              checked={filters.categories.includes(category)}
                              onCheckedChange={() => toggleArrayFilter('categories', category)}
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
                  )}

                  {/* Time Periods */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      Time of Day
                    </Label>
                    <div className="space-y-2">
                      {TIME_PERIODS.map(period => (
                        <div key={period.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`time-${period.value}`}
                            checked={filters.timePeriods.includes(period.value)}
                            onCheckedChange={() => toggleArrayFilter('timePeriods', period.value)}
                          />
                          <Label
                            htmlFor={`time-${period.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {period.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity Status */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4" />
                      Status
                    </Label>
                    <div className="space-y-2">
                      {ACTIVITY_STATUS.map(status => (
                        <div key={status.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status.value}`}
                            checked={filters.activityStatus.includes(status.value)}
                            onCheckedChange={() => toggleArrayFilter('activityStatus', status.value)}
                          />
                          <Label
                            htmlFor={`status-${status.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {status.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Level */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <DollarSign className="h-4 w-4" />
                      Price Level
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRICE_LEVELS.map(price => (
                        <div key={price.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`price-${price.value}`}
                            checked={filters.priceLevel.includes(price.value)}
                            onCheckedChange={() => toggleArrayFilter('priceLevel', price.value)}
                          />
                          <Label
                            htmlFor={`price-${price.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {price.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Days of Week */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4" />
                      Days of Week
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${day.value}`}
                            checked={filters.daysOfWeek.includes(day.value)}
                            onCheckedChange={() => toggleArrayFilter('daysOfWeek', day.value)}
                          />
                          <Label
                            htmlFor={`day-${day.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

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
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.searchText && (
              <Badge variant="secondary" className="gap-1">
                <Search className="h-3 w-3" />
                "{filters.searchText}"
                <button
                  onClick={() => updateFilter('searchText', '')}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {filters.categories.map(category => (
              <Badge key={category} variant="secondary" className="gap-1">
                <Tag className="h-3 w-3" />
                {formatCategoryType(category)}
                <button
                  onClick={() => toggleArrayFilter('categories', category)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            {filters.timePeriods.map(period => (
              <Badge key={period} variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {TIME_PERIODS.find(tp => tp.value === period)?.label.split(' ')[0]}
                <button
                  onClick={() => toggleArrayFilter('timePeriods', period)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            {filters.activityStatus.map(status => (
              <Badge key={status} variant="secondary" className="gap-1">
                <Calendar className="h-3 w-3" />
                {ACTIVITY_STATUS.find(s => s.value === status)?.label}
                <button
                  onClick={() => toggleArrayFilter('activityStatus', status)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            {filters.priceLevel.map(price => (
              <Badge key={price} variant="secondary" className="gap-1">
                <DollarSign className="h-3 w-3" />
                {PRICE_LEVELS.find(p => p.value === price)?.label}
                <button
                  onClick={() => toggleArrayFilter('priceLevel', price)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}

            {filters.daysOfWeek.map(day => (
              <Badge key={day} variant="secondary" className="gap-1">
                <Calendar className="h-3 w-3" />
                {DAYS_OF_WEEK.find(d => d.value === day)?.label}
                <button
                  onClick={() => toggleArrayFilter('daysOfWeek', day)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {filteredActivities.length === 0 && activities.length > 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm mb-2">
              {filters.searchText 
                ? `No activities match &quot;${filters.searchText}&quot;` 
                : 'No activities match your current filters'
              }
            </p>
            {filters.searchText ? (
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
                <Button variant="ghost" size="sm" onClick={() => updateFilter('searchText', '')}>
                  Clear search
                </Button>
                <span className="text-xs text-muted-foreground">or</span>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="mt-2">
                Clear filters to see all activities
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}