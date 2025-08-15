"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Star, 
  Clock, 
  Plus, 
  X, 
  Filter,
  ChevronDown,
  Sparkles,
  Target,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

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
  plus_code?: {
    compound_code: string;
    global_code: string;
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
  };
}

interface LocationSuggestionsProps {
  existingActivities: ItineraryActivity[];
  mapCenter: { lat: number; lng: number };
  selectedDate?: string;
  onAddSuggestion?: (activity: SuggestedActivity, date?: string) => void;
  className?: string;
}

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
  const [filters, setFilters] = useState({
    types: [] as string[],
    minRating: 0,
    maxPriceLevel: 4,
    openNow: false,
    radius: 2000, // meters
  });

  // Available activity types for filtering
  const availableTypes = [
    { value: 'restaurant', label: 'Restaurants', emoji: '🍽️' },
    { value: 'tourist_attraction', label: 'Attractions', emoji: '🏛️' },
    { value: 'museum', label: 'Museums', emoji: '🎨' },
    { value: 'park', label: 'Parks', emoji: '🌳' },
    { value: 'shopping_mall', label: 'Shopping', emoji: '🛍️' },
    { value: 'cafe', label: 'Cafes', emoji: '☕' },
    { value: 'bar', label: 'Bars', emoji: '🍺' },
    { value: 'church', label: 'Religious Sites', emoji: '⛪' },
    { value: 'amusement_park', label: 'Entertainment', emoji: '🎢' },
    { value: 'spa', label: 'Wellness', emoji: '🧖‍♀️' },
  ];

  // Get suggestions based on existing activities and preferences
  const fetchSuggestions = async () => {
    setIsLoading(true);
    
    try {
      // In a real implementation, this would call Google Places API
      // For now, we'll simulate suggestions based on existing activities
      const mockSuggestions = generateMockSuggestions();
      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Failed to fetch location suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate contextual suggestions based on existing activities
  const generateMockSuggestions = (): SuggestedActivity[] => {
    const existingTypes = new Set(
      existingActivities.flatMap(a => a.activity?.types || [])
    );

    // Suggest complementary activities
    const suggestions: SuggestedActivity[] = [];

    // If user has restaurants, suggest attractions nearby
    if (existingTypes.has('restaurant')) {
      suggestions.push({
        place_id: 'suggestion_1',
        name: 'Historic Art Museum',
        vicinity: 'Downtown District',
        rating: 4.5,
        price_level: 2,
        types: ['museum', 'tourist_attraction'],
        geometry: {
          location: {
            lat: mapCenter.lat + 0.002,
            lng: mapCenter.lng + 0.002
          }
        },
        opening_hours: { open_now: true }
      });
    }

    // If user has attractions, suggest nearby restaurants
    if (existingTypes.has('tourist_attraction') || existingTypes.has('museum')) {
      suggestions.push({
        place_id: 'suggestion_2',
        name: 'Local Bistro & Wine Bar',
        vicinity: 'Arts Quarter',
        rating: 4.3,
        price_level: 3,
        types: ['restaurant', 'bar'],
        geometry: {
          location: {
            lat: mapCenter.lat - 0.001,
            lng: mapCenter.lng + 0.003
          }
        },
        opening_hours: { open_now: true }
      });
    }

    // Always suggest popular local activities
    suggestions.push(
      {
        place_id: 'suggestion_3',
        name: 'Central Park & Gardens',
        vicinity: 'City Center',
        rating: 4.7,
        price_level: 0,
        types: ['park', 'tourist_attraction'],
        geometry: {
          location: {
            lat: mapCenter.lat + 0.004,
            lng: mapCenter.lng - 0.002
          }
        },
        opening_hours: { open_now: true }
      },
      {
        place_id: 'suggestion_4',
        name: 'Artisan Coffee Roasters',
        vicinity: 'Riverside',
        rating: 4.4,
        price_level: 2,
        types: ['cafe', 'store'],
        geometry: {
          location: {
            lat: mapCenter.lat - 0.003,
            lng: mapCenter.lng - 0.001
          }
        },
        opening_hours: { open_now: true }
      },
      {
        place_id: 'suggestion_5',
        name: 'Weekend Farmers Market',
        vicinity: 'Market Square',
        rating: 4.2,
        price_level: 1,
        types: ['shopping_mall', 'food'],
        geometry: {
          location: {
            lat: mapCenter.lat + 0.001,
            lng: mapCenter.lng - 0.004
          }
        },
        opening_hours: { open_now: false }
      }
    );

    return suggestions;
  };

  // Filter suggestions based on current filters
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(suggestion => {
      // Type filter
      if (filters.types.length > 0) {
        const hasMatchingType = suggestion.types.some(type => 
          filters.types.includes(type)
        );
        if (!hasMatchingType) return false;
      }

      // Rating filter
      if (suggestion.rating && suggestion.rating < filters.minRating) {
        return false;
      }

      // Price level filter
      if (suggestion.price_level && suggestion.price_level > filters.maxPriceLevel) {
        return false;
      }

      // Open now filter
      if (filters.openNow && !suggestion.opening_hours?.open_now) {
        return false;
      }

      return true;
    });
  }, [suggestions, filters]);

  // Fetch suggestions when center changes or component mounts
  useEffect(() => {
    fetchSuggestions();
  }, [mapCenter, existingActivities]);

  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return '';
    return '$'.repeat(priceLevel);
  };

  const getActivityIcon = (types: string[]) => {
    const type = types[0];
    const typeInfo = availableTypes.find(t => t.value === type);
    return typeInfo?.emoji || '📍';
  };

  const formatTypes = (types: string[]) => {
    return types
      .map(type => type.replace(/_/g, ' ').toLowerCase())
      .map(type => type.charAt(0).toUpperCase() + type.slice(1))
      .join(', ');
  };

  return (
    <div className={cn("relative", className)}>
      {/* Suggestion Markers */}
      {filteredSuggestions.map((suggestion) => (
        <AdvancedMarker
          key={suggestion.place_id}
          position={suggestion.geometry.location}
          onClick={() => setSelectedSuggestion(suggestion)}
          className="cursor-pointer transform transition-transform hover:scale-110"
        >
          <div className="relative">
            {/* Suggestion Marker */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            
            {/* Suggestion Badge */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-xs">
              <Plus className="h-2 w-2 text-yellow-800" />
            </div>
          </div>
        </AdvancedMarker>
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
            onClose={() => setSelectedSuggestion(null)}
          />
        </InfoWindow>
      )}

      {/* Suggestions Control Panel */}
      <Card className="absolute top-4 right-4 z-10 p-3 bg-white/95 backdrop-blur max-w-xs">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-sm">Suggestions</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {filteredSuggestions.length}
            </Badge>
          </div>

          {/* Quick Stats */}
          <div className="text-xs text-gray-600 space-y-1">
            <div>Based on your {existingActivities.length} activities</div>
            <div>Within {filters.radius}m radius</div>
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full text-xs"
          >
            <Filter className="h-3 w-3 mr-1" />
            Filters
            <ChevronDown className={cn(
              "h-3 w-3 ml-1 transition-transform",
              showFilters && "rotate-180"
            )} />
          </Button>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-3 pt-2 border-t">
              {/* Activity Types */}
              <div>
                <label className="text-xs font-medium mb-2 block">Activity Types</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {availableTypes.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={filters.types.includes(type.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters(prev => ({
                              ...prev,
                              types: [...prev.types, type.value]
                            }));
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              types: prev.types.filter(t => t !== type.value)
                            }));
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
                  className={cn(
                    "text-xs flex-1",
                    filters.openNow && "bg-green-50 border-green-200"
                  )}
                >
                  {filters.openNow ? '✓ Open Now' : 'Open Now'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchSuggestions}
                  className="text-xs"
                >
                  <Zap className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute bottom-4 right-4 z-10 bg-white/95 rounded-lg shadow-lg p-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-600 border-t-transparent" />
            Finding suggestions...
          </div>
        </div>
      )}
    </div>
  );
}

