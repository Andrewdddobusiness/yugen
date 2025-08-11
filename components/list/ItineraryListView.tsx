"use client";

import React, { useState } from 'react';
import { format, isToday } from 'date-fns';
import { Clock, MapPin, Star, DollarSign, Phone, Globe, Edit3, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { useDateRangeStore } from '@/store/dateRangeStore';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCategoryType } from '@/utils/formatting/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { NotesPopover } from '@/components/popover/notesPopover';

interface ItineraryListViewProps {
  showMap?: boolean;
  onToggleMap?: () => void;
  className?: string;
}

interface ItineraryActivity {
  itinerary_activity_id: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes?: string;
  activity?: {
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

export function ItineraryListView({ 
  showMap, 
  onToggleMap, 
  className 
}: ItineraryListViewProps) {
  const { itineraryId } = useParams();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const isMobile = useIsMobile();
  
  const { itineraryActivities, removeItineraryActivity } = useItineraryActivityStore();
  const { startDate, endDate } = useDateRangeStore();

  // Filter out deleted activities
  const activeActivities = itineraryActivities.filter(
    (activity) => activity.deleted_at === null
  );

  // Group activities by date
  const groupActivitiesByDate = (activities: ItineraryActivity[]) => {
    const groups: { [key: string]: ItineraryActivity[] } = {
      unscheduled: [],
    };

    activities.forEach((activity) => {
      if (!activity.date) {
        groups.unscheduled.push(activity);
      } else {
        const date = new Date(activity.date).toISOString().split("T")[0];
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(activity);
      }
    });

    // Remove empty unscheduled group
    if (groups.unscheduled.length === 0) {
      delete groups.unscheduled;
    }

    // Sort activities within each day by start time
    Object.keys(groups).forEach(date => {
      if (date !== 'unscheduled') {
        groups[date].sort((a, b) => {
          if (!a.start_time && !b.start_time) return 0;
          if (!a.start_time) return 1;
          if (!b.start_time) return -1;
          return a.start_time.localeCompare(b.start_time);
        });
      }
    });

    return Object.entries(groups).sort(([dateA], [dateB]) => {
      if (dateA === "unscheduled") return 1;
      if (dateB === "unscheduled") return -1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  };

  const formatDate = (dateString: string): "Unscheduled" | {
    full: string;
    day: string;
    date: string;
    isToday: boolean;
  } => {
    if (dateString === "unscheduled") return "Unscheduled";
    const date = new Date(dateString);
    return {
      full: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      day: format(date, 'EEEE'),
      date: format(date, 'MMMM d'),
      isToday: isToday(date),
    };
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  const getPriceDisplay = (priceLevel?: string) => {
    if (!priceLevel) return null;
    const level = parseInt(priceLevel);
    return '$'.repeat(Math.max(1, Math.min(4, level)));
  };

  const handleNotesChange = (id: string, value: string) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const handleRemoveActivity = async (placeId: string) => {
    try {
      if (!itineraryId) return;
      await removeItineraryActivity(placeId, Array.isArray(itineraryId) ? itineraryId[0] : itineraryId);

      queryClient.invalidateQueries({
        queryKey: ["itineraryActivities"],
      });
    } catch (error) {
      console.error("Error removing activity:", error);
    }
  };

  const groupedActivities = groupActivitiesByDate(activeActivities);

  return (
    <div className={cn("space-y-6", isMobile ? "p-4" : "p-6", className)}>
      {groupedActivities.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No activities scheduled</h3>
            <p className="text-sm">Add activities to your itinerary to see them here.</p>
          </div>
        </div>
      ) : (
        groupedActivities.map(([date, activities]) => {
          const dateInfo = formatDate(date);
          
          return (
            <div key={date} className="space-y-4">
              {/* Day Header */}
              <div className={cn("flex items-center", isMobile ? "gap-2" : "gap-4")}>
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
                
                <div className="text-sm text-muted-foreground">
                  {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                </div>
              </div>

              {/* Activities for this day */}
              <div className={cn("space-y-3", isMobile ? "ml-2" : "ml-4")}>
                {activities.map((activity, index) => (
                  <Card key={activity.itinerary_activity_id} className="hover:shadow-md transition-shadow">
                    <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
                      <div className={cn("flex items-start", isMobile ? "gap-3" : "gap-4")}>
                        {/* Time indicator */}
                        <div className={cn("flex flex-col items-center", isMobile ? "min-w-[70px]" : "min-w-[80px]")}>
                          {activity.start_time ? (
                            <>
                              <span className="text-sm font-medium text-gray-900">
                                {formatTime(activity.start_time)}
                              </span>
                              {activity.end_time && (
                                <>
                                  <div className="w-px h-4 bg-gray-300 my-1" />
                                  <span className="text-xs text-gray-500">
                                    {formatTime(activity.end_time)}
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">No time</span>
                          )}
                        </div>

                        {/* Activity details */}
                        <div className="flex-1 space-y-2">
                          {/* Title and type */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 mb-1">
                                {activity.activity?.name || 'Unnamed Activity'}
                              </h3>
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                {activity.activity?.types && activity.activity.types.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {formatCategoryType(activity.activity.types[0])}
                                  </Badge>
                                )}
                                
                                {activity.activity?.rating && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                    <span>{activity.activity.rating.toFixed(1)}</span>
                                  </div>
                                )}
                                
                                {activity.activity?.price_level && (
                                  <div className="text-xs text-gray-600">
                                    {getPriceDisplay(activity.activity.price_level)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 ml-4">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleRemoveActivity(activity.activity?.place_id || '')}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Address */}
                          {activity.activity?.address && (
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{activity.activity.address}</span>
                            </div>
                          )}

                          {/* Contact information */}
                          {(activity.activity?.phone_number || activity.activity?.website_url) && (
                            <div className={cn("flex items-center text-sm", isMobile ? "gap-3 flex-wrap" : "gap-4")}>
                              {activity.activity.phone_number && (
                                <Link 
                                  href={`tel:${activity.activity.phone_number}`}
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                  <span>{activity.activity.phone_number}</span>
                                </Link>
                              )}
                              
                              {activity.activity.website_url && (
                                <Link 
                                  href={activity.activity.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn("flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline truncate", isMobile ? "max-w-36" : "max-w-48")}
                                >
                                  <Globe className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">Visit website</span>
                                </Link>
                              )}
                            </div>
                          )}

                          {/* Notes */}
                          <div className="pt-2">
                            <NotesPopover
                              id={activity.itinerary_activity_id}
                              value={notes[activity.itinerary_activity_id] || ""}
                              onChange={handleNotesChange}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}