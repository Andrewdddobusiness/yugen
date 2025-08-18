import { useState, useCallback } from "react";
import { fetchNearbyActivities } from "@/actions/google/actions";
import type { SuggestedActivity, ItineraryActivity, Filters } from "./types";
import { convertToSuggestedActivity, getExistingPlaceIds } from "./utils";

/**
 * Custom hook for fetching location suggestions from Google Places API
 * Handles loading state, error handling, and data conversion
 */
export function useSuggestionsFetch() {
  const [suggestions, setSuggestions] = useState<SuggestedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSuggestions = useCallback(
    async (mapCenter: { lat: number; lng: number }, filters: Filters, existingActivities: ItineraryActivity[]) => {
      setIsLoading(true);

      try {
        // Fetch nearby activities from Google Places API
        const nearbyActivities = await fetchNearbyActivities(
          mapCenter.lat,
          mapCenter.lng,
          filters.radius,
          filters.searchType
        );

        // Convert to SuggestedActivity format
        const converted = nearbyActivities.map(convertToSuggestedActivity);

        // Filter out activities that already exist in the itinerary
        const existingPlaceIds = getExistingPlaceIds(existingActivities);
        const filteredSuggestions = converted.filter(
          (suggestion: SuggestedActivity) => !existingPlaceIds.has(suggestion.place_id)
        );

        setSuggestions(filteredSuggestions);
      } catch (error) {
        console.error("Failed to fetch location suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    suggestions,
    isLoading,
    fetchSuggestions,
  };
}