// Suggestion details component
interface SuggestionDetailsProps {
  suggestion: SuggestedActivity;
  selectedDate?: string;
  onAdd: (suggestion: SuggestedActivity, date?: string) => void;
  onClose: () => void;
}

function SuggestionDetails({ suggestion, selectedDate, onAdd, onClose }: SuggestionDetailsProps) {
  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return '';
    return '$'.repeat(priceLevel);
  };

  const formatTypes = (types: string[]) => {
    return types
      .map(type => type.replace(/_/g, ' ').toLowerCase())
      .map(type => type.charAt(0).toUpperCase() + type.slice(1))
      .slice(0, 2)
      .join(', ');
  };

  return (
    <div className="p-2 space-y-3 max-w-sm">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-base leading-tight text-gray-900">
            {suggestion.name}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-auto"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{suggestion.vicinity}</span>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-3">
        {/* Category */}
        <Badge variant="secondary" className="text-xs">
          {formatTypes(suggestion.types)}
        </Badge>
        
        {/* Rating */}
        {suggestion.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{suggestion.rating}</span>
          </div>
        )}
        
        {/* Price */}
        {suggestion.price_level && (
          <div className="flex items-center gap-1 text-green-600">
            <span className="text-sm font-medium">
              {getPriceDisplay(suggestion.price_level)}
            </span>
          </div>
        )}
      </div>

      {/* Opening Hours */}
      {suggestion.opening_hours && (
        <div className="flex items-center gap-2 text-xs">
          <Clock className="h-3 w-3" />
          <span className={cn(
            suggestion.opening_hours.open_now ? "text-green-600" : "text-red-600"
          )}>
            {suggestion.opening_hours.open_now ? 'Open now' : 'Closed'}
          </span>
        </div>
      )}

      {/* Why Suggested */}
      <div className="p-2 bg-purple-50 rounded text-xs text-purple-700">
        <div className="flex items-center gap-1 mb-1">
          <Sparkles className="h-3 w-3" />
          <span className="font-medium">Why suggested?</span>
        </div>
        <p>Popular {formatTypes([suggestion.types[0]])} near your planned activities</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          onClick={() => onAdd(suggestion, selectedDate)}
          className="flex-1 text-xs bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add to Itinerary
        </Button>
        
        <Button
          variant="outline"
          onClick={() => {
            const url = `https://www.google.com/maps/place/?q=place_id:${suggestion.place_id}`;
            window.open(url, '_blank');
          }}
          className="text-xs"
        >
          View on Maps
        </Button>
      </div>
    </div>
  );
}