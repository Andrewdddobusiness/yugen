import { useState, useRef } from "react";
import { useParams } from "next/navigation";

import { Input } from "../ui/input";

import { ISearchHistoryItem, useSearchHistoryStore } from "@/store/searchHistoryStore";
import { getGoogleMapsAutocomplete } from "@/actions/google/actions";
import { addSearchHistoryItem } from "@/actions/supabase/actions";
import { useMapStore } from "@/store/mapStore";
import { useActivityTabStore } from "@/store/activityTabStore";

import { useQueryClient, useMutation } from "@tanstack/react-query";

export default function SearchField() {
  const queryClient = useQueryClient();
  const { itineraryId, destinationId } = useParams();

  // **** STORES ****
  const { setSelectedTab } = useActivityTabStore();
  const { addToHistory, selectedSearchQuery, setSelectedSearchQuery } = useSearchHistoryStore();
  const { itineraryCoordinates } = useMapStore();

  // **** STATES ****

  const [autocompleteResults, setAutocompleteResults] = useState<Array<ISearchHistoryItem>>([]);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // **** REFS ****
  const inputRef = useRef<HTMLInputElement>(null);

  // **** HANDLERS ****
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedSearchQuery(value);

    if (value.length > 2) {
      const results = await getGoogleMapsAutocomplete(
        value,
        itineraryCoordinates?.[0],
        itineraryCoordinates?.[1],
        3000
      );
      setAutocompleteResults(results);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
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
    if (autocompleteResults.length > 0) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  return (
    <div className="flex mt-2 relative">
      <Input
        ref={inputRef}
        type="search"
        placeholder="Search..."
        value={selectedSearchQuery}
        onChange={handleSearchChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        className="w-full rounded-lg md:w-[200px] lg:w-[336px]"
      />

      <div
        className={`absolute z-10 w-full md:w-[200px] lg:w-[336px] bg-white border border-gray-300 rounded-md shadow-lg mt-12 transition-all duration-300 ease-in-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
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
