import type { SearchType } from '@/lib/googleMaps/includedTypes';

// Core suggestion types
export interface SuggestedActivity {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  price_level?: number;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
}

export interface ItineraryActivity {
  itinerary_activity_id: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  activity?: {
    name: string;
    coordinates?: [number, number];
    types?: string[];
    place_id?: string;
  };
}

export interface Filters {
  types: string[];
  minRating: number;
  maxPriceLevel: number;
  openNow: boolean;
  radius: number;
  searchType: SearchType;
}

// Component prop types
export interface LocationSuggestionsProps {
  existingActivities: ItineraryActivity[];
  mapCenter: { lat: number; lng: number };
  selectedDate?: string;
  onAddSuggestion?: (activity: SuggestedActivity, date?: string) => void;
  className?: string;
}

export interface SuggestionMarkerProps {
  suggestion: SuggestedActivity;
  onClick: () => void;
}

export interface SuggestionDetailsProps {
  suggestion: SuggestedActivity;
  selectedDate?: string;
  onAdd: (suggestion: SuggestedActivity, date?: string) => void;
}

export interface SuggestionsControlPanelProps {
  filteredCount: number;
  totalActivities: number;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export interface FilterPanelProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  onRefresh: () => void;
}