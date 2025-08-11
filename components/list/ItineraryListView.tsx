"use client";

import React, { useState, useEffect } from 'react';
import { format, isToday } from 'date-fns';
import { Clock, MapPin, Star, DollarSign, Phone, Globe, Edit3, Trash2, ChevronDown, ChevronRight, Check, X, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { useDateRangeStore } from '@/store/dateRangeStore';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCategoryType } from '@/utils/formatting/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { NotesPopover } from '@/components/popover/notesPopover';
import { setItineraryActivityTimes, setItineraryActivityNotes, setActivityName } from '@/actions/supabase/actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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

export function ItineraryListView({ 
  showMap, 
  onToggleMap, 
  className 
}: ItineraryListViewProps) {
  const { itineraryId } = useParams();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [editingField, setEditingField] = useState<{ activityId: string; field: 'name' | 'time' | 'notes' } | null>(null);
  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>({});
  const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({});
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    // Try to restore from localStorage first, then fall back to defaults
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`expandedDays-${itineraryId}`);
        if (saved) {
          const parsedDays = JSON.parse(saved);
          return new Set(Array.isArray(parsedDays) ? parsedDays : []);
        }
      } catch (error) {
        console.warn('Failed to load expanded days from localStorage:', error);
      }
    }
    
    // Initially expand today's activities and unscheduled by default
    const today = new Date().toISOString().split("T")[0];
    return new Set([today, 'unscheduled']);
  });
  const isMobile = useIsMobile();
  
  const { itineraryActivities, removeItineraryActivity, setItineraryActivities } = useItineraryActivityStore();
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

  const startEditing = (activityId: string, field: 'name' | 'time' | 'notes', currentValue: string = '') => {
    setEditingField({ activityId, field });
    setEditingValues({ ...editingValues, [`${activityId}-${field}`]: currentValue });
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditingValues({});
  };

  const saveField = async (activity: ItineraryActivity) => {
    if (!editingField) return;

    const key = `${editingField.activityId}-${editingField.field}`;
    const value = editingValues[key];
    const activityId = editingField.activityId;

    setSavingStates({ ...savingStates, [key]: true });

    try {
      let result;
      
      switch (editingField.field) {
        case 'name':
          if (!activity.activity?.activity_id) throw new Error('Activity ID not found');
          result = await setActivityName(activity.activity.activity_id, value);
          break;
        case 'time':
          const [startTime, endTime] = value.split('|');
          result = await setItineraryActivityTimes(activityId, startTime || '', endTime || '');
          break;
        case 'notes':
          result = await setItineraryActivityNotes(activityId, value);
          break;
        default:
          throw new Error('Unknown field type');
      }

      if (result.success) {
        // Update local state
        const updatedActivities = itineraryActivities.map(act => {
          if (act.itinerary_activity_id === activityId) {
            switch (editingField.field) {
              case 'name':
                return {
                  ...act,
                  activity: act.activity ? { ...act.activity, name: value } : act.activity
                };
              case 'time':
                const [startTime, endTime] = value.split('|');
                return { ...act, start_time: startTime || null, end_time: endTime || null };
              case 'notes':
                return { ...act, notes: value };
              default:
                return act;
            }
          }
          return act;
        });
        
        setItineraryActivities(updatedActivities);
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["itineraryActivities"] });
        
        toast.success('Activity updated successfully');
        setEditingField(null);
        setEditingValues({});
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error saving field:', error);
      toast.error('Failed to update activity');
    } finally {
      setSavingStates({ ...savingStates, [key]: false });
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, activity: ItineraryActivity) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveField(activity);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const formatTimeForEditing = (startTime: string | null, endTime: string | null) => {
    const start = startTime || '';
    const end = endTime || '';
    return `${start}|${end}`;
  };

  const parseTimeFromEditing = (value: string) => {
    const [startTime, endTime] = value.split('|');
    return { startTime, endTime };
  };

  const isValidTime = (timeString: string) => {
    if (!timeString) return true; // Allow empty times
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  };

  const validateTimeInput = (value: string) => {
    const { startTime, endTime } = parseTimeFromEditing(value);
    return isValidTime(startTime) && isValidTime(endTime);
  };

  const toggleDayExpansion = (dateKey: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const expandAllDays = () => {
    const allDates = groupedActivities.map(([date]) => date);
    setExpandedDays(new Set(allDates));
  };

  const collapseAllDays = () => {
    setExpandedDays(new Set());
  };

  const isExpanded = (dateKey: string) => expandedDays.has(dateKey);

  // Keyboard support for expand/collapse
  const handleExpandKeyDown = (event: React.KeyboardEvent, dateKey: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleDayExpansion(dateKey);
    }
  };

  const groupedActivities = groupActivitiesByDate(activeActivities);

  // Persist expanded states to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && itineraryId) {
      try {
        localStorage.setItem(`expandedDays-${itineraryId}`, JSON.stringify([...expandedDays]));
      } catch (error) {
        console.warn('Failed to save expanded days to localStorage:', error);
      }
    }
  }, [expandedDays, itineraryId]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'e':
            event.preventDefault();
            expandAllDays();
            break;
          case 'c':
            event.preventDefault();
            collapseAllDays();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
        <>
          {/* Expand/Collapse All Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {groupedActivities.length} {groupedActivities.length === 1 ? 'day' : 'days'} with activities
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAllDays}
                className="text-xs"
                title="Expand all day sections (Ctrl+Shift+E)"
              >
                Expand All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAllDays}
                className="text-xs"
                title="Collapse all day sections (Ctrl+Shift+C)"
              >
                Collapse All
              </Button>
            </div>
          </div>
        </>
      )}
      
      {groupedActivities.length > 0 && (
        groupedActivities.map(([date, activities]) => {
          const dateInfo = formatDate(date);
          const expanded = isExpanded(date);
          
          return (
            <Collapsible key={date} open={expanded} onOpenChange={() => toggleDayExpansion(date)}>
              <div className="space-y-4">
                {/* Day Header - Now a clickable trigger */}
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
                    
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>
                        {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                      </span>
                      {!expanded && activities.length > 0 && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" 
                             title={`${activities.length} activities hidden`} />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>

                {/* Collapsible Activities Content */}
                <CollapsibleContent className="collapsible-content space-y-3">
                  <div className={cn("space-y-3", isMobile ? "ml-8" : "ml-10")}>
                    {activities.map((activity, index) => (
                  <Card key={activity.itinerary_activity_id} className="hover:shadow-md transition-shadow">
                    <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
                      <div className={cn("flex items-start", isMobile ? "gap-3" : "gap-4")}>
                        {/* Time indicator */}
                        <div className={cn("flex flex-col items-center", isMobile ? "min-w-[70px]" : "min-w-[110px]")}>
                          {editingField?.activityId === activity.itinerary_activity_id && editingField.field === 'time' ? (
                            <div className="space-y-2 w-full">
                              <Input
                                value={editingValues[`${activity.itinerary_activity_id}-time`] || ''}
                                onChange={(e) => setEditingValues({
                                  ...editingValues,
                                  [`${activity.itinerary_activity_id}-time`]: e.target.value
                                })}
                                onKeyDown={(e) => handleEditKeyDown(e, activity)}
                                className={cn(
                                  "text-xs h-7 text-center",
                                  !validateTimeInput(editingValues[`${activity.itinerary_activity_id}-time`] || '') && "border-red-500"
                                )}
                                placeholder="09:00|17:00"
                                autoFocus
                              />
                              <div className="flex justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => saveField(activity)}
                                  disabled={savingStates[`${activity.itinerary_activity_id}-time`] || 
                                           !validateTimeInput(editingValues[`${activity.itinerary_activity_id}-time`] || '')}
                                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  {savingStates[`${activity.itinerary_activity_id}-time`] ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEditing}
                                  className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="text-xs text-gray-400 text-center">HH:MM format</div>
                            </div>
                          ) : (
                            <div 
                              className="cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors group"
                              onClick={() => startEditing(
                                activity.itinerary_activity_id,
                                'time',
                                formatTimeForEditing(activity.start_time, activity.end_time)
                              )}
                              title="Click to edit times"
                            >
                              {activity.start_time ? (
                                <>
                                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                    {formatTime(activity.start_time)}
                                  </span>
                                  {activity.end_time && (
                                    <>
                                      <div className="w-px h-4 bg-gray-300 my-1" />
                                      <span className="text-xs text-gray-500 group-hover:text-blue-600">
                                        {formatTime(activity.end_time)}
                                      </span>
                                    </>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-gray-400 group-hover:text-blue-600">Add time</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Activity details */}
                        <div className="flex-1 space-y-2">
                          {/* Title and type */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {editingField?.activityId === activity.itinerary_activity_id && editingField.field === 'name' ? (
                                <div className="flex items-center gap-2 mb-1">
                                  <Input
                                    value={editingValues[`${activity.itinerary_activity_id}-name`] || ''}
                                    onChange={(e) => setEditingValues({
                                      ...editingValues,
                                      [`${activity.itinerary_activity_id}-name`]: e.target.value
                                    })}
                                    onKeyDown={(e) => handleEditKeyDown(e, activity)}
                                    className="font-medium text-gray-900 h-8 text-base"
                                    autoFocus
                                    placeholder="Activity name"
                                  />
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => saveField(activity)}
                                      disabled={savingStates[`${activity.itinerary_activity_id}-name`]}
                                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      {savingStates[`${activity.itinerary_activity_id}-name`] ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Check className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={cancelEditing}
                                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <h3 
                                  className="font-medium text-gray-900 mb-1 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                                  onClick={() => startEditing(
                                    activity.itinerary_activity_id, 
                                    'name', 
                                    activity.activity?.name || ''
                                  )}
                                  title="Click to edit activity name"
                                >
                                  {activity.activity?.name || 'Unnamed Activity'}
                                </h3>
                              )}
                              
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
                            {editingField?.activityId === activity.itinerary_activity_id && editingField.field === 'notes' ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingValues[`${activity.itinerary_activity_id}-notes`] || ''}
                                  onChange={(e) => setEditingValues({
                                    ...editingValues,
                                    [`${activity.itinerary_activity_id}-notes`]: e.target.value
                                  })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                      e.preventDefault();
                                      saveField(activity);
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      cancelEditing();
                                    }
                                  }}
                                  className="min-h-[80px] text-sm resize-y"
                                  placeholder="Add notes about this activity..."
                                  autoFocus
                                />
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-400">Ctrl+Enter to save, Esc to cancel</div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => saveField(activity)}
                                      disabled={savingStates[`${activity.itinerary_activity_id}-notes`]}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      {savingStates[`${activity.itinerary_activity_id}-notes`] ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                      ) : (
                                        <Save className="h-4 w-4 mr-1" />
                                      )}
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={cancelEditing}
                                      className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {activity.notes ? (
                                  <div 
                                    className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors group border border-dashed border-gray-200 hover:border-gray-300"
                                    onClick={() => startEditing(
                                      activity.itinerary_activity_id,
                                      'notes',
                                      activity.notes || ''
                                    )}
                                    title="Click to edit notes"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="text-gray-400 group-hover:text-blue-500">
                                        <Edit3 className="h-4 w-4" />
                                      </div>
                                      <div className="flex-1 group-hover:text-blue-600">
                                        {activity.notes}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startEditing(
                                      activity.itinerary_activity_id,
                                      'notes',
                                      ''
                                    )}
                                    className="text-gray-500 hover:text-blue-600 hover:border-blue-300 border-dashed"
                                  >
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    Add notes
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })
      )}
    </div>
  );
}