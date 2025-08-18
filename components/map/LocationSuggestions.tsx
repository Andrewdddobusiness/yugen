"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { MapPin, Star, Clock, Plus, Filter, ChevronDown, Sparkles, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { SearchType } from "@/lib/googleMaps/includedTypes";

// Types
interface SuggestedActivity {
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

interface ItineraryActivity {
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

interface Filters {
  types: string[];
  minRating: number;
  maxPriceLevel: number;
  openNow: boolean;
  radius: number;
  searchType: SearchType;
}

interface LocationSuggestionsProps {
  existingActivities: ItineraryActivity[];
  mapCenter: { lat: number; lng: number };
  selectedDate?: string;
  onAddSuggestion?: (activity: SuggestedActivity, date?: string) => void;
  className?: string;
}

// Constants
const AVAILABLE_TYPES = [
  { value: "restaurant", label: "Restaurants", emoji: "🍽️" },
  { value: "tourist_attraction", label: "Attractions", emoji: "🏛️" },
  { value: "museum", label: "Museums", emoji: "🎨" },
  { value: "park", label: "Parks", emoji: "🌳" },
  { value: "shopping_mall", label: "Shopping", emoji: "🛍️" },
  { value: "cafe", label: "Cafes", emoji: "☕" },
  { value: "bar", label: "Bars", emoji: "🍺" },
  { value: "church", label: "Religious Sites", emoji: "⛪" },
  { value: "amusement_park", label: "Entertainment", emoji: "🎢" },
  { value: "spa", label: "Wellness", emoji: "🧖‍♀️" },
];

const DEFAULT_FILTERS: Filters = {
  types: [],
  minRating: 0,
  maxPriceLevel: 4,
  openNow: false,
  radius: 2000,
  searchType: "all",
};

// Main Component
export function LocationSuggestions({
  existingActivities,
  mapCenter,
  selectedDate,
  onAddSuggestion,
  className,
}: LocationSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedActivity[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedActivity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Fetch suggestions from Google Places API
  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);

    try {
      const { fetchNearbyActivities } = await import("@/actions/google/actions");

      const nearbyActivities = await fetchNearbyActivities(
        mapCenter.lat,
        mapCenter.lng,
        filters.radius,
        filters.searchType
      );

      // Convert to SuggestedActivity format
      const converted: SuggestedActivity[] = nearbyActivities.map((activity: any) => ({
        place_id: activity.place_id,
        name: activity.name,
        vicinity: activity.address || "Address not available",
        rating: activity.rating || undefined,
        price_level: activity.price_level ? parseInt(activity.price_level) : undefined,
        types: Array.isArray(activity.types)
          ? activity.types
          : typeof activity.types === "string"
          ? activity.types.split(",").map((t: string) => t.trim())
          : [],
        geometry: {
          location: {
            lat: activity.coordinates[1],
            lng: activity.coordinates[0],
          },
        },
        photos: activity.photo_names
          ? activity.photo_names.map((name: string) => ({
              photo_reference: name,
              width: 400,
              height: 300,
            }))
          : undefined,
        opening_hours:
          activity.open_hours && activity.open_hours.length > 0
            ? {
                open_now: true,
              }
            : undefined,
      }));

      // Filter out existing activities
      const existingPlaceIds = new Set(existingActivities.map((a) => a.activity?.place_id).filter(Boolean));

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
  }, [mapCenter.lat, mapCenter.lng, filters.radius, filters.searchType, existingActivities]);

  // Filter suggestions based on current filters
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((suggestion) => {
      if (filters.types.length > 0) {
        const hasMatchingType = suggestion.types.some((type) => filters.types.includes(type));
        if (!hasMatchingType) return false;
      }

      if (suggestion.rating && suggestion.rating < filters.minRating) {
        return false;
      }

      if (suggestion.price_level && suggestion.price_level > filters.maxPriceLevel) {
        return false;
      }

      if (filters.openNow && !suggestion.opening_hours?.open_now) {
        return false;
      }

      return true;
    });
  }, [suggestions, filters]);

  // Fetch suggestions when dependencies change
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return (
    <div className={cn("relative", className)}>
      {/* Suggestion Markers */}
      {filteredSuggestions.map((suggestion) => (
        <SuggestionMarker
          key={suggestion.place_id}
          suggestion={suggestion}
          onClick={() => setSelectedSuggestion(suggestion)}
        />
      ))}

      {/* Suggestion Info Window */}
      {selectedSuggestion && (
        <InfoWindow
          position={selectedSuggestion.geometry.location}
          onCloseClick={() => setSelectedSuggestion(null)}
          maxWidth={300}
        >
          <SuggestionDetails
            suggestion={selectedSuggestion}
            selectedDate={selectedDate}
            onAdd={(suggestion, date) => {
              onAddSuggestion?.(suggestion, date);
              setSelectedSuggestion(null);
            }}
          />
        </InfoWindow>
      )}

      {/* Control Panel */}
      <SuggestionsControlPanel
        filteredCount={filteredSuggestions.length}
        totalActivities={existingActivities.length}
        filters={filters}
        setFilters={setFilters}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        onRefresh={fetchSuggestions}
        isLoading={isLoading}
      />
    </div>
  );
}

// Sub-components
interface SuggestionMarkerProps {
  suggestion: SuggestedActivity;
  onClick: () => void;
}

