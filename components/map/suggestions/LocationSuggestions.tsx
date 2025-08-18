"use client";

import React, { useState, useEffect } from 'react';
import { InfoWindow } from '@vis.gl/react-google-maps';
import { cn } from '@/lib/utils';
import { SuggestionMarker } from './SuggestionMarker';
import { SuggestionDetails } from './SuggestionDetails';
import { SuggestionsControlPanel } from './SuggestionsControlPanel';
import { useSuggestionsFetch } from './useSuggestionsFetch';
import { useSuggestionsFilter } from './useSuggestionsFilter';
import { DEFAULT_FILTERS } from './constants';
import type { LocationSuggestionsProps, SuggestedActivity, Filters } from './types';

/**
 * Main LocationSuggestions component
 * Orchestrates all suggestion-related functionality on the map
 */
export function LocationSuggestions({
  existingActivities,
  mapCenter,
  selectedDate,
  onAddSuggestion,
  className,
}: LocationSuggestionsProps) {
  // Local state
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedActivity | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Custom hooks
  const { suggestions, isLoading, fetchSuggestions } = useSuggestionsFetch();
  const filteredSuggestions = useSuggestionsFilter(suggestions, filters);

  // Fetch suggestions when dependencies change
  useEffect(() => {
    fetchSuggestions(mapCenter, filters, existingActivities);
  }, [fetchSuggestions, mapCenter, filters.searchType, filters.radius, existingActivities]);

  // Handlers
  const handleMarkerClick = (suggestion: SuggestedActivity) => {
    setSelectedSuggestion(suggestion);
  };

  const handleAddSuggestion = (suggestion: SuggestedActivity, date?: string) => {
    onAddSuggestion?.(suggestion, date);
    setSelectedSuggestion(null);
  };

  const handleRefresh = () => {
    fetchSuggestions(mapCenter, filters, existingActivities);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Render suggestion markers */}
      {filteredSuggestions.map((suggestion) => (
        <SuggestionMarker
          key={suggestion.place_id}
          suggestion={suggestion}
          onClick={() => handleMarkerClick(suggestion)}
        />
      ))}

      {/* Render selected suggestion info window */}
      {selectedSuggestion && (
        <InfoWindow
          position={selectedSuggestion.geometry.location}
          onCloseClick={() => setSelectedSuggestion(null)}
          maxWidth={300}
        >
          <SuggestionDetails
            suggestion={selectedSuggestion}
            selectedDate={selectedDate}
            onAdd={handleAddSuggestion}
          />
        </InfoWindow>
      )}

      {/* Render control panel */}
      <SuggestionsControlPanel
        filteredCount={filteredSuggestions.length}
        totalActivities={existingActivities.length}
        filters={filters}
        setFilters={setFilters}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />
    </div>
  );
}