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

export interface TimePeriod {
  value: string;
  label: string;
  start: number;
  end: number;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface QuickFilterConfig {
  label: string;
  filters: Partial<SearchFilters>;
}

export interface SearchFilterProps {
  activities: FilterableActivity[];
  onFilteredActivitiesChange: (filtered: FilterableActivity[]) => void;
  onSearchTermChange?: (searchTerm: string) => void;
  className?: string;
}