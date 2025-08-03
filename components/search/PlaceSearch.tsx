"use client";

import React, { useState } from 'react';
import { Search, Filter, MapPin, Star, Clock, Globe, Phone } from 'lucide-react';
import { searchPlacesByText, getNearbyPlaces } from '@/actions/google/maps';
import { searchPlaces } from '@/actions/supabase/places';
import PlaceAutocomplete from './PlaceAutocomplete';
import type { Coordinates } from '@/types/database';

interface PlaceSearchProps {
  onPlaceSelect: (place: any) => void;
  location?: Coordinates;
  className?: string;
  showFilters?: boolean;
}

interface SearchFilters {
  type: string;
  radius: number;
  priceLevel: string;
  rating: number;
}

const PLACE_TYPES = [
  { value: '', label: 'All Places' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'tourist_attraction', label: 'Attractions' },
  { value: 'lodging', label: 'Hotels' },
  { value: 'shopping_mall', label: 'Shopping' },
  { value: 'museum', label: 'Museums' },
  { value: 'park', label: 'Parks' },
  { value: 'church', label: 'Religious Sites' },
  { value: 'night_club', label: 'Nightlife' },
];

const RADIUS_OPTIONS = [
  { value: 1000, label: '1 km' },
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
  { value: 25000, label: '25 km' },
  { value: 50000, label: '50 km' },
];

export default function PlaceSearch({
  onPlaceSelect,
  location,
  className = "",
  showFilters = true
}: PlaceSearchProps) {
  const [searchMode, setSearchMode] = useState<'autocomplete' | 'text' | 'nearby'>('autocomplete');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    type: '',
    radius: 10000,
    priceLevel: '',
    rating: 0
  });

  const handleTextSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      let result;
      
      if (searchMode === 'text') {
        result = await searchPlacesByText(searchQuery, location, filters.radius);
      } else {
        // Fallback to database search
        result = await searchPlaces(searchQuery, location);
      }

      if (result.success) {
        let results = result.data || [];
        
        // Apply filters
        if (filters.type) {
          results = results.filter((place: any) => 
            place.types?.includes(filters.type)
          );
        }
        
        if (filters.rating > 0) {
          results = results.filter((place: any) => 
            place.rating && place.rating >= filters.rating
          );
        }
        
        if (filters.priceLevel) {
          results = results.filter((place: any) => 
            place.price_level === filters.priceLevel
          );
        }

        setSearchResults(results);
      } else {
        console.error("Search error:", result.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNearbySearch = async () => {
    if (!location) {
      alert("Location is required for nearby search");
      return;
    }

    setIsLoading(true);
    try {
      const result = await getNearbyPlaces(location, filters.radius, filters.type);
      
      if (result.success) {
        let results = result.data || [];
        
        // Apply additional filters
        if (filters.rating > 0) {
          results = results.filter((place: any) => 
            place.rating && place.rating >= filters.rating
          );
        }

        setSearchResults(results);
      } else {
        console.error("Nearby search error:", result.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Nearby search failed:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSearch();
    }
  };

  const formatRating = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        <Star className="h-4 w-4 text-yellow-400 fill-current" />
        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const formatTypes = (types: string[]) => {
    return types
      .slice(0, 2)
      .map(type => type.replace(/_/g, ' '))
      .join(', ');
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Search Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6 py-3">
          <button
            onClick={() => setSearchMode('autocomplete')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              searchMode === 'autocomplete'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Autocomplete
          </button>
          <button
            onClick={() => setSearchMode('text')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              searchMode === 'text'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Text Search
          </button>
          <button
            onClick={() => setSearchMode('nearby')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              searchMode === 'nearby'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            disabled={!location}
          >
            Nearby
          </button>
        </nav>
      </div>

      <div className="p-6">
        {searchMode === 'autocomplete' && (
          <PlaceAutocomplete
            onPlaceSelect={onPlaceSelect}
            location={location}
            radius={filters.radius}
            placeholder="Search for places with autocomplete..."
            className="mb-4"
          />
        )}

        {(searchMode === 'text' || searchMode === 'nearby') && (
          <>
            {/* Search Input and Filters */}
            <div className="flex space-x-2 mb-4">
              {searchMode === 'text' && (
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search for places..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              )}
              
              {showFilters && (
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={`px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 hover:bg-gray-50 ${
                    showFilterPanel ? 'bg-gray-50' : ''
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                </button>
              )}
              
              <button
                onClick={searchMode === 'text' ? handleTextSearch : handleNearbySearch}
                disabled={isLoading || (searchMode === 'text' && !searchQuery.trim())}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span>{isLoading ? 'Searching...' : 'Search'}</span>
              </button>
            </div>

            {/* Filter Panel */}
            {showFilterPanel && showFilters && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Place Type
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {PLACE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Radius
                    </label>
                    <select
                      value={filters.radius}
                      onChange={(e) => setFilters(prev => ({ ...prev, radius: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {RADIUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Rating
                    </label>
                    <select
                      value={filters.rating}
                      onChange={(e) => setFilters(prev => ({ ...prev, rating: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={0}>Any Rating</option>
                      <option value={3}>3+ Stars</option>
                      <option value={4}>4+ Stars</option>
                      <option value={4.5}>4.5+ Stars</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Level
                    </label>
                    <select
                      value={filters.priceLevel}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceLevel: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Any Price</option>
                      <option value="PRICE_LEVEL_INEXPENSIVE">$</option>
                      <option value="PRICE_LEVEL_MODERATE">$$</option>
                      <option value="PRICE_LEVEL_EXPENSIVE">$$$</option>
                      <option value="PRICE_LEVEL_VERY_EXPENSIVE">$$$$</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Search Results ({searchResults.length})
                </h3>
                <div className="grid gap-4">
                  {searchResults.map((place, index) => (
                    <button
                      key={place.place_id || index}
                      onClick={() => onPlaceSelect(place)}
                      className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{place.name}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 truncate">
                              {place.address || place.formatted_address}
                            </span>
                          </div>
                          {place.types && place.types.length > 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              {formatTypes(place.types)}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2">
                            {place.rating && formatRating(place.rating)}
                            {place.phone_number && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{place.phone_number}</span>
                              </div>
                            )}
                            {place.website_url && (
                              <div className="flex items-center space-x-1">
                                <Globe className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-blue-600">Website</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchResults.length === 0 && !isLoading && (searchMode === 'text' ? searchQuery : true) && (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No places found. Try adjusting your search or filters.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}