"use client";

import React from "react";
import { MapPin, Star, Clock, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPriceDisplay, formatTypes } from "./utils";
import type { SuggestionDetailsProps } from "./types";

/**
 * Popup details component for suggestion markers
 * Shows detailed information about a suggested place
 */
export function SuggestionDetails({ suggestion, selectedDate, onAdd }: SuggestionDetailsProps) {
  return (
    <div className="p-0 max-w-sm">
      {/* Compact Header */}
      <div className="px-3 py-2 border-b">
        <h3 className="font-semibold text-sm leading-tight text-gray-900 pr-4">{suggestion.name}</h3>
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="line-clamp-1">{suggestion.vicinity}</span>
        </div>
      </div>

      {/* Metadata Row */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            {formatTypes(suggestion.types)}
          </Badge>

          {suggestion.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{suggestion.rating}</span>
            </div>
          )}

          {suggestion.price_level && (
            <span className="text-xs font-medium text-green-600">{getPriceDisplay(suggestion.price_level)}</span>
          )}
        </div>

        {suggestion.opening_hours && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className={cn("text-xs", suggestion.opening_hours.open_now ? "text-green-600" : "text-red-600")}>
              {suggestion.opening_hours.open_now ? "Open now" : "Closed"}
            </span>
          </div>
        )}
      </div>

      {/* Why Suggested Section */}
      <div className="mx-3 mb-3 p-2 bg-purple-50 rounded text-xs text-purple-700">
        <div className="flex items-center gap-1 mb-1">
          <Sparkles className="h-3 w-3" />
          <span className="font-medium">Why suggested?</span>
        </div>
        <p className="leading-relaxed">Popular {formatTypes([suggestion.types[0]])} near your planned activities</p>
      </div>

      {/* Action Buttons */}
      <div className="px-3 pb-3 flex gap-2">
        <Button
          onClick={() => onAdd(suggestion, selectedDate)}
          className="flex-1 text-xs h-8 bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add to Itinerary
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            const url = `https://www.google.com/maps/place/?q=place_id:${suggestion.place_id}`;
            globalThis.open(url, "_blank");
          }}
          className="text-xs h-8 px-3"
        >
          View on Maps
        </Button>
      </div>
    </div>
  );
}
