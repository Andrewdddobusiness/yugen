import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Utensils, ShoppingCart, Landmark, Loader2, X } from "lucide-react";

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
    setMapHasChanged(false);
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
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error generating activities:", error);
        setSearchError("Failed to search for activities. Please try again.");
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsActivitiesLoading(false);
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
    <div className="flex flex-col gap-2 mt-2 relative">
      <div className="relative w-full">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for places..."
          value={selectedSearchQuery}
          onChange={handleSearchChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className={`w-64 rounded-lg md:w-64 lg:w-[336px] ${
            isActivitiesLoading || selectedSearchQuery || isAutocompleteLoading ? "pr-16" : ""
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isAutocompleteLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
          {selectedSearchQuery && (
            <button
              onClick={handleClearSearch}
              className="p-1 hover:bg-gray-100 rounded-full"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Error message */}
        {searchError && (
          <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 z-20">
            {searchError}
          </div>
        )}

        {/* Autocomplete results */}
        {isVisible && (autocompleteResults.length > 0 || isAutocompleteLoading) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            {isAutocompleteLoading && autocompleteResults.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500 mr-2" />
                <span className="text-sm text-gray-500">Searching...</span>
              </div>
            ) : (
              autocompleteResults.map((result, index) => (
                <button
                  key={`${result.placeId}-${index}`}
                  onClick={() => handleAutocompleteSelect(result)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-sm">{result.mainText}</div>
                  <div className="text-xs text-gray-500 mt-1">{result.secondaryText}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Search type buttons */}
      <div className="flex gap-1">
        {searchTypes.map((type) => (
          <Button
            key={type.id}
            variant={selectedType === type.id ? "default" : "outline"}
            size="sm"
            onClick={() => handleSearchTypeSelect(type.id as SearchType)}
            disabled={isActivitiesLoading}
            className="flex items-center gap-1 text-xs"
          >
            {type.icon}
            <span className="hidden sm:inline">{type.label}</span>
          </Button>
        ))}
      </div>

      {/* Search this area button */}
      {mapHasChanged && !searchTypeArea && !isExactSearch && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleSearchTypeSelect("all")}
          disabled={isActivitiesLoading}
          className="w-full"
        >
          {isActivitiesLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching...
            </>
          ) : (
            "Search This Area"
          )}
        </Button>
      )}
    </div>
  );
}