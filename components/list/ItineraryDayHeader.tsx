"use client";

import React from 'react';
import { format, isToday } from 'date-fns';
import { ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CollapsibleTrigger } from '@/components/ui/collapsible';
import { getTotalTravelTimeForDay } from '@/utils/travel/travelTimeUtils';
import type { TravelTimeData } from '@/components/hooks/use-travel-times';

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
  deleted_at?: string | null;
}

interface ItineraryDayHeaderProps {
  date: string;
  activities: ItineraryActivity[];
  expanded: boolean;
  onToggleExpansion: (dateKey: string) => void;
  onSelectDay?: (date: string) => void;
  selectionMode: boolean;
  isMobile: boolean;
  travelTimes?: TravelTimeData[];
}

export function ItineraryDayHeader({
  date,
  activities,
  expanded,
  onToggleExpansion,
  onSelectDay,
  selectionMode,
  isMobile,
  travelTimes = [],
}: ItineraryDayHeaderProps) {
  const formatDate = (dateString: string): "Unscheduled" | {
    full: string;
    day: string;
    date: string;
    isToday: boolean;
  } => {
    if (dateString === "unscheduled") return "Unscheduled";
    const dateObj = new Date(dateString);
    return {
      full: dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      day: format(dateObj, 'EEEE'),
      date: format(dateObj, 'MMMM d'),
      isToday: isToday(dateObj),
    };
  };

  const handleExpandKeyDown = (event: React.KeyboardEvent, dateKey: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleExpansion(dateKey);
    }
  };

  const dateInfo = formatDate(date);

  return (
    <CollapsibleTrigger asChild>
      <button 
        className={cn(
          "w-full flex items-center group hover:bg-gray-50/50 rounded-lg transition-colors p-1 -m-1",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:bg-blue-50/50",
          isMobile ? "gap-2" : "gap-4"
        )}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} activities for ${dateInfo === 'Unscheduled' ? 'unscheduled items' : typeof dateInfo === 'object' ? dateInfo.full : date}`}
        aria-expanded={expanded}
        onKeyDown={(e) => handleExpandKeyDown(e, date)}
      >
        {/* Chevron Icon */}
        <div className="flex items-center justify-center w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-all duration-200">
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              expanded ? "transform rotate-0" : "transform -rotate-90"
            )} 
          />
        </div>
        
        {/* Date Display */}
        <div className={cn(
          "flex flex-col items-center justify-center rounded-lg py-3",
          isMobile ? "px-3 min-w-[100px]" : "px-4 min-w-[120px]",
          date === "unscheduled" 
            ? "bg-gray-100 text-gray-600" 
            : (dateInfo !== "Unscheduled" && dateInfo.isToday)
              ? "bg-blue-100 text-blue-700 border border-blue-200" 
              : "bg-gray-50 text-gray-700"
        )}>
          {date === "unscheduled" ? (
            <span className="text-sm font-medium">Unscheduled</span>
          ) : (
            <>
              <span className="text-xs uppercase tracking-wide font-medium">
                {dateInfo !== "Unscheduled" ? dateInfo.day : ""}
              </span>
              <span className="text-lg font-semibold">
                {dateInfo !== "Unscheduled" ? dateInfo.date : ""}
              </span>
              {dateInfo !== "Unscheduled" && dateInfo.isToday && (
                <span className="text-xs text-blue-600 font-medium">Today</span>
              )}
            </>
          )}
        </div>
        
        <div className="flex-1">
          <Separator />
        </div>
        
        <div className="text-sm text-muted-foreground flex items-center gap-3">
          <span>
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          </span>
          {selectionMode && onSelectDay && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelectDay(date);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1 h-auto"
              title="Select all activities in this day"
            >
              Select Day
            </Button>
          )}
          {/* Travel time summary */}
          {travelTimes.length > 0 && (
            (() => {
              const totalTravel = getTotalTravelTimeForDay(travelTimes);
              return (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {totalTravel.formattedDuration} travel
                </span>
              );
            })()
          )}
          {!expanded && activities.length > 0 && (
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" 
                 title={`${activities.length} activities hidden`} />
          )}
        </div>
      </button>
    </CollapsibleTrigger>
  );
}