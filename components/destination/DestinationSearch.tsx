"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geocodeAddress, getPlaceAutocomplete } from "@/actions/google/maps";

interface Destination {
  id: string;
  name: string;
  country: string;
  city: string;
  formatted_address: string;
  place_id: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timezone: string;
  photos?: string[];
  description?: string;
}

interface DestinationSearchProps {
  onDestinationSelect: (destination: Destination) => void;
  onBack: () => void;
}

type DestinationSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  types?: string[];
};

export default function DestinationSearch({ onDestinationSelect, onBack }: DestinationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DestinationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem("journey-recent-destinations");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading recent searches:", e);
      }
    }
  }, []);

  useEffect(() => {
    // Auto-focus search input
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const searchDestinations = async () => {
      if (query.length < 2) {
        setResults([]);
        setSearchError(null);
        return;
      }

      setLoading(true);
      setSearchError(null);
      try {
        // Use Google Places Autocomplete (via server action) so we can suggest any city worldwide.
        const response = await getPlaceAutocomplete(query);
        if (response.success && response.data) {
          setResults(response.data as DestinationSuggestion[]);
        } else {
          setResults([]);
          setSearchError("Search is temporarily unavailable. Please try again.");
        }
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
        setSearchError("Search is temporarily unavailable. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchDestinations, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleDestinationSelect = async (suggestion: DestinationSuggestion) => {
    setLoading(true);
    try {
      const lookup = `${suggestion.mainText}, ${suggestion.secondaryText}`.trim();

      // Geocode to get coordinates + canonical formatted address.
      const geocodeResponse = await geocodeAddress(lookup);
      
      if (geocodeResponse.success && geocodeResponse.data) {
        const formattedAddress = geocodeResponse.data.formatted_address;
        const destination: Destination = {
          id: geocodeResponse.data.place_id,
          name: suggestion.mainText,
          city: suggestion.mainText,
          country: extractCountry(formattedAddress),
          formatted_address: formattedAddress,
          place_id: geocodeResponse.data.place_id,
          coordinates: geocodeResponse.data.coordinates,
          timezone: "",
          photos: [],
        };

        // Save to recent searches
        const updatedRecent = [
          formattedAddress,
          ...recentSearches.filter(item => item !== formattedAddress)
        ].slice(0, 5);
        
        setRecentSearches(updatedRecent);
        localStorage.setItem("journey-recent-destinations", JSON.stringify(updatedRecent));

        onDestinationSelect(destination);
      }
    } catch (error) {
      console.error("Error selecting destination:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecentSearch = (search: string) => {
    setQuery(search);
  };

  const extractCountry = (address: string): string => {
    const parts = address.split(", ");
    return parts[parts.length - 1] || "";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchRef}
              type="text"
              placeholder="Search for cities, countries, or landmarks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 border-gray-300 focus:border-blue-400"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
            )}
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-auto">
        {query.length >= 2 ? (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Search Results</h3>
            <div className="space-y-2">
              {searchError && !loading ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">{searchError}</p>
                </div>
              ) : results.length > 0 ? (
                results.map((place, index) => (
                  <motion.button
                    key={place.placeId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    onClick={() => handleDestinationSelect(place)}
                    className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                    disabled={loading}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <MapPin className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{place.mainText}</div>
                        <div className="text-sm text-gray-500 truncate">{place.secondaryText}</div>
                      </div>
                    </div>
                  </motion.button>
                ))
              ) : !loading ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No destinations found</p>
                  <p className="text-sm text-gray-400">Try adjusting your search terms</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Recent Searches
                </h3>
                <div className="space-y-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearch(search)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <Clock className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{search}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Tips */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Search Tips</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Try searching for specific cities like &ldquo;Paris&rdquo; or &ldquo;Tokyo&rdquo;</li>
                <li>• Include country names for better results: &ldquo;Rome, Italy&rdquo;</li>
                <li>• Search for landmarks: &ldquo;Eiffel Tower&rdquo; or &ldquo;Times Square&rdquo;</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
