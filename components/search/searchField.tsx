import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Utensils, ShoppingCart, Landmark, Loader2, X, Search, MapPin } from "lucide-react";

import { addSearchHistoryItem } from "@/actions/supabase/actions";
import { fetchNearbyActivities, getGoogleMapsAutocomplete } from "@/actions/google/actions";
import { useDebounce } from "@/components/hooks/use-debounce";

import { Input } from "../ui/input";

import { ISearchHistoryItem, useSearchHistoryStore } from "@/store/searchHistoryStore";
import { useMapStore } from "@/store/mapStore";
import { useActivityTabStore } from "@/store/activityTabStore";
import { useActivitiesStore } from "@/store/activityStore";

import { SearchType } from "@/lib/googleMaps/includedTypes";
import { Button } from "../ui/button";

export default function SearchField() {
  const queryClient = useQueryClient();
  const { itineraryId, destinationId } = useParams();

  // **** STORES ****
  const { setSelectedTab } = useActivityTabStore();
  const { addToHistory, selectedSearchQuery, setSelectedSearchQuery } = useSearchHistoryStore();
  const { itineraryCoordinates, centerCoordinates, mapRadius } = useMapStore();
  const { setActivities, isActivitiesLoading, setIsActivitiesLoading, setAreaSearchActivities } = useActivitiesStore();

  // **** STATES ****
  const [autocompleteResults, setAutocompleteResults] = useState<Array<ISearchHistoryItem>>([]);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [mapHasChanged, setMapHasChanged] = useState(false);
  const [searchAreaTimeout, setSearchAreaTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedType, setSelectedType] = useState<SearchType>("all");
  const [isExactSearch, setIsExactSearch] = useState(false);
  const [searchTypeArea, setSearchTypeArea] = useState(false);
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Debounce the search query to reduce API calls
  const debouncedQuery = useDebounce(selectedSearchQuery, 300);

  const searchTypes = useMemo(() => [
    { id: "food", label: "Restaurants & Cafes", icon: <Utensils size={16} /> },
    { id: "shopping", label: "Shopping Places", icon: <ShoppingCart size={16} /> },
    { id: "historical", label: "Historical Sites", icon: <Landmark size={16} /> },
  ], []);

  // **** HANDLERS ****
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedSearchQuery(value);
    setSearchError(null);

    if (!value || value.length === 0) {
      setSearchTypeArea(false);
      setAutocompleteResults([]);
      setIsVisible(false);
      return;
    }
    
    setIsVisible(true);
  }, [setSelectedSearchQuery]);
  
  // Cached autocomplete search function
  const performAutocompleteSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setAutocompleteResults([]);
      return;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsAutocompleteLoading(true);
    setSearchError(null);
    
    try {
      // Caching is now handled inside getGoogleMapsAutocomplete
      const results = await getGoogleMapsAutocomplete(
        query,
        itineraryCoordinates?.[0],
        itineraryCoordinates?.[1],
        3000
      );
      
      if (!abortControllerRef.current?.signal.aborted) {
        setAutocompleteResults(results || []);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Autocomplete search error:', error);
        setSearchError('Search failed. Please try again.');
        setAutocompleteResults([]);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsAutocompleteLoading(false);
      }
    }
  }, [itineraryCoordinates]);
  
  // Effect to trigger autocomplete search when debounced query changes
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      performAutocompleteSearch(debouncedQuery);
    } else {
      setAutocompleteResults([]);
      setIsAutocompleteLoading(false);
    }
  }, [debouncedQuery, performAutocompleteSearch]);

  // **** MUTATIONS ****
  const addSearchHistoryMutation = useMutation({
    mutationFn: async (item: ISearchHistoryItem) => {
      return await addSearchHistoryItem(itineraryId as string, destinationId as string, item.placeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["searchHistoryActivities"] });
    },
  });

  const handleAutocompleteSelect = useCallback(async (item: ISearchHistoryItem) => {
    try {
      setSelectedSearchQuery(item.mainText);
      setIsVisible(false);
      setIsExactSearch(true);
      addToHistory(item);
      setSelectedTab("history");

      if (item.placeId) {
        await addSearchHistoryMutation.mutateAsync(item);
      }
    } catch (error) {
      console.error("Error adding search history item:", error);
      setSearchError("Failed to save search history.");
    }
  }, [setSelectedSearchQuery, addToHistory, setSelectedTab, addSearchHistoryMutation]);

  const handleInputFocus = useCallback(() => {
    setIsVisible(true);
    if (!selectedSearchQuery || selectedSearchQuery.length < 2) {
      setAutocompleteResults([]);
    }
  }, [selectedSearchQuery]);

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      setIsVisible(false);
    }, 150); // Slightly longer delay to allow clicks
  }, []);

  const handleSearchTypeSelect = useCallback(async (type: SearchType = selectedType) => {
    if (!centerCoordinates) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsActivitiesLoading(true);
    setIsVisible(false);
    setIsExactSearch(false);
    setSearchTypeArea(true);
    setSearchError(null);

    const selectedTypeInfo = searchTypes.find((t) => t.id === type);
    if (selectedTypeInfo) {
      setSelectedSearchQuery(selectedTypeInfo.label);
      setSelectedType(type);
    }

    try {
      // Caching is now handled inside fetchNearbyActivities
      const activities = await fetchNearbyActivities(
        centerCoordinates[0], 
        centerCoordinates[1], 
        mapRadius, 
        type
      );
      
      if (!abortControllerRef.current?.signal.aborted) {
        setAreaSearchActivities(activities);
        setSelectedTab("area-search");
        // Reset search type area after successful search
        setTimeout(() => {
          setSearchTypeArea(false);
        }, 500);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error generating activities:", error);
        setSearchError("Failed to search for activities. Please try again.");
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsActivitiesLoading(false);
        // Reset search type area to allow button to reappear on map movement
        setTimeout(() => {
          setSearchTypeArea(false);
        }, 1000);
      }
    }
  }, [centerCoordinates, mapRadius, selectedType, searchTypes, setSelectedSearchQuery, setSelectedType, setAreaSearchActivities, setSelectedTab, setIsActivitiesLoading]);

  // Optimized map change effect with proper cleanup
  useEffect(() => {
    if (searchAreaTimeout) {
      clearTimeout(searchAreaTimeout);
    }

    const timeout = setTimeout(() => {
      setMapHasChanged(true);
    }, 500); // 500ms delay after map movement

    setSearchAreaTimeout(timeout);

    return () => {
      clearTimeout(timeout);
    };
  }, [centerCoordinates, mapRadius]);

  const handleClearSearch = useCallback(() => {
    setSelectedSearchQuery("");
    setAutocompleteResults([]);
    setSearchTypeArea(false);
    setMapHasChanged(false);
    setSearchError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [setSelectedSearchQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Main search container */}
      <div className="relative">
        {/* Search input with icon */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search restaurants, attractions..."
            value={selectedSearchQuery}
            onChange={handleSearchChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className={`w-full pl-10 pr-12 h-12 text-base rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 shadow-sm hover:shadow-md ${
              searchError ? "border-red-300 focus:border-red-500 focus:ring-red-100" : ""
            }`}
          />
          {/* Right side controls */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isAutocompleteLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            )}
            {selectedSearchQuery && (
              <button
                onClick={handleClearSearch}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {searchError && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 z-20 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
              {searchError}
            </div>
          </div>
        )}

        {/* Autocomplete results */}
        {isVisible && (autocompleteResults.length > 0 || isAutocompleteLoading) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto">
            {isAutocompleteLoading && autocompleteResults.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-3" />
                <span className="text-sm text-gray-600 font-medium">Searching places...</span>
              </div>
            ) : (
              <div className="py-2">
                {autocompleteResults.map((result, index) => (
                  <button
                    key={`${result.placeId}-${index}`}
                    onClick={() => handleAutocompleteSelect(result)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">{result.mainText}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{result.secondaryText}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search type buttons */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {searchTypes.map((type) => (
          <Button
            key={type.id}
            variant={selectedType === type.id ? "default" : "outline"}
            size="sm"
            onClick={() => handleSearchTypeSelect(type.id as SearchType)}
            disabled={isActivitiesLoading}
            className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap transition-all ${
              selectedType === type.id 
                ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md" 
                : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className={`${selectedType === type.id ? "text-white" : "text-gray-500"}`}>
              {type.icon}
            </div>
            <span className="hidden sm:inline">{type.label}</span>
          </Button>
        ))}
      </div>

      {/* Search this area button */}
      {mapHasChanged && !searchTypeArea && !isExactSearch && (
        <Button
          variant="default"
          size="sm"
          onClick={() => handleSearchTypeSelect("all")}
          disabled={isActivitiesLoading}
          className="w-full mt-3 h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isActivitiesLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Searching area...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              <span>Search This Area</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}