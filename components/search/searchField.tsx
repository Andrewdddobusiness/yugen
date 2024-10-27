import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { Input } from "../ui/input";

import { ISearchHistoryItem, useSearchHistoryStore } from "@/store/searchHistoryStore";
import { getGoogleMapsAutocomplete } from "@/actions/google/actions";
import { addSearchHistoryItem } from "@/actions/supabase/actions";
import { useMapStore } from "@/store/mapStore";
import { useActivityTabStore } from "@/store/activityTabStore";

export default function SearchField() {
  const searchParams = useSearchParams();
  const itineraryId = searchParams.get("i");
  const destinationId = searchParams.get("d");

  // **** STORES ****
  const { setSelectedTab } = useActivityTabStore();

  // **** STATES ****
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autocompleteResults, setAutocompleteResults] = useState<Array<ISearchHistoryItem>>([]);

  const [isVisible, setIsVisible] = useState<boolean>(false);

  const { addToHistory } = useSearchHistoryStore();
  const { itineraryCoordinates } = useMapStore();

  // **** REFS ****
  const inputRef = useRef<HTMLInputElement>(null);

  // **** HANDLERS ****
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

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
      setAutocompleteResults([]);
      setIsVisible(false);
    }
  };

  const handleAutocompleteSelect = async (item: ISearchHistoryItem) => {
    setSearchQuery(item.mainText);
    setAutocompleteResults([]);
    setIsVisible(false);
    addToHistory(item);
    setSelectedTab("history");

    await addSearchHistoryItem(itineraryId as string, destinationId as string, item.placeId);
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
        value={searchQuery}
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
