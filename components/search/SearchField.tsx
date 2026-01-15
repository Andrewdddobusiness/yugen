import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Utensils, ShoppingCart, Landmark, Loader2, X, Search, MapPin } from "lucide-react";

import { addSearchHistoryItem } from "@/actions/supabase/actions";
import { fetchNearbyActivities, getGoogleMapsAutocomplete, searchPlacesByText } from "@/actions/google/actions";
import { useDebounce } from "@/components/hooks/use-debounce";

import { Input } from "../ui/input";

import { ISearchHistoryItem, useSearchHistoryStore } from "@/store/searchHistoryStore";
import { useMapStore } from "@/store/mapStore";
import { useActivityTabStore } from "@/store/activityTabStore";
import { useActivitiesStore } from "@/store/activityStore";

import { SearchType } from "@/lib/googleMaps/includedTypes";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export default function SearchField() {
  const queryClient = useQueryClient();
  const { itineraryId, destinationId } = useParams();

  // **** STORES ****
  const { setSelectedTab } = useActivityTabStore();
  const { addToHistory, selectedSearchQuery, setSelectedSearchQuery } = useSearchHistoryStore();
  const { itineraryCoordinates, centerCoordinates, mapRadius } = useMapStore();
  const { isActivitiesLoading, setIsActivitiesLoading, setAreaSearchActivities } = useActivitiesStore();

  // **** STATES ****
  const [autocompleteResults, setAutocompleteResults] = useState<Array<ISearchHistoryItem>>([]);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [mapHasChanged, setMapHasChanged] = useState(false);
  const searchAreaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedType, setSelectedType] = useState<SearchType>("all");
  const [isExactSearch, setIsExactSearch] = useState(false);
  const [searchTypeArea, setSearchTypeArea] = useState(false);
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the search query to reduce API calls
  const debouncedQuery = useDebounce(selectedSearchQuery, 300);

  const searchTypes = useMemo(
    () => [
      { id: "food", label: "Restaurants & Cafes", icon: <Utensils size={16} /> },
      { id: "shopping", label: "Shopping Places", icon: <ShoppingCart size={16} /> },
      { id: "historical", label: "Historical Sites", icon: <Landmark size={16} /> },
    ],
    []
  );

  // **** HANDLERS ****
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSelectedSearchQuery(value);
      setSearchError(null);

      if (!value || value.length === 0) {
        setSearchTypeArea(false);
        setAutocompleteResults([]);
        setIsVisible(false);
        setSelectedType("all"); // Reset the selected type when input is cleared
        setIsExactSearch(false);
        return;
      }

      setIsVisible(true);
    },
    [setSelectedSearchQuery]
  );

  // Cached autocomplete search function
  const performAutocompleteSearch = useCallback(
    async (query: string) => {
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
        if (error.name !== "AbortError") {
          console.error("Autocomplete search error:", error);
          setSearchError("Search failed. Please try again.");
          setAutocompleteResults([]);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsAutocompleteLoading(false);
        }
      }
    },
    [itineraryCoordinates]
  );

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

  const handleTextSearch = useCallback(
    async (query: string) => {
      if (!centerCoordinates || !query.trim()) return;

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
      setSelectedSearchQuery(query);

      try {
        let activities: any[] = [];

        try {
          // Try proper Text Search API first
          activities = await searchPlacesByText(
            query,
            centerCoordinates[0], // latitude
            centerCoordinates[1], // longitude
            mapRadius
          );
        } catch (textSearchError: any) {
          console.warn("Text Search API failed, falling back to nearby search with filtering:", textSearchError);
          
          // Fallback to nearby search with client-side filtering
          const keyword = query.toLowerCase().trim();
          
          // Determine the best search type based on keyword
          let searchType: SearchType = "all";
          if (
            keyword.includes("restaurant") ||
            keyword.includes("food") ||
            keyword.includes("eat") ||
            keyword.includes("japanese") ||
            keyword.includes("italian") ||
            keyword.includes("chinese") ||
            keyword.includes("korean") ||
            keyword.includes("thai") ||
            keyword.includes("indian") ||
            keyword.includes("pizza") ||
            keyword.includes("burger") ||
            keyword.includes("sushi") ||
            keyword.includes("ramen") ||
            keyword.includes("noodle") ||
            keyword.includes("cuisine") ||
            keyword.includes("cafe") ||
            keyword.includes("coffee") ||
            keyword.includes("bar") ||
            keyword.includes("bakery") ||
            keyword.includes("bistro") ||
            keyword.includes("grill")
          ) {
            searchType = "food";
          }

          // Get nearby activities of the relevant type
          const allActivities = await fetchNearbyActivities(
            centerCoordinates[0],
            centerCoordinates[1],
            mapRadius,
            searchType
          );

          // Filter activities by keyword
          const normalizeText = (text: string): string => {
            return text
              .toLowerCase()
              .replace(/['''`]/g, "") // Remove apostrophes and quotes
              .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
              .replace(/\s+/g, " ") // Collapse multiple spaces
              .trim();
          };

          const normalizedKeyword = normalizeText(keyword);
          
          activities = allActivities
            .map((activity: any) => {
              const name = activity.name?.toLowerCase() || "";
              const normalizedName = normalizeText(activity.name || "");
              const description = activity.description?.toLowerCase() || "";
              const normalizedDescription = normalizeText(activity.description || "");
              const types = Array.isArray(activity.types) ? activity.types.join(" ").toLowerCase() : "";

              let score = 0;

              // Exact name match gets highest score
              if (name.includes(keyword)) score += 10;

              // Flexible normalized matching for names (handles punctuation)
              if (normalizedName.includes(normalizedKeyword)) score += 12;

              // Word-based matching
              const keywordWords = normalizedKeyword.split(" ").filter((w) => w.length > 0);
              const nameWords = normalizedName.split(" ").filter((w) => w.length > 0);

              const wordsMatched = keywordWords.filter((kw) =>
                nameWords.some((nw) => nw.includes(kw) || kw.includes(nw))
              );

              if (wordsMatched.length === keywordWords.length && keywordWords.length > 0) {
                score += 8;
              } else if (wordsMatched.length > 0) {
                score += 4 * wordsMatched.length;
              }

              // Type and description matching
              if (types.includes(keyword)) score += 8;
              if (description.includes(keyword)) score += 5;
              if (normalizedDescription.includes(normalizedKeyword)) score += 6;

              return { ...activity, score };
            })
            .filter((activity) => activity.score > 0)
            .sort((a, b) => b.score - a.score);
        }

        if (!abortControllerRef.current?.signal.aborted) {
          setAreaSearchActivities(activities);
          setSelectedTab("area-search");
          // Reset search type area after successful search
          setTimeout(() => {
            setSearchTypeArea(false);
          }, 500);
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error searching for text:", error);
          setSearchError(`Failed to search for "${query}". Please try again.`);
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
    },
    [
      centerCoordinates,
      mapRadius,
      setSelectedSearchQuery,
      setAreaSearchActivities,
      setSelectedTab,
      setIsActivitiesLoading,
    ]
  );

  const handleAutocompleteSelect = useCallback(
    async (item: ISearchHistoryItem) => {
      try {
        setSelectedSearchQuery(item.mainText);
        setIsVisible(false);
        setIsExactSearch(true);
        addToHistory(item);

        // Perform text search instead of switching to history tab
        await handleTextSearch(item.mainText);

        if (item.placeId) {
          await addSearchHistoryMutation.mutateAsync(item);
        }
      } catch (error) {
        console.error("Error adding search history item:", error);
        setSearchError("Failed to save search history.");
      }
    },
    [setSelectedSearchQuery, addToHistory, addSearchHistoryMutation, handleTextSearch]
  );

  const handleSearchTypeSelect = useCallback(
    async (type: SearchType = selectedType) => {
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
        const activities = await fetchNearbyActivities(centerCoordinates[0], centerCoordinates[1], mapRadius, type);

        if (!abortControllerRef.current?.signal.aborted) {
          setAreaSearchActivities(activities);
          setSelectedTab("area-search");
          // Reset search type area after successful search
          setTimeout(() => {
            setSearchTypeArea(false);
          }, 500);
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
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
    },
    [
      centerCoordinates,
      mapRadius,
      selectedType,
      searchTypes,
      setSelectedSearchQuery,
      setSelectedType,
      setAreaSearchActivities,
      setSelectedTab,
      setIsActivitiesLoading,
    ]
  );

  // Optimized map change effect with proper cleanup (no state writes for timers)
  useEffect(() => {
    if (searchAreaTimeoutRef.current) {
      clearTimeout(searchAreaTimeoutRef.current);
    }

    const timeout = setTimeout(() => {
      setMapHasChanged(true);
    }, 500); // 500ms delay after map movement

    searchAreaTimeoutRef.current = timeout;

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
    setSelectedType("all"); // Reset the selected type to clear button highlights
    setIsExactSearch(false);
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search restaurants, attractions..."
            value={selectedSearchQuery}
            onChange={handleSearchChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className={cn(
              "w-full pl-10 pr-12 h-12 text-base rounded-xl bg-bg-0/95 backdrop-blur-sm shadow-card",
              searchError && "border-coral-500/50 focus-visible:border-coral-500 focus-visible:ring-coral-500/20"
            )}
          />
          {/* Right side controls */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isAutocompleteLoading && <Loader2 className="h-4 w-4 animate-spin text-brand-500" />}
            {selectedSearchQuery && (
              <button
                onClick={handleClearSearch}
                className="p-1.5 hover:bg-bg-50 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-ink-500 hover:text-ink-700" />
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {searchError && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-coral-500/10 border border-coral-500/20 rounded-xl text-sm text-ink-700 z-20 shadow-card">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-coral-500 rounded-full flex-shrink-0" />
              {searchError}
            </div>
          </div>
        )}

        {/* Autocomplete results */}
        {isVisible && (autocompleteResults.length > 0 || debouncedQuery.length >= 2 || isAutocompleteLoading) && (
          <div className="absolute top-full left-0 right-0 mt-2 glass rounded-xl z-30 max-h-64 overflow-y-auto">
            {isAutocompleteLoading && autocompleteResults.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-brand-500 mr-3" />
                <span className="text-sm text-ink-700 font-medium">Searching places…</span>
              </div>
            ) : (
              <div className="py-2">
                {/* Text search option - appears first if user has typed something */}
                {debouncedQuery.length >= 2 && (
                  <button
                    onClick={() => handleTextSearch(debouncedQuery)}
                    className="w-full text-left px-4 py-3 hover:bg-brand-500/10 transition-colors group border-b border-stroke-200/60"
                  >
                    <div className="flex items-center gap-3">
                      <Search className="h-4 w-4 text-teal-500 group-hover:text-brand-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-ink-900 truncate">
                          Search “{debouncedQuery}” nearby
                        </div>
                        <div className="text-xs text-ink-500 mt-0.5 truncate">
                          Uses a keyword search within your current map area.
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {/* Place autocomplete results */}
                {autocompleteResults.map((result, index) => (
                  <button
                    key={`${result.placeId}-${index}`}
                    onClick={() => handleAutocompleteSelect(result)}
                    className="w-full text-left px-4 py-3 hover:bg-bg-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-ink-500 group-hover:text-brand-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-ink-900 truncate">{result.mainText}</div>
                        <div className="text-xs text-ink-500 mt-0.5 truncate">{result.secondaryText}</div>
                      </div>
                    </div>
                  </button>
                ))}

                {/* No results message */}
                {!isAutocompleteLoading && autocompleteResults.length === 0 && debouncedQuery.length >= 2 && (
                  <div className="px-4 py-3 text-sm text-ink-500 text-center">
                    No specific places found. Try the keyword search above.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search type buttons */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {searchTypes.map((type) => {
          const isSelected = selectedType === type.id;
          return (
            <Button
              key={type.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handleSearchTypeSelect(type.id as SearchType)}
              disabled={isActivitiesLoading}
              className={cn(
                "flex items-center gap-2 rounded-full whitespace-nowrap",
                !isSelected && "bg-bg-0/90 backdrop-blur-sm"
              )}
            >
              <div className={cn("transition-colors", isSelected ? "text-white" : "text-ink-500")}>
                {type.icon}
              </div>
              <span className="hidden sm:inline font-medium">{type.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Search this area button */}
      {mapHasChanged && !searchTypeArea && !isExactSearch && (
        <Button
          variant="default"
          size="sm"
          onClick={() => handleSearchTypeSelect("all")}
          disabled={isActivitiesLoading}
          className="w-full mt-3 h-11 rounded-xl"
        >
          {isActivitiesLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Searching area…</span>
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
