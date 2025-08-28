"use client";

import React, { useMemo, useState } from "react";
import { AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { Clock, MapPin, Star, DollarSign, Calendar, Route, User } from "lucide-react";
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
  onClick,
  onEdit,
  className,
}: ItineraryActivityMarkerProps) {
  const [showInfoWindow, setShowInfoWindow] = useState(false);

  // Marker color based on day and type - moved before early return
  const markerColor = useMemo(() => {
    const dayColors = [
      "#3B82F6", // Blue
      "#EF4444", // Red
      "#10B981", // Green
      "#F59E0B", // Amber
      "#8B5CF6", // Purple
      "#F97316", // Orange
      "#06B6D4", // Cyan
    ];

    if (isSelected) return "#1D4ED8"; // Dark blue for selected
    if (isHighlighted) return "#DC2626"; // Dark red for highlighted

    return dayColors[dayIndex % dayColors.length];
  }, [dayIndex, isSelected, isHighlighted]);

  // Don't render if no coordinates
  if (
    !activity.activity?.coordinates ||
    !Array.isArray(activity.activity.coordinates) ||
    activity.activity.coordinates.length !== 2
  ) {
    console.log(
      "ItineraryActivityMarker: No valid coordinates for",
      activity.activity?.name,
      activity.activity?.coordinates
    );
    return null;
  }

  // Coordinates are stored as [lng, lat] in our data
  const [lng, lat] = activity.activity.coordinates;
  const position = { lat: lat, lng: lng };

  console.log("ItineraryActivityMarker: Rendering marker at", position, "for", activity.activity?.name);

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
          setShowInfoWindow(true);
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
              isSelected && "scale-125 ring-4 ring-blue-200",
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
            <div className="absolute -bottom-1 -left-1 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {dayIndex + 1}
            </div>
          )}
        </div>
      </AdvancedMarker>

      {/* Info Window */}
      {showInfoWindow && (
        <InfoWindow position={position} onCloseClick={() => setShowInfoWindow(false)} maxWidth={300}>
          <div className="p-2 space-y-3 max-w-sm">
            {/* Header */}
            <div className="space-y-2">
              <h3 className="font-semibold text-base leading-tight text-gray-900">
                {activity.activity?.name || "Unnamed Activity"}
              </h3>

              {activity.activity?.address && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{activity.activity.address}</span>
                </div>
              )}
            </div>

            {/* Time and Date */}
            <div className="flex items-center gap-4 text-sm">
              {activity.date && (
                <div className="flex items-center gap-1 text-gray-700">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(activity.date)}</span>
                </div>
              )}

              {activity.start_time && (
                <div className="flex items-center gap-1 text-gray-700">
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
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{activity.activity.rating}</span>
                </div>
              )}

              {/* Price */}
              {activity.activity?.price_level && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span className="text-sm font-medium text-green-600">
                    {getPriceDisplay(activity.activity.price_level)}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            {activity.notes && <div className="text-sm text-gray-700 p-2 bg-gray-50 rounded">{activity.notes}</div>}

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
  const dayColors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#F97316", "#06B6D4"];

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
          className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg border-3 border-white text-white font-bold text-sm"
          style={{ backgroundColor: clusterColor }}
        >
          {count}
        </div>
      </AdvancedMarker>

      {showInfoWindow && (
        <InfoWindow position={position} onCloseClick={() => setShowInfoWindow(false)} maxWidth={250}>
          <div className="p-2">
            <h4 className="font-semibold mb-2">{count} Activities in this area</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.itinerary_activity_id} className="text-sm text-gray-700">
                  {activity.activity?.name || "Unnamed Activity"}
                </div>
              ))}
              {activities.length > 5 && (
                <div className="text-xs text-gray-500">And {activities.length - 5} more...</div>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
