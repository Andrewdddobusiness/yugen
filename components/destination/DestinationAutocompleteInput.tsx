"use client";

import * as React from "react";
import { MapPin, Loader2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandItem, CommandList } from "@/components/ui/command";
import { useDebounce } from "@/components/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { getPlaceAutocomplete, getPlaceDetailsForDestination } from "@/actions/google/maps";
import type { Destination } from "@/store/createItineraryStore";

type DestinationSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  types?: string[];
};

type DestinationAutocompleteInputProps = {
  value: Destination | null;
  onChange: (destination: Destination | null) => void;
  placeholder?: string;
  disabled?: boolean;
  clearSelectionOnType?: boolean;
};

const extractCountry = (address: string): string => {
  const parts = address.split(", ");
  return parts[parts.length - 1] || "";
};

const toSearchUnavailableMessage = (message?: string | null) => {
  const normalized = String(message ?? "").trim();
  if (!normalized) return "Search is temporarily unavailable. Please try again.";

  if (/API_KEY_HTTP_REFERRER_BLOCKED/i.test(normalized) || /Requests from referer/i.test(normalized)) {
    return "Search is blocked by Google API key referrer restrictions. Please check your allowed HTTP referrers.";
  }

  if (/API key not configured/i.test(normalized)) {
    return "Search isn't configured yet. Please add a Google Maps API key.";
  }

  return "Search is temporarily unavailable. Please try again.";
};

export function DestinationAutocompleteInput({
  value,
  onChange,
  placeholder = "Type a city…",
  disabled = false,
  clearSelectionOnType = true,
}: DestinationAutocompleteInputProps) {
  const [query, setQuery] = React.useState<string>(() => value?.formatted_address || "");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<DestinationSuggestion[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const debouncedQuery = useDebounce(query, 250);

  React.useEffect(() => {
    if (isFocused) return;
    if (!value) return;
    setQuery(value.formatted_address || "");
  }, [isFocused, value]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (disabled) return;
      if (!isFocused) {
        setOpen(false);
        return;
      }
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        setSuggestions([]);
        setError(null);
        setOpen(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getPlaceAutocomplete(debouncedQuery.trim());
        if (cancelled) return;

        if (response.success && response.data) {
          setSuggestions(response.data as DestinationSuggestion[]);
          setOpen(true);
        } else {
          setSuggestions([]);
          setOpen(true);
          setError(toSearchUnavailableMessage(response.error?.message));
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Destination autocomplete error:", err);
        setSuggestions([]);
        setOpen(true);
        setError(toSearchUnavailableMessage(err instanceof Error ? err.message : null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, disabled]);

  const handleSelect = async (suggestion: DestinationSuggestion) => {
    if (disabled) return;
    setLoading(true);
    setError(null);

    try {
      const details = await getPlaceDetailsForDestination(suggestion.placeId);

      if (!details.success || !details.data) {
        setSuggestions([]);
        setOpen(true);
        setError(toSearchUnavailableMessage(details.error?.message));
        return;
      }

      const formattedAddress = details.data.formatted_address;

      const destination: Destination = {
        id: details.data.place_id,
        name: suggestion.mainText,
        city: suggestion.mainText,
        country: extractCountry(formattedAddress),
        formatted_address: formattedAddress,
        place_id: details.data.place_id,
        coordinates: details.data.coordinates,
        timezone: "",
        photos: [],
      };

      onChange(destination);
      setQuery(formattedAddress);
      setOpen(false);
      setSuggestions([]);
    } catch (err) {
      console.error("Error selecting destination:", err);
      setSuggestions([]);
      setOpen(true);
      setError(toSearchUnavailableMessage(err instanceof Error ? err.message : null));
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    onChange(null);
    setQuery("");
    setSuggestions([]);
    setError(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={query}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              setError(null);
              if (value && clearSelectionOnType) onChange(null);
              setOpen(next.trim().length >= 2);
            }}
            onFocus={() => {
              setIsFocused(true);
              if (!disabled && (suggestions.length > 0 || (query && query.trim().length >= 2))) {
                setOpen(true);
              }
            }}
            onBlur={() => {
              setIsFocused(false);
              setOpen(false);
            }}
            className={cn("pl-10 pr-20 h-11", disabled && "opacity-70")}
          />

          {loading ? (
            <span className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            </span>
          ) : null}

          {query ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={clearSelection}
              disabled={disabled}
              aria-label="Clear destination"
            >
              <X className="h-4 w-4 text-gray-500" />
            </Button>
          ) : null}
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        onOpenAutoFocus={(event) => {
          // Keep the cursor in the input while suggestions appear.
          event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandList>
            {error ? <CommandEmpty>{error}</CommandEmpty> : null}
            {!error ? <CommandEmpty>No destinations found</CommandEmpty> : null}
            {suggestions.map((item) => (
              <CommandItem
                key={item.placeId}
                value={`${item.mainText} ${item.secondaryText}`}
                onMouseDown={(event) => {
                  // Prevent the input from blurring when selecting from the list.
                  event.preventDefault();
                }}
                onSelect={() => handleSelect(item)}
                className="cursor-pointer"
              >
                <div className="flex flex-col min-w-0">
                  <div className="font-medium truncate">{item.mainText}</div>
                  <div className="text-xs text-muted-foreground truncate">{item.secondaryText}</div>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
