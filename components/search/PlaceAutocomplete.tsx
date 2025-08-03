"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Clock, Star } from 'lucide-react';
import { getPlaceAutocomplete } from '@/actions/google/maps';
import { getPlaceDetails } from '@/actions/supabase/places';
import type { Coordinates } from '@/types/database';

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: any) => void;
  placeholder?: string;
  location?: Coordinates;
  radius?: number;
  className?: string;
  disabled?: boolean;
}

interface AutocompleteSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export default function PlaceAutocomplete({
  onPlaceSelect,
  placeholder = "Search for places...",
  location,
  radius = 50000,
  className = "",
  disabled = false
}: PlaceAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const searchPlaces = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await getPlaceAutocomplete(searchQuery, location, radius);
      
      if (result.success) {
        setSuggestions(result.data || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } else {
        console.error("Autocomplete error:", result.error);
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [location, radius]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);
  };

  // Handle place selection
  const handlePlaceSelect = async (suggestion: AutocompleteSuggestion) => {
    setQuery(suggestion.mainText);
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);

    try {
      // Get detailed place information
      const detailsResult = await getPlaceDetails(suggestion.placeId);
      
      if (detailsResult.success) {
        onPlaceSelect({
          ...detailsResult.data,
          placeId: suggestion.placeId,
          mainText: suggestion.mainText,
          secondaryText: suggestion.secondaryText
        });
      } else {
        // Fallback to basic suggestion data
        onPlaceSelect({
          place_id: suggestion.placeId,
          name: suggestion.mainText,
          address: suggestion.secondaryText,
          types: suggestion.types
        });
      }
    } catch (error) {
      console.error("Error getting place details:", error);
      // Fallback to basic suggestion data
      onPlaceSelect({
        place_id: suggestion.placeId,
        name: suggestion.mainText,
        address: suggestion.secondaryText,
        types: suggestion.types
      });
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handlePlaceSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const getPlaceTypeIcon = (types: string[]) => {
    if (types.includes('restaurant') || types.includes('food')) {
      return '🍽️';
    }
    if (types.includes('tourist_attraction') || types.includes('museum')) {
      return '🏛️';
    }
    if (types.includes('lodging')) {
      return '🏨';
    }
    if (types.includes('store') || types.includes('shopping_mall')) {
      return '🛍️';
    }
    return '📍';
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId}
              onClick={() => handlePlaceSelect(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start space-x-3 border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <span className="text-lg mt-0.5">
                {getPlaceTypeIcon(suggestion.types)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {suggestion.mainText}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {suggestion.secondaryText}
                </div>
                {suggestion.types.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {suggestion.types.slice(0, 2).map((type) => (
                      <span
                        key={type}
                        className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                      >
                        {type.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}