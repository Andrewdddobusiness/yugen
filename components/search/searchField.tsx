import { useState, useRef, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Utensils, ShoppingCart, Landmark, Loader2 } from "lucide-react";

import { addSearchHistoryItem } from "@/actions/supabase/actions";
import { fetchNearbyActivities, getGoogleMapsAutocomplete } from "@/actions/google/actions";

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
  const { setActivities, isActivitiesLoading, setIsActivitiesLoading } = useActivitiesStore();

  // **** STATES ****

  const [autocompleteResults, setAutocompleteResults] = useState<Array<ISearchHistoryItem>>([]);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [mapHasChanged, setMapHasChanged] = useState(false);
  const [searchAreaTimeout, setSearchAreaTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedType, setSelectedType] = useState<SearchType>("all");
  const [isExactSearch, setIsExactSearch] = useState(false);
  const [searchTypeArea, setSearchTypeArea] = useState(false);

  // **** REFS ****
  const inputRef = useRef<HTMLInputElement>(null);

  const searchTypes = [
    { id: "food", label: "Restaurants & Cafes", icon: <Utensils size={16} /> },
    { id: "shopping", label: "Shopping Places", icon: <ShoppingCart size={16} /> },
    { id: "historical", label: "Historical Sites", icon: <Landmark size={16} /> },
  ];

  // **** HANDLERS ****
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedSearchQuery(value);

    if (!value || value.length === 0) {
      setSearchTypeArea(false);
    }

    if (value.length > 2) {
      const results = await getGoogleMapsAutocomplete(
        value,
        itineraryCoordinates?.[0],
        itineraryCoordinates?.[1],
        3000
      );
      setAutocompleteResults(results);
    } else {
      setAutocompleteResults([]);
    }
    setIsVisible(true);
  };

  // **** MUTATIONS ****
  const addSearchHistoryMutation = useMutation({
    mutationFn: async (item: ISearchHistoryItem) => {
      return await addSearchHistoryItem(itineraryId as string, destinationId as string, item.placeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["searchHistoryActivities"] });
    },
  });

  // **** HANDLERS ****
  const handleAutocompleteSelect = async (item: ISearchHistoryItem) => {
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
    }
  };

  const handleInputFocus = () => {
    setIsVisible(true);
    if (!selectedSearchQuery || selectedSearchQuery.length < 3) {
      setAutocompleteResults([]);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  const handleSearchTypeSelect = async (type: SearchType = selectedType) => {
    if (!centerCoordinates) return;

    setIsActivitiesLoading(true);
    setIsVisible(false);
    setMapHasChanged(false);
    setIsExactSearch(false);
    setSearchTypeArea(true);

    const selectedTypeInfo = searchTypes.find((t) => t.id === type);
    if (selectedTypeInfo) {
      setSelectedSearchQuery(selectedTypeInfo.label);
      setSelectedType(type);
    }

    try {
      const activities = await fetchNearbyActivities(centerCoordinates[0], centerCoordinates[1], mapRadius, type);
      console.log("activities2: ", activities);
      setActivities(activities);
      setSelectedTab("search");
    } catch (error) {
      console.error("Error generating activities:", error);
    } finally {
      setIsActivitiesLoading(false);
    }
  };

  useEffect(() => {
    if (searchAreaTimeout) {
      clearTimeout(searchAreaTimeout);
    }

    const timeout = setTimeout(() => {
      setMapHasChanged(true);
    }, 500); // 500ms delay after map movement

    setSearchAreaTimeout(timeout);

    return () => {
      if (searchAreaTimeout) {
        clearTimeout(searchAreaTimeout);
      }
    };
  }, [centerCoordinates, mapRadius]);

  return (
    <div className="flex flex-col gap-2 mt-2 relative">
      <div className="relative w-full">
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search for places..."
          value={selectedSearchQuery}
          onChange={handleSearchChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className={`w-full rounded-lg md:w-[200px] lg:w-[336px] ${isActivitiesLoading ? "pr-10" : ""}`}
        />
        {isActivitiesLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          </div>
        )}
      </div>

      {mapHasChanged && searchTypeArea && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSearchTypeSelect(selectedType)}
          className="w-full md:w-[200px] lg:w-[336px] text-sm animate-in transition-all duration-300 ease-in-out fade-in rounded-full bg-black text-white"
        >
          Search this area
        </Button>
      )}

      <div
        className={`absolute z-10 w-full md:w-[200px] lg:w-[336px] bg-white rounded-md shadow-lg mt-12 animate-in transition-all duration-300 ease-in-out ${
          isVisible ? "fade-in translate-y-0" : "fade-out -translate-y-2 pointer-events-none"
        }`}
      >
        {isVisible && (!selectedSearchQuery || selectedSearchQuery.length < 3) && (
          <ul>
            {searchTypes.map((type) => (
              <li
                key={type.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer"
                onMouseDown={() => handleSearchTypeSelect(type.id as SearchType)}
              >
                <div className="text-gray-600">{type.icon}</div>
                <div className="flex flex-col">
                  <div className="text-sm font-medium">{type.label}</div>
                  <div className="text-xs text-gray-500">Search all {type.label.toLowerCase()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Exact code search autocomplete results */}
        {autocompleteResults.length > 0 && (
          <ul>
            {autocompleteResults.map((result) => (
              <li
                key={result.placeId}
                className="flex flex-col px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onMouseDown={() => handleAutocompleteSelect(result)}
              >
                <div className="text-md font-bold text-color-primary">{result.mainText}</div>
                <div className="text-xs italic text-color-secondary">{result.secondaryText}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
