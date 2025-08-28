"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { Search, Filter, MapPin, Star, Clock, Globe, Phone } from "lucide-react";
import { searchPlacesByText, fetchNearbyActivities } from "@/actions/google/actions";
import { cachedSearch } from "@/lib/cache/searchCache";
import { useDebounce } from "@/components/hooks/use-debounce";
import PlaceAutocomplete from "./PlaceAutocomplete";
import type { Coordinates } from "@/types/database";

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
  { value: "", label: "All Places" },
  { value: "restaurant", label: "Restaurants" },
  { value: "tourist_attraction", label: "Attractions" },
  { value: "lodging", label: "Hotels" },
  { value: "shopping_mall", label: "Shopping" },
  { value: "museum", label: "Museums" },
  { value: "park", label: "Parks" },
  { value: "church", label: "Religious Sites" },
  { value: "night_club", label: "Nightlife" },
];

const RADIUS_OPTIONS = [
  { value: 1000, label: "1 km" },
  { value: 5000, label: "5 km" },
  { value: 10000, label: "10 km" },
  { value: 25000, label: "25 km" },
  { value: 50000, label: "50 km" },
];

export default function PlaceSearch({ onPlaceSelect, location, className = "", showFilters = true }: PlaceSearchProps) {
  const [searchMode, setSearchMode] = useState<"autocomplete" | "text" | "nearby">("autocomplete");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search query to reduce API calls
  const debouncedQuery = useDebounce(searchQuery, 500);

  const [filters, setFilters] = useState<SearchFilters>({
    type: "",
    radius: 10000,
    priceLevel: "",
    rating: 0,
  });

  const handleTextSearch = useCallback(
    async (queryOverride?: string) => {
      const query = queryOverride || debouncedQuery;
      if (!query.trim()) return;

      // Cancel previous request if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setSearchError(null);

      try {
        // Generate cache key for this search
        const cacheKey = `textSearch:${query.toLowerCase()}:${location?.lat || 'no-lat'}:${location?.lng || 'no-lng'}:${filters.radius}`;

        const result = await cachedSearch(
          cacheKey,
          async () => {
            if (location) {
              return await searchPlacesByText(query, location.lat, location.lng, filters.radius);
            } else {
              throw new Error("Location is required for search");
            }
          },
          10 * 60 * 1000 // 10 minute cache
        );

        if (abortControllerRef.current?.signal.aborted) return;

        // The result is already the activities array from our API
        let results = Array.isArray(result) ? result : [];

        // Apply filters
        results = applyFilters(results, filters);
        setSearchResults(results);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Search failed:", error);
          setSearchError("Search failed. Please try again.");
          setSearchResults([]);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [debouncedQuery, location, filters, searchMode]
  );

  const handleNearbySearch = useCallback(async () => {
    if (!location) {
      setSearchError("Location is required for nearby search");
      return;
    }

    // Cancel previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setSearchError(null);

    try {
      // Generate cache key for nearby search
      const cacheKey = `nearby:${location.lat.toFixed(4)},${location.lng.toFixed(4)}:${filters.radius}:${filters.type || 'all'}`;

      const result = await cachedSearch(
        cacheKey,
        () => fetchNearbyActivities(location.lng, location.lat, filters.radius, filters.type as any),
        15 * 60 * 1000 // 15 minute cache for nearby results
      );

      if (abortControllerRef.current?.signal.aborted) return;

      // The result is already the activities array from our API
      let results = Array.isArray(result) ? result : [];

      // Apply additional filters
      results = applyFilters(results, filters);
      setSearchResults(results);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Nearby search failed:", error);
        setSearchError("Nearby search failed. Please try again.");
        setSearchResults([]);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [location, filters]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
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

  // Memoized helper functions
  const applyFilters = useMemo(() => {
    return (results: any[], filters: SearchFilters) => {
      return results.filter((place: any) => {
        // Type filter
        if (filters.type && !place.types?.includes(filters.type)) {
          return false;
        }

        // Rating filter
        if (filters.rating > 0 && (!place.rating || place.rating < filters.rating)) {
          return false;
        }

        // Price level filter
        if (filters.priceLevel && place.price_level !== filters.priceLevel) {
          return false;
        }

        return true;
      });
    };
  }, []);

  const formatTypes = useMemo(() => {
    return (types: string[]) => {
      return types
        .slice(0, 2)
        .map((type) => type.replace(/_/g, " "))
        .join(", ");
    };
  }, []);

  // Auto-search when debounced query changes
  React.useEffect(() => {
    if (searchMode === "text" && debouncedQuery.trim().length >= 2) {
      handleTextSearch();
    }
  }, [debouncedQuery, handleTextSearch, searchMode]);

  // Cleanup abort controller on unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Search Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6 py-3">
          <button
            onClick={() => setSearchMode("autocomplete")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              searchMode === "autocomplete"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Autocomplete
          </button>
          <button
            onClick={() => setSearchMode("text")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              searchMode === "text"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Text Search
          </button>
          <button
            onClick={() => setSearchMode("nearby")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              searchMode === "nearby"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            disabled={!location}
          >
            Nearby
          </button>
        </nav>
      </div>

      <div className="p-6">
        {searchMode === "autocomplete" && (
          <PlaceAutocomplete
            onPlaceSelect={onPlaceSelect}
            location={location}
            radius={filters.radius}
            placeholder="Search for places with autocomplete..."
            className="mb-4"
          />
        )}

        {(searchMode === "text" || searchMode === "nearby") && (
          <>
            {/* Search Input and Filters */}
            <div className="flex space-x-2 mb-4">
              {searchMode === "text" && (
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
                    showFilterPanel ? "bg-gray-50" : ""
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                </button>
              )}

              <button
                onClick={() => (searchMode === "text" ? handleTextSearch() : handleNearbySearch())}
                disabled={isLoading || (searchMode === "text" && !searchQuery.trim())}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span>{isLoading ? "Searching..." : "Search"}</span>
              </button>
            </div>

            {/* Filter Panel */}
            {showFilterPanel && showFilters && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Place Type</label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {PLACE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Radius</label>
                    <select
                      value={filters.radius}
                      onChange={(e) => setFilters((prev) => ({ ...prev, radius: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {RADIUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
                    <select
                      value={filters.rating}
                      onChange={(e) => setFilters((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={0}>Any Rating</option>
                      <option value={3}>3+ Stars</option>
                      <option value={4}>4+ Stars</option>
                      <option value={4.5}>4.5+ Stars</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Level</label>
                    <select
                      value={filters.priceLevel}
                      onChange={(e) => setFilters((prev) => ({ ...prev, priceLevel: e.target.value }))}
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
                <h3 className="text-lg font-medium text-gray-900">Search Results ({searchResults.length})</h3>
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
                            <p className="text-sm text-gray-500 mt-1">{formatTypes(place.types)}</p>
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

            {/* Error State */}
            {searchError && (
              <div className="text-center py-8 text-red-500">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium">Search Error</p>
                  <p className="text-sm mt-1">{searchError}</p>
                  <button
                    onClick={() => {
                      setSearchError(null);
                      if (searchMode === "text") {
                        handleTextSearch();
                      } else {
                        handleNearbySearch();
                      }
                    }}
                    className="mt-2 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!searchError &&
              searchResults.length === 0 &&
              !isLoading &&
              (searchMode === "text" ? debouncedQuery : true) && (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No places found. Try adjusting your search or filters.</p>
                  {searchMode === "text" && debouncedQuery && (
                    <p className="text-sm mt-2 text-gray-400">Searched for: &quot;{debouncedQuery}&quot;</p>
                  )}
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}