function SuggestionMarker({ suggestion, onClick }: SuggestionMarkerProps) {
  return (
    <AdvancedMarker
      position={suggestion.geometry.location}
      onClick={onClick}
      className="cursor-pointer transform transition-transform hover:scale-110"
    >
      <div className="relative">
        <div className="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-xs">
          <Plus className="h-2 w-2 text-yellow-800" />
        </div>
      </div>
    </AdvancedMarker>
  );
}

interface SuggestionDetailsProps {
  suggestion: SuggestedActivity;
  selectedDate?: string;
  onAdd: (suggestion: SuggestedActivity, date?: string) => void;
}

function SuggestionDetails({ suggestion, selectedDate, onAdd }: SuggestionDetailsProps) {
  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return "";
    return "$".repeat(priceLevel);
  };

  const formatTypes = (types: string[]) => {
    return types
      .map((type) => type.replace(/_/g, " ").toLowerCase())
      .map((type) => type.charAt(0).toUpperCase() + type.slice(1))
      .slice(0, 2)
      .join(", ");
  };

  return (
    <div className="p-0 max-w-sm">
      {/* Header */}
      <div className="px-3 py-2 border-b">
        <h3 className="font-semibold text-sm leading-tight text-gray-900 pr-4">{suggestion.name}</h3>
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="line-clamp-1">{suggestion.vicinity}</span>
        </div>
      </div>

      {/* Metadata */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            {formatTypes(suggestion.types)}
          </Badge>

          {suggestion.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{suggestion.rating}</span>
            </div>
          )}

          {suggestion.price_level && (
            <span className="text-xs font-medium text-green-600">{getPriceDisplay(suggestion.price_level)}</span>
          )}
        </div>

        {suggestion.opening_hours && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className={cn("text-xs", suggestion.opening_hours.open_now ? "text-green-600" : "text-red-600")}>
              {suggestion.opening_hours.open_now ? "Open now" : "Closed"}
            </span>
          </div>
        )}
      </div>

      {/* Why Suggested */}
      <div className="mx-3 mb-3 p-2 bg-purple-50 rounded text-xs text-purple-700">
        <div className="flex items-center gap-1 mb-1">
          <Sparkles className="h-3 w-3" />
          <span className="font-medium">Why suggested?</span>
        </div>
        <p className="leading-relaxed">Popular {formatTypes([suggestion.types[0]])} near your planned activities</p>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2">
        <Button
          onClick={() => onAdd(suggestion, selectedDate)}
          className="flex-1 text-xs h-8 bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add to Itinerary
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            const url = `https://www.google.com/maps/place/?q=place_id:${suggestion.place_id}`;
            globalThis.open(url, "_blank");
          }}
          className="text-xs h-8 px-3"
        >
          View on Maps
        </Button>
      </div>
    </div>
  );
}

interface SuggestionsControlPanelProps {
  filteredCount: number;
  totalActivities: number;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

function SuggestionsControlPanel({
  filteredCount,
  totalActivities,
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  onRefresh,
  isLoading,
}: SuggestionsControlPanelProps) {
  return (
    <>
      <Card className="absolute top-4 right-4 z-10 p-3 bg-white/95 backdrop-blur max-w-xs">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-sm">Suggestions</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {filteredCount}
            </Badge>
          </div>

          <div className="text-xs text-gray-600 space-y-1">
            <div>Based on your {totalActivities} activities</div>
            <div>Within {filters.radius}m radius</div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="w-full text-xs">
            <Filter className="h-3 w-3 mr-1" />
            Filters
            <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", showFilters && "rotate-180")} />
          </Button>

          {showFilters && <FilterPanel filters={filters} setFilters={setFilters} onRefresh={onRefresh} />}
        </div>
      </Card>

      {isLoading && (
        <div className="absolute bottom-4 right-4 z-10 bg-white/95 rounded-lg shadow-lg p-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-600 border-t-transparent" />
            Finding suggestions...
          </div>
        </div>
      )}
    </>
  );
}

interface FilterPanelProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  onRefresh: () => void;
}

function FilterPanel({ filters, setFilters, onRefresh }: FilterPanelProps) {
  return (
    <div className="space-y-3 pt-2 border-t">
      {/* Search Category */}
      <div>
        <label className="text-xs font-medium mb-2 block">Search Category</label>
        <select
          value={filters.searchType}
          onChange={(e) =>
            setFilters({
              ...filters,
              searchType: e.target.value as SearchType,
            })
          }
          className="w-full text-xs border rounded px-2 py-1"
        >
          <option value="all">All Types</option>
          <option value="food">🍽️ Food & Dining</option>
          <option value="shopping">🛍️ Shopping</option>
          <option value="historical">🏛️ Historical & Cultural</option>
        </select>
      </div>

      {/* Activity Types */}
      <div>
        <label className="text-xs font-medium mb-2 block">Activity Types</label>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {AVAILABLE_TYPES.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                id={type.value}
                checked={filters.types.includes(type.value)}
                onCheckedChange={(checked: boolean) => {
                  if (checked) {
                    setFilters({
                      ...filters,
                      types: [...filters.types, type.value],
                    });
                  } else {
                    setFilters({
                      ...filters,
                      types: filters.types.filter((t) => t !== type.value),
                    });
                  }
                }}
              />
              <label htmlFor={type.value} className="text-xs flex items-center gap-1">
                <span>{type.emoji}</span>
                <span>{type.label}</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilters({ ...filters, openNow: !filters.openNow })}
          className={cn("text-xs flex-1", filters.openNow && "bg-green-50 border-green-200")}
        >
          {filters.openNow ? "✓ Open Now" : "Open Now"}
        </Button>
        <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs">
          <Zap className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
