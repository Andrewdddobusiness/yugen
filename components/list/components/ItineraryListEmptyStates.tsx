"use client";

import React, { memo } from 'react';
import { Clock } from 'lucide-react';

interface EmptyItineraryProps {
  className?: string;
}

/**
 * EmptyItinerary - Shown when no activities exist in the itinerary
 */
export const EmptyItinerary = memo<EmptyItineraryProps>(({ className }) => (
  <div className={`text-center py-12 ${className || ''}`}>
    <div className="text-muted-foreground">
      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">No activities in itinerary</h3>
      <p className="text-sm">Add activities to your itinerary to see them here.</p>
    </div>
  </div>
));

EmptyItinerary.displayName = 'EmptyItinerary';

interface NoFilterResultsProps {
  className?: string;
}

/**
 * NoFilterResults - Shown when activities exist but current filters exclude all of them
 */
export const NoFilterResults = memo<NoFilterResultsProps>(({ className }) => (
  <div className={`text-center py-12 ${className || ''}`}>
    <div className="text-muted-foreground">
      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">No activities match current filters</h3>
      <p className="text-sm">Try adjusting your search or filters to see more results.</p>
    </div>
  </div>
));

NoFilterResults.displayName = 'NoFilterResults';

interface ItineraryListEmptyStatesProps {
  hasActivities: boolean;
  hasFilteredResults: boolean;
  className?: string;
}

/**
 * ItineraryListEmptyStates - Manages different empty states for the itinerary list
 * 
 * Features:
 * - Shows appropriate message based on state (no activities vs filtered out)
 * - Consistent styling and iconography
 * - Accessible with proper semantic structure
 */
export const ItineraryListEmptyStates = memo<ItineraryListEmptyStatesProps>(({
  hasActivities,
  hasFilteredResults,
  className,
}) => {
  if (!hasActivities) {
    return <EmptyItinerary className={className} />;
  }
  
  if (!hasFilteredResults) {
    return <NoFilterResults className={className} />;
  }
  
  return null;
});

ItineraryListEmptyStates.displayName = 'ItineraryListEmptyStates';