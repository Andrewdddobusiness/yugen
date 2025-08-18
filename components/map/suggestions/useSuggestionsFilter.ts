import { useMemo } from 'react';
import type { SuggestedActivity, Filters } from './types';

/**
 * Custom hook for filtering suggestions based on user criteria
 * Handles rating, price, opening hours, and type filtering
 */
export function useSuggestionsFilter(suggestions: SuggestedActivity[], filters: Filters) {
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(suggestion => {
      // Type filter - check if suggestion matches selected types
      if (filters.types.length > 0) {
        const hasMatchingType = suggestion.types.some(type => 
          filters.types.includes(type)
        );
        if (!hasMatchingType) return false;
      }

      // Rating filter - exclude places below minimum rating
      if (suggestion.rating && suggestion.rating < filters.minRating) {
        return false;
      }

      // Price level filter - exclude places above maximum price
      if (suggestion.price_level && suggestion.price_level > filters.maxPriceLevel) {
        return false;
      }

      // Opening hours filter - only show open places if requested
      if (filters.openNow && !suggestion.opening_hours?.open_now) {
        return false;
      }

      return true;
    });
  }, [suggestions, filters]);

  return filteredSuggestions;
}