import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SearchFilters, FilterableActivity } from './types';
import { DEFAULT_FILTERS, STORAGE_KEY, TIME_PERIODS } from './constants';
import { useDebounce } from '@/components/hooks/use-debounce';

export function useSearchFilters() {
  const [filters, setFilters] = useState<SearchFilters>(() => {
    // Try to restore from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
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

  const applyQuickFilter = useCallback((quickFilterConfig: { filters: Partial<SearchFilters> }) => {
    setFilters(prev => ({
      ...prev,
      ...quickFilterConfig.filters,
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

  // Save filters to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } catch (error) {
        console.warn('Failed to save filters to localStorage:', error);
      }
    }
  }, [filters]);

  return {
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
  };
}

export function useActivityFiltering(activities: FilterableActivity[], filters: SearchFilters, debouncedSearchText: string) {
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

  return { filteredActivities };
}

export function useAvailableCategories(activities: FilterableActivity[]) {
  return useMemo(() => {
    const categories = new Set<string>();
    activities.forEach(activity => {
      activity.activity?.types?.forEach(type => categories.add(type));
    });
    return Array.from(categories).sort();
  }, [activities]);
}

export function useKeyboardShortcuts(
  showFilters: boolean,
  setShowFilters: (show: boolean) => void,
  searchText: string,
  updateFilter: (key: keyof SearchFilters, value: any) => void,
  clearAllFilters: () => void
) {
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
        } else if (searchText) {
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
  }, [showFilters, setShowFilters, searchText, updateFilter, clearAllFilters]);
}

export function useFilterChangeNotification(
  filteredActivities: FilterableActivity[],
  debouncedSearchText: string,
  onFilteredActivitiesChange: (filtered: FilterableActivity[]) => void,
  onSearchTermChange?: (searchTerm: string) => void
) {
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
  }, [filteredActivities, debouncedSearchText, onFilteredActivitiesChange, onSearchTermChange]);
}