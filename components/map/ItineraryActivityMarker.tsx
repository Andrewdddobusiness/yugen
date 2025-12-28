"use client";

import React, { useMemo, useState } from "react";
import { AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { Clock, MapPin, Star, DollarSign, Calendar, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCategoryType } from "@/utils/formatting/types";

interface ItineraryActivity {
  itinerary_activity_id: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes?: string;
  activity?: {
    activity_id?: string;
    name: string;
    address?: string;
    coordinates?: [number, number];
    types?: string[];
    rating?: number;
    price_level?: string;
    phone_number?: string;
    website_url?: string;
    photo_names?: string[];
    place_id?: string;
  };
}

interface ItineraryActivityMarkerProps {
  activity: ItineraryActivity;
  dayIndex?: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
  showTime?: boolean;
  enableInfoWindow?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  className?: string;
}

export function ItineraryActivityMarker({
  activity,
  dayIndex = 0,
  isSelected = false,
  isHighlighted = false,
  showTime = true,
  enableInfoWindow = true,
  onClick,
  onEdit,
  className,
}: ItineraryActivityMarkerProps) {
  const [showInfoWindow, setShowInfoWindow] = useState(false);

  // Marker color based on day and type - moved before early return
  const markerColor = useMemo(() => {
    const dayColors = [
      "#3F5FA3", // brand.500
      "#22B8B2", // teal.500
      "#FF5A6B", // coral.500
      "#FFB020", // amber.500
      "#5C7BCB", // brand.400
      "#334A7A", // brand.600
      "#8FA8E6", // brand.300
    ];

    if (isSelected) return "#2A3B63"; // brand.700 for selected
    if (isHighlighted) return "#FF5A6B"; // coral.500 for highlighted

    return dayColors[dayIndex % dayColors.length];
  }, [dayIndex, isSelected, isHighlighted]);

  // Don't render if no coordinates
  if (
    !activity.activity?.coordinates ||
    !Array.isArray(activity.activity.coordinates) ||
    activity.activity.coordinates.length !== 2
  ) {
    return null;
  }

  // Coordinates are stored as [lng, lat] in our data
  const [lng, lat] = activity.activity.coordinates;
  const position = { lat: lat, lng: lng };

  // Get activity type for marker styling
  const primaryType = activity.activity?.types?.[0] || "tourist_attraction";

  // Get icon for activity type
  const getActivityIcon = (types: string[] = []) => {
    const type = types[0];
    switch (type) {
      case "restaurant":
      case "meal_takeaway":
      case "food":
        return "🍽️";
      case "lodging":
        return "🏨";
      case "tourist_attraction":
      case "museum":
        return "🏛️";
      case "park":
        return "🌳";
      case "shopping_mall":
      case "store":
        return "🛍️";
      case "church":
      case "place_of_worship":
        return "⛪";
      case "hospital":
        return "🏥";
      case "school":
      case "university":
        return "🏫";
      case "bank":
        return "🏦";
      case "gas_station":
        return "⛽";
      case "pharmacy":
        return "💊";
      case "gym":
        return "💪";
      case "spa":
        return "🧖‍♀️";
      case "beach":
        return "🏖️";
      case "zoo":
        return "🦁";
      case "amusement_park":
        return "🎢";
      default:
        return "📍";
    }
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return time;
    }
  };

  const getPriceDisplay = (priceLevel: string) => {
    const levels: Record<string, string> = {
      "1": "$",
      "2": "$$",
      "3": "$$$",
      "4": "$$$$",
    };
    return levels[priceLevel] || "";
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <AdvancedMarker
        position={position}
        onClick={() => {
          if (enableInfoWindow) setShowInfoWindow(true);
          onClick?.();
        }}
        className={cn("cursor-pointer transform transition-transform hover:scale-110", className)}
      >
        <div className="relative">
          {/* Main Marker */}
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full shadow-lg border-2 border-white",
              "transition-all duration-200 transform",
              isSelected && "scale-125 ring-4 ring-brand-400/30",
              isHighlighted && "animate-pulse scale-110"
            )}
            style={{ backgroundColor: markerColor }}
          >
            <span className="text-white text-lg font-semibold">{getActivityIcon(activity.activity?.types)}</span>
          </div>

          {/* Time Badge */}
          {showTime && activity.start_time && (
            <div className="absolute -top-2 -right-2 bg-white rounded-full px-2 py-1 text-xs font-semibold shadow-md border">
              {formatTime(activity.start_time)}
            </div>
          )}

          {/* Day Number */}
          {dayIndex >= 0 && (
            <div className="absolute -bottom-1 -left-1 bg-ink-900 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {dayIndex + 1}
            </div>
          )}
        </div>
      </AdvancedMarker>

      {/* Info Window */}
      {enableInfoWindow && showInfoWindow && (
        <InfoWindow position={position} onCloseClick={() => setShowInfoWindow(false)} maxWidth={300}>
          <div className="p-2 space-y-3 max-w-sm">
            {/* Header */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base leading-tight text-ink-900">
                {activity.activity?.name || "Unnamed Activity"}
              </h3>

              {activity.activity?.address && (
                <div className="flex items-start gap-2 text-sm text-ink-500">
                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{activity.activity.address}</span>
                </div>
              )}
            </div>

            {/* Time and Date */}
            <div className="flex items-center gap-4 text-sm">
              {activity.date && (
                <div className="flex items-center gap-1 text-ink-700">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(activity.date)}</span>
                </div>
              )}

              {activity.start_time && (
                <div className="flex items-center gap-1 text-ink-700">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatTime(activity.start_time)}
                    {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                  </span>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-3">
              {/* Category */}
              {activity.activity?.types && activity.activity.types.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {formatCategoryType(activity.activity.types[0])}
                </Badge>
              )}

              {/* Rating */}
              {activity.activity?.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span className="text-sm font-medium">{activity.activity.rating}</span>
                </div>
              )}

              {/* Price */}
              {activity.activity?.price_level && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span className="text-sm font-medium text-ink-700">
                    {getPriceDisplay(activity.activity.price_level)}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            {activity.notes && <div className="text-sm text-ink-700 p-2 bg-bg-50 rounded">{activity.notes}</div>}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowInfoWindow(false);
                  onEdit?.();
                }}
                className="flex-1 text-xs"
              >
                Edit
              </Button>

              {activity.activity?.place_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = `https://www.google.com/maps/place/?q=place_id:${activity.activity?.place_id}`;
                    window.open(url, "_blank");
                  }}
                  className="flex-1 text-xs"
                >
                  <Route className="h-3 w-3 mr-1" />
                  Directions
                </Button>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// Cluster marker for grouped activities
interface ClusterMarkerProps {
  activities: ItineraryActivity[];
  position: { lat: number; lng: number };
  onClick?: () => void;
  dayIndex?: number;
}

export function ClusterMarker({ activities, position, onClick, dayIndex = 0 }: ClusterMarkerProps) {
  const [showInfoWindow, setShowInfoWindow] = useState(false);

  const count = activities.length;
  const dayColors = ["#3F5FA3", "#22B8B2", "#FF5A6B", "#FFB020", "#5C7BCB", "#334A7A", "#8FA8E6"];

  const clusterColor = dayColors[dayIndex % dayColors.length];

  return (
    <>
      <AdvancedMarker
        position={position}
        onClick={() => {
          setShowInfoWindow(true);
          onClick?.();
        }}
        className="cursor-pointer transform transition-transform hover:scale-110"
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg border-[3px] border-white text-white font-bold text-sm"
          style={{ backgroundColor: clusterColor }}
        >
          {count}
        </div>
      </AdvancedMarker>

      {showInfoWindow && (
        <InfoWindow position={position} onCloseClick={() => setShowInfoWindow(false)} maxWidth={250}>
          <div className="p-2">
            <h4 className="font-semibold mb-2 text-ink-900">{count} Activities in this area</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.itinerary_activity_id} className="text-sm text-ink-700">
                  {activity.activity?.name || "Unnamed Activity"}
                </div>
              ))}
              {activities.length > 5 && (
                <div className="text-xs text-ink-500">And {activities.length - 5} more...</div>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
