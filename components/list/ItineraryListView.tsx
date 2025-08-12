"use client";

import React, { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { format, isToday } from 'date-fns';
import { Clock, MapPin, Star, DollarSign, Phone, Globe, Edit3, Trash2, ChevronDown, ChevronRight, Check, X, Save, Loader2, GripVertical, Square, CheckSquare2, Move, FileDown, Calendar, StickyNote, Grid3x3 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { useDateRangeStore } from '@/store/dateRangeStore';
import { useItineraryLayoutStore } from '@/store/itineraryLayoutStore';
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
import { setItineraryActivityTimes, setItineraryActivityNotes, setActivityName, batchUpdateItineraryActivities } from '@/actions/supabase/actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { TravelTimeIndicator } from '@/components/travel/TravelTimeIndicator';
import { TravelTimeConflicts } from '@/components/travel/TravelTimeConflicts';
import { TravelTimeSettings } from '@/components/travel/TravelTimeSettings';
import { useTravelTimes } from '@/components/hooks/use-travel-times';
import { shouldShowTravelTime, getTravelTimeColor, formatTravelTime, getTotalTravelTimeForDay } from '@/utils/travel/travelTimeUtils';
import type { TravelMode } from '@/actions/google/travelTime';
import { SearchAndFilter, FilterableActivity } from '@/components/list/SearchAndFilter';
import { HighlightedText } from '@/components/ui/highlighted-text';
import { DayTimeSlots } from '@/components/list/DayTimeSlots';
import { BulkActionToolbar } from '@/components/list/BulkActionToolbar';

interface ItineraryListViewProps {
  showMap?: boolean;
  onToggleMap?: () => void;
  className?: string;
  targetDate?: Date | null;
}

export interface ItineraryListViewRef {
  scrollToDate: (date: Date) => void;
  containerRef: React.RefObject<HTMLDivElement>;
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

interface SortableActivityProps {
  activity: ItineraryActivity;
  index: number;
  editingField: { activityId: string; field: 'name' | 'time' | 'notes' } | null;
  editingValues: { [key: string]: string };
  savingStates: { [key: string]: boolean };
  onStartEditing: (activityId: string, field: 'name' | 'time' | 'notes', currentValue: string) => void;
  onCancelEditing: () => void;
  onSaveField: (activity: ItineraryActivity) => void;
  onRemoveActivity: (placeId: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent, activity: ItineraryActivity) => void;
  onEditingValueChange: (key: string, value: string) => void;
  formatTime: (timeString: string | null) => string | null;
  formatTimeForEditing: (startTime: string | null, endTime: string | null) => string;
  validateTimeInput: (value: string) => boolean;
  getPriceDisplay: (priceLevel?: string) => string | null;
  isMobile: boolean;
  isDragging?: boolean;
  // Bulk selection props
  isSelected: boolean;
  onToggleSelection: (activityId: string, selected: boolean, event?: React.MouseEvent) => void;
  selectionMode: boolean;
  searchTerm: string;
}

// Sortable Activity Component
function SortableActivity(props: SortableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isCurrentlyDragging,
  } = useSortable({ id: props.activity.itinerary_activity_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCurrentlyDragging ? 0.5 : 1,
  };

  const {
    activity,
    editingField,
    editingValues,
    savingStates,
    onStartEditing,
    onCancelEditing,
    onSaveField,
    onRemoveActivity,
    onEditKeyDown,
    onEditingValueChange,
    formatTime,
    formatTimeForEditing,
    validateTimeInput,
    getPriceDisplay,
    isMobile,
  } = props;

  return (
    <div ref={setNodeRef} style={style} data-sortable-id={activity.itinerary_activity_id}>
      <Card className={cn(
        "hover:shadow-md transition-shadow",
        isCurrentlyDragging && "shadow-lg ring-2 ring-blue-500",
        props.isSelected && "ring-2 ring-blue-500 bg-blue-50/30"
      )}>
        <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
          <div className={cn("flex items-start", isMobile ? "gap-3" : "gap-4")}>            
            {/* Selection Checkbox */}
            {props.selectionMode && (
              <div className="flex items-center justify-center pt-1">
                <button
                  className="flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onToggleSelection(activity.itinerary_activity_id, !props.isSelected, e);
                  }}
                  aria-label={`${props.isSelected ? 'Deselect' : 'Select'} ${activity.activity?.name || 'activity'}`}
                >
                  {props.isSelected ? (
                    <CheckSquare2 className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Square className="h-5 w-5 text-gray-400 hover:text-blue-500" />
                  )}
                </button>
              </div>
            )}
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="flex items-center justify-center cursor-move touch-none p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              title="Drag to reorder (or use Alt+Arrow keys)"
              tabIndex={0}
              aria-label="Drag to reorder activity"
            >
              <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>

            {/* Time indicator */}
            <div className={cn("flex flex-col items-center", isMobile ? "min-w-[70px]" : "min-w-[110px]")}>
              {editingField?.activityId === activity.itinerary_activity_id && editingField.field === 'time' ? (
                <div className="space-y-2 w-full">
                  <Input
                    value={editingValues[`${activity.itinerary_activity_id}-time`] || ''}
                    onChange={(e) => onEditingValueChange(
                      `${activity.itinerary_activity_id}-time`,
                      e.target.value
                    )}
                    onKeyDown={(e) => onEditKeyDown(e, activity)}
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
                      onClick={() => onSaveField(activity)}
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
                      onClick={onCancelEditing}
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
                  onClick={() => onStartEditing(
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
                        onChange={(e) => onEditingValueChange(
                          `${activity.itinerary_activity_id}-name`,
                          e.target.value
                        )}
                        onKeyDown={(e) => onEditKeyDown(e, activity)}
                        className="font-medium text-gray-900 h-8 text-base"
                        autoFocus
                        placeholder="Activity name"
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onSaveField(activity)}
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
                          onClick={onCancelEditing}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <h3 
                      className="font-medium text-gray-900 mb-1 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                      onClick={() => onStartEditing(
                        activity.itinerary_activity_id, 
                        'name', 
                        activity.activity?.name || ''
                      )}
                      title="Click to edit activity name"
                    >
                      <HighlightedText 
                        text={activity.activity?.name || 'Unnamed Activity'}
                        searchTerm={props.searchTerm}
                      />
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
                    onClick={() => onRemoveActivity(activity.activity?.place_id || '')}
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
                  <HighlightedText 
                    text={activity.activity.address}
                    searchTerm={props.searchTerm}
                  />
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
                      onChange={(e) => onEditingValueChange(
                        `${activity.itinerary_activity_id}-notes`,
                        e.target.value
                      )}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          onSaveField(activity);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          onCancelEditing();
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
                          onClick={() => onSaveField(activity)}
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
                          onClick={onCancelEditing}
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
                        onClick={() => onStartEditing(
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
                            <HighlightedText 
                              text={activity.notes || ''}
                              searchTerm={props.searchTerm}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onStartEditing(
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
    </div>
  );
}

export const ItineraryListView = forwardRef<ItineraryListViewRef, ItineraryListViewProps>(({ 
  showMap, 
  onToggleMap, 
  className,
  targetDate
}, ref) => {
  const { itineraryId } = useParams();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [editingField, setEditingField] = useState<{ activityId: string; field: 'name' | 'time' | 'notes' } | null>(null);
  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>({});
  const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({});
  const [draggedActivity, setDraggedActivity] = useState<ItineraryActivity | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [travelModes, setTravelModes] = useState<TravelMode[]>(['walking', 'driving']);
  const [filteredActivities, setFilteredActivities] = useState<FilterableActivity[]>([]);
  const [currentSearchTerm, setCurrentSearchTerm] = useState<string>('');
  
  // Get layout store functions
  const { saveViewState, getViewState } = useItineraryLayoutStore();
  
  // Initialize expanded days from store or defaults
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
    const viewState = getViewState('list');
    if (viewState.expandedDays.length > 0) {
      return new Set(viewState.expandedDays);
    }
    
    // Initially expand today's activities and unscheduled by default
    const today = new Date().toISOString().split("T")[0];
    return new Set([today, 'unscheduled']);
  });

  // Bulk selection state
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  
  // View mode state
  const [useTimeSlotView, setUseTimeSlotView] = useState(false);
  
  // Undo functionality
  const [undoStack, setUndoStack] = useState<{
    operation: string;
    data: ItineraryActivity[];
    timestamp: number;
  }[]>([]);
  const isMobile = useIsMobile();
  
  // Expose scrollToDate function and containerRef via ref
  useImperativeHandle(ref, () => ({
    scrollToDate: (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayElement = dayRefs.current.get(dateStr);
      
      if (dayElement && containerRef.current) {
        // Expand the day if it's collapsed
        setExpandedDays(prev => {
          const newSet = new Set([...prev, dateStr]);
          // Save expanded days to store
          saveViewState('list', {
            expandedDays: Array.from(newSet),
            lastScrollTarget: dateStr
          });
          return newSet;
        });
        
        // Scroll to the day element
        setTimeout(() => {
          dayElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }, 100); // Small delay to ensure expansion animation completes
      }
    },
    containerRef,
  }), [saveViewState]);
  
  const { itineraryActivities, removeItineraryActivity, setItineraryActivities } = useItineraryActivityStore();
  
  // DnD sensors setup with touch and mouse support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevents accidental drags
        tolerance: 5,
        delay: 100, // Small delay for touch devices
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
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

  const handleEditingValueChange = (key: string, value: string) => {
    setEditingValues({ ...editingValues, [key]: value });
  };

  // Bulk selection handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedActivities(new Set());
      setLastSelectedId(null);
    }
  };

  const toggleActivitySelection = (activityId: string, selected: boolean, event?: React.MouseEvent) => {
    const newSelected = new Set(selectedActivities);
    
    // Handle shift+click for range selection
    if (event?.shiftKey && lastSelectedId) {
      const visibleActivityIds = activitiesForGrouping.map(a => a.itinerary_activity_id);
      const lastIndex = visibleActivityIds.indexOf(lastSelectedId);
      const currentIndex = visibleActivityIds.indexOf(activityId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        
        for (let i = start; i <= end; i++) {
          if (selected) {
            newSelected.add(visibleActivityIds[i]);
          } else {
            newSelected.delete(visibleActivityIds[i]);
          }
        }
      }
    } else {
      // Regular single selection
      if (selected) {
        newSelected.add(activityId);
      } else {
        newSelected.delete(activityId);
      }
    }
    
    setSelectedActivities(newSelected);
    setLastSelectedId(activityId);
    
    // Auto-enable selection mode if activities are selected
    if (newSelected.size > 0 && !selectionMode) {
      setSelectionMode(true);
    }
  };


  const selectNone = () => {
    setSelectedActivities(new Set());
  };

  const selectDay = (date: string) => {
    const dayActivities = groupedActivities.find(([d]) => d === date)?.[1] || [];
    const dayActivityIds = dayActivities.map(a => a.itinerary_activity_id);
    const newSelected = new Set(selectedActivities);
    
    dayActivityIds.forEach(id => newSelected.add(id));
    setSelectedActivities(newSelected);
    setSelectionMode(true);
  };

  const isActivitySelected = (activityId: string) => selectedActivities.has(activityId);
  
  const getSelectedActivities = () => {
    return activitiesForGrouping.filter(activity => 
      selectedActivities.has(activity.itinerary_activity_id)
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activity = activeActivities.find(a => a.itinerary_activity_id === active.id);
    if (activity) {
      setDraggedActivity(activity);
      setActiveId(active.id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setDraggedActivity(null);
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setIsReordering(true);
    
    try {
      // Find the activities involved in the drag
      const activeActivity = activeActivities.find(a => a.itinerary_activity_id === active.id);
      const overActivity = activeActivities.find(a => a.itinerary_activity_id === over.id);

      if (!activeActivity || !overActivity) return;

      // Check if both activities are in the same day
      const activeDate = activeActivity.date || 'unscheduled';
      const overDate = overActivity.date || 'unscheduled';

      if (activeDate !== overDate) {
        toast.error('Activities can only be reordered within the same day');
        return;
      }

      // Get activities for this date
      const dateKey = activeDate === 'unscheduled' ? 'unscheduled' : new Date(activeDate).toISOString().split("T")[0];
      const dayActivities = activeActivities.filter(a => {
        const actDate = a.date || 'unscheduled';
        const actKey = actDate === 'unscheduled' ? 'unscheduled' : new Date(actDate).toISOString().split("T")[0];
        return actKey === dateKey;
      });

      // Find indices
      const oldIndex = dayActivities.findIndex(a => a.itinerary_activity_id === active.id);
      const newIndex = dayActivities.findIndex(a => a.itinerary_activity_id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Reorder activities
      const reorderedDayActivities = arrayMove(dayActivities, oldIndex, newIndex);

      // Update times if activities have times set
      const updatedActivities = await updateActivityTimes(reorderedDayActivities, dateKey);

      // Update the full activities list
      const newActivities = activeActivities.map(activity => {
        const updated = updatedActivities.find(a => a.itinerary_activity_id === activity.itinerary_activity_id);
        return updated || activity;
      });

      // Update local state
      setItineraryActivities(newActivities);

      // Update cache directly instead of invalidating
      queryClient.setQueryData(["itineraryActivities"], newActivities);

      toast.success('Activities reordered successfully');
    } catch (error) {
      console.error('Error reordering activities:', error);
      toast.error('Failed to reorder activities. Please try again.');
      
      // Keep invalidation on error to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["itineraryActivities"] });
    } finally {
      setIsReordering(false);
    }
  };

  // Helper function to update activity times after reordering
  const updateActivityTimes = async (activities: ItineraryActivity[], dateKey: string) => {
    // If it's unscheduled, no need to update times
    if (dateKey === 'unscheduled') return activities;

    // Calculate new times based on position
    const activitiesWithTimes = activities.filter(a => a.start_time);
    const activitiesWithoutTimes = activities.filter(a => !a.start_time);

    // If no activities have times, return as is
    if (activitiesWithTimes.length === 0) return activities;

    // Sort activities with times by their start time
    activitiesWithTimes.sort((a, b) => {
      if (!a.start_time || !b.start_time) return 0;
      return a.start_time.localeCompare(b.start_time);
    });

    // Update server with new order
    const updatePromises = activities.map(async (activity, index) => {
      // For now, we'll keep the times as they are
      // In a future enhancement, we could adjust times based on the new order
      return activity;
    });

    return Promise.all(updatePromises);
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
        
        // Update cache directly for successful operations
        queryClient.setQueryData(["itineraryActivities"], (oldData: any) => 
          oldData?.map((activity: any) => 
            activity.itinerary_activity_id === itinerary_activity_id 
              ? { ...activity, start_time: startTime, end_time: endTime }
              : activity
          ) || []
        );
        
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
      
      // Save expanded days to store
      saveViewState('list', {
        expandedDays: Array.from(newSet)
      });
      
      return newSet;
    });
  };


  const isExpanded = (dateKey: string) => expandedDays.has(dateKey);

  // Scroll position tracking
  const saveScrollPosition = useCallback(() => {
    if (containerRef.current) {
      const scrollPosition = containerRef.current.scrollTop;
      saveViewState('list', { scrollPosition });
    }
  }, [saveViewState]);

  const restoreScrollPosition = useCallback(() => {
    const viewState = getViewState('list');
    if (containerRef.current && viewState.scrollPosition > 0) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = viewState.scrollPosition;
        }
      }, 100);
    }
  }, [getViewState]);

  // Bulk action handlers
  const saveToUndoStack = (operation: string, affectedActivities: ItineraryActivity[]) => {
    setUndoStack(prev => [
      ...prev.slice(-4), // Keep only last 5 operations
      {
        operation,
        data: JSON.parse(JSON.stringify(affectedActivities)), // Deep clone
        timestamp: Date.now()
      }
    ]);
  };

  const handleBulkDelete = useCallback(async () => {
    const selectedItems = getSelectedActivities();
    if (selectedItems.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'}?`
    );
    
    if (!confirmed) return;

    // Save for undo (note: delete can't be easily undone, so we don't save to undo stack)
    setBulkOperationLoading(true);
    
    try {
      // Delete activities one by one
      await Promise.all(
        selectedItems.map(activity => 
          handleRemoveActivity(activity.activity?.place_id || '')
        )
      );
      
      setSelectedActivities(new Set());
      setSelectionMode(false);
      toast.success(`Deleted ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'}`);
    } catch (error) {
      console.error('Error deleting activities:', error);
      toast.error('Failed to delete some activities');
    } finally {
      setBulkOperationLoading(false);
    }
  }, [getSelectedActivities, handleRemoveActivity]);

  const handleBulkMove = async (targetDate: string) => {
    const selectedItems = getSelectedActivities();
    if (selectedItems.length === 0) return;

    // Save original state for undo
    saveToUndoStack('move', selectedItems);

    setBulkOperationLoading(true);
    
    try {
      // Move activities by updating their dates
      const updates = selectedItems.map(activity => ({
        itinerary_activity_id: activity.itinerary_activity_id,
        date: targetDate === 'unscheduled' ? null : targetDate,
        start_time: null, // Clear times when moving to new day
        end_time: null,
      }));
      
      const result = await batchUpdateItineraryActivities(updates);
      
      if (result.success) {
        // Update local state
        const updatedActivities = itineraryActivities.map(activity => {
          const update = updates.find(u => u.itinerary_activity_id === activity.itinerary_activity_id);
          return update ? { ...activity, ...update } : activity;
        });
        
        setItineraryActivities(updatedActivities);
        // Update cache directly instead of invalidating
        queryClient.setQueryData(["itineraryActivities"], updatedActivities);
        
        setSelectedActivities(new Set());
        setSelectionMode(false);
        
        const dateLabel = targetDate === 'unscheduled' ? 'Unscheduled' : format(new Date(targetDate), 'MMM d');
        toast.success(`Moved ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'} to ${dateLabel}`);
      } else {
        throw new Error(result.message || 'Move failed');
      }
    } catch (error) {
      console.error('Error moving activities:', error);
      toast.error('Failed to move activities');
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkAddNotes = async (notes: string) => {
    const selectedItems = getSelectedActivities();
    if (selectedItems.length === 0 || !notes.trim()) return;

    // Save original state for undo
    saveToUndoStack('notes', selectedItems);

    setBulkOperationLoading(true);
    
    try {
      await Promise.all(
        selectedItems.map(activity => 
          setItineraryActivityNotes(
            activity.itinerary_activity_id, 
            activity.notes ? `${activity.notes}\n\n${notes}` : notes
          )
        )
      );
      
      // Update local state
      const updatedActivities = itineraryActivities.map(activity => {
        if (selectedActivities.has(activity.itinerary_activity_id)) {
          return {
            ...activity,
            notes: activity.notes ? `${activity.notes}\n\n${notes}` : notes
          };
        }
        return activity;
      });
      
      setItineraryActivities(updatedActivities);
      // Update cache directly instead of invalidating  
      queryClient.setQueryData(["itineraryActivities"], updatedActivities);
      
      setSelectedActivities(new Set());
      setSelectionMode(false);
      
      toast.success(`Added notes to ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'}`);
    } catch (error) {
      console.error('Error adding notes:', error);
      toast.error('Failed to add notes to some activities');
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkSetTimes = async (startTime: string, endTime: string) => {
    const selectedItems = getSelectedActivities();
    if (selectedItems.length === 0) return;

    // Save original state for undo
    saveToUndoStack('times', selectedItems);

    setBulkOperationLoading(true);
    
    try {
      await Promise.all(
        selectedItems.map(activity => 
          setItineraryActivityTimes(
            activity.itinerary_activity_id,
            startTime || '',
            endTime || ''
          )
        )
      );
      
      // Update local state
      const updatedActivities = itineraryActivities.map(activity => {
        if (selectedActivities.has(activity.itinerary_activity_id)) {
          return {
            ...activity,
            start_time: startTime || null,
            end_time: endTime || null
          };
        }
        return activity;
      });
      
      setItineraryActivities(updatedActivities);
      // Update cache directly instead of invalidating  
      queryClient.setQueryData(["itineraryActivities"], updatedActivities);
      
      setSelectedActivities(new Set());
      setSelectionMode(false);
      
      const action = startTime || endTime ? 'Set times for' : 'Cleared times for';
      toast.success(`${action} ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'}`);
    } catch (error) {
      console.error('Error setting times:', error);
      toast.error('Failed to set times for some activities');
    } finally {
      setBulkOperationLoading(false);
    }
  };

  // Keyboard support for expand/collapse
  const handleExpandKeyDown = (event: React.KeyboardEvent, dateKey: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleDayExpansion(dateKey);
    }
  };

  // Convert activities to filterable format
  const filterableActivities: FilterableActivity[] = useMemo(() => {
    return activeActivities.map(activity => ({
      itinerary_activity_id: activity.itinerary_activity_id,
      date: activity.date,
      start_time: activity.start_time,
      end_time: activity.end_time,
      notes: activity.notes,
      activity: activity.activity ? {
        name: activity.activity.name,
        address: activity.activity.address,
        types: activity.activity.types,
        rating: activity.activity.rating,
        price_level: activity.activity.price_level,
        coordinates: activity.activity.coordinates,
      } : undefined,
    }));
  }, [activeActivities]);

  // Handle filtered activities from search component
  const handleFilteredActivitiesChange = useCallback((filtered: FilterableActivity[]) => {
    setFilteredActivities(filtered);
  }, []);

  // Handle search term change for highlighting
  const handleSearchTermChange = useCallback((searchTerm: string) => {
    setCurrentSearchTerm(searchTerm);
  }, []);

  // Initialize filtered activities when filterable activities change  
  const isInitialLoad = useRef(true);
  useEffect(() => {
    if (isInitialLoad.current && filterableActivities.length > 0) {
      setFilteredActivities(filterableActivities);
      isInitialLoad.current = false;
    }
  }, [filterableActivities]);

  // Convert filtered activities back to the original format for grouping
  const activitiesForGrouping = useMemo(() => {
    return activeActivities.filter(activity =>
      filteredActivities.some(filtered => 
        filtered.itinerary_activity_id === activity.itinerary_activity_id
      )
    );
  }, [activeActivities, filteredActivities]);

  const selectAllVisible = useCallback(() => {
    const visibleIds = activitiesForGrouping.map(a => a.itinerary_activity_id);
    setSelectedActivities(new Set(visibleIds));
    setSelectionMode(true);
  }, [activitiesForGrouping]);

  const groupedActivities = groupActivitiesByDate(activitiesForGrouping);

  const expandAllDays = useCallback(() => {
    const allDates = groupedActivities.map(([date]) => date);
    const newSet = new Set(allDates);
    setExpandedDays(newSet);
    
    // Save expanded days to store
    saveViewState('list', {
      expandedDays: Array.from(newSet)
    });
  }, [groupedActivities, saveViewState]);

  const collapseAllDays = useCallback(() => {
    const newSet = new Set<string>();
    setExpandedDays(newSet);
    
    // Save expanded days to store
    saveViewState('list', {
      expandedDays: Array.from(newSet)
    });
  }, [saveViewState]);

  // Generate available dates for bulk move
  const availableDates = useMemo(() => {
    const dates: { date: string; label: string; count: number }[] = [];
    
    groupedActivities.forEach(([date, activities]) => {
      if (date !== 'unscheduled') {
        const dateObj = new Date(date);
        dates.push({
          date,
          label: format(dateObj, 'EEEE, MMM d'),
          count: activities.length
        });
      }
    });
    
    return dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [groupedActivities]);

  // Bulk export handler
  const handleBulkExport = () => {
    const selectedItems = getSelectedActivities();
    if (selectedItems.length === 0) return;
    
    try {
      // Create CSV content
      const csvHeader = 'Name,Date,Start Time,End Time,Address,Notes,Category,Rating,Price Level\n';
      const csvRows = selectedItems.map(activity => {
        const name = (activity.activity?.name || 'Unnamed Activity').replace(/"/g, '""');
        const date = activity.date || '';
        const startTime = activity.start_time || '';
        const endTime = activity.end_time || '';
        const address = (activity.activity?.address || '').replace(/"/g, '""');
        const notes = (activity.notes || '').replace(/"/g, '""').replace(/\n/g, ' ');
        const category = activity.activity?.types?.[0] || '';
        const rating = activity.activity?.rating || '';
        const priceLevel = activity.activity?.price_level || '';
        
        return `"${name}","${date}","${startTime}","${endTime}","${address}","${notes}","${category}","${rating}","${priceLevel}"`;
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `selected-activities-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${selectedItems.length} ${selectedItems.length === 1 ? 'activity' : 'activities'} to CSV`);
    } catch (error) {
      console.error('Error exporting activities:', error);
      toast.error('Failed to export activities');
    }
  };

  // Travel time integration
  const { 
    travelTimes, 
    loading: travelTimesLoading, 
    error: travelTimesError,
    refreshTravelTimes
  } = useTravelTimes(
    groupedActivities.map(([date, activities]) => [
      date,
      activities.map(activity => ({
        itinerary_activity_id: activity.itinerary_activity_id,
        start_time: activity.start_time,
        end_time: activity.end_time,
        activity: activity.activity ? {
          name: activity.activity.name,
          coordinates: activity.activity.coordinates
        } : undefined
      }))
    ]),
    { modes: travelModes, autoRefresh: false }
  );

  // Restore scroll position on mount and when switching to this view
  useEffect(() => {
    restoreScrollPosition();
  }, [restoreScrollPosition]);

  // Save scroll position on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveScrollPosition, 150); // Debounce scroll saves
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [saveScrollPosition]);

  // Save scroll position before component unmounts or view changes
  useEffect(() => {
    return () => {
      saveScrollPosition();
    };
  }, [saveScrollPosition]);

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

      // Bulk selection shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'a':
            event.preventDefault();
            selectAllVisible();
            break;
          case 'd':
            event.preventDefault();
            selectNone();
            break;
        }
      }
      
      // Delete selected activities
      if (event.key === 'Delete' && selectedActivities.size > 0) {
        event.preventDefault();
        handleBulkDelete();
      }
      
      // Toggle selection mode
      if (event.key === 'Escape' && selectionMode) {
        event.preventDefault();
        setSelectionMode(false);
        setSelectedActivities(new Set());
      }
      
      // Undo last bulk operation
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && undoStack.length > 0) {
        event.preventDefault();
        // TODO: Implement undo functionality
        toast.info('Undo functionality coming soon!');
      }

      // Alt + Arrow keys for reordering within focused activity
      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        
        // Find the focused element
        const focusedElement = document.activeElement;
        if (!focusedElement) return;

        // Find the parent sortable item
        const sortableItem = focusedElement.closest('[data-sortable-id]');
        if (!sortableItem) return;

        const activityId = sortableItem.getAttribute('data-sortable-id');
        if (!activityId) return;

        // Find the activity and its current position
        const activity = activeActivities.find(a => a.itinerary_activity_id === activityId);
        if (!activity) return;

        const dateKey = activity.date ? new Date(activity.date).toISOString().split("T")[0] : 'unscheduled';
        const dayActivities = activeActivities.filter(a => {
          const actDate = a.date || 'unscheduled';
          const actKey = actDate === 'unscheduled' ? 'unscheduled' : new Date(actDate).toISOString().split("T")[0];
          return actKey === dateKey;
        });

        const currentIndex = dayActivities.findIndex(a => a.itinerary_activity_id === activityId);
        if (currentIndex === -1) return;

        // Determine new index
        const newIndex = event.key === 'ArrowUp' 
          ? Math.max(0, currentIndex - 1)
          : Math.min(dayActivities.length - 1, currentIndex + 1);

        if (newIndex === currentIndex) return;

        // Reorder activities
        const reorderedDayActivities = arrayMove(dayActivities, currentIndex, newIndex);

        // Update the full activities list
        const newActivities = activeActivities.map(act => {
          const updated = reorderedDayActivities.find(a => a.itinerary_activity_id === act.itinerary_activity_id);
          return updated || act;
        });

        // Update local state
        setItineraryActivities(newActivities);

        // Show feedback
        toast.success(`Moved ${activity.activity?.name || 'activity'} ${event.key === 'ArrowUp' ? 'up' : 'down'}`);

        // Maintain focus on the moved item
        setTimeout(() => {
          const movedItem = document.querySelector(`[data-sortable-id="${activityId}"]`);
          if (movedItem) {
            const focusableElement = movedItem.querySelector('button, [tabindex="0"]') as HTMLElement;
            focusableElement?.focus();
          }
        }, 100);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeActivities, setItineraryActivities, collapseAllDays, expandAllDays, handleBulkDelete, selectAllVisible, selectedActivities.size, selectionMode, undoStack.length]);

  return (
    <div ref={containerRef} className={cn("space-y-6", isMobile ? "p-4" : "p-6", className)}>
      {/* Search and Filter Component */}
      <SearchAndFilter
        activities={filterableActivities}
        onFilteredActivitiesChange={handleFilteredActivitiesChange}
        onSearchTermChange={handleSearchTermChange}
        className="-mx-2 -mt-2"
      />

      {/* Bulk Action Toolbar */}
      {selectionMode && (
        <div role="toolbar" aria-label="Bulk actions for selected activities">
          <BulkActionToolbar
            selectedCount={selectedActivities.size}
            onSelectAll={selectAllVisible}
            onSelectNone={selectNone}
            onBulkDelete={handleBulkDelete}
            onBulkMove={handleBulkMove}
            onBulkAddNotes={handleBulkAddNotes}
            onBulkSetTimes={handleBulkSetTimes}
            onBulkExport={handleBulkExport}
            onToggleSelectionMode={toggleSelectionMode}
            availableDates={availableDates}
            loading={bulkOperationLoading}
          />
        </div>
      )}

      {activeActivities.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No activities in itinerary</h3>
            <p className="text-sm">Add activities to your itinerary to see them here.</p>
          </div>
        </div>
      ) : groupedActivities.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No activities match current filters</h3>
            <p className="text-sm">Try adjusting your search or filters to see more results.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Expand/Collapse All Controls */}
          <div className="flex items-center justify-between" role="region" aria-label="Activity list controls">
            <div className="text-sm text-muted-foreground">
              {filteredActivities.length === activeActivities.length 
                ? `${groupedActivities.length} ${groupedActivities.length === 1 ? 'day' : 'days'} with activities`
                : `Showing ${filteredActivities.length} of ${activeActivities.length} activities in ${groupedActivities.length} ${groupedActivities.length === 1 ? 'day' : 'days'}`
              }
            </div>
            <div className="flex items-center gap-2">
              {/* Selection Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectionMode}
                className={cn(
                  "text-xs flex items-center gap-1",
                  selectionMode ? "bg-blue-100 text-blue-700" : "text-gray-600"
                )}
                title="Toggle selection mode (or select activities to auto-enable)"
              >
                {selectionMode ? (
                  <CheckSquare2 className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Select
              </Button>
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
              <TravelTimeSettings
                defaultModes={travelModes}
                onModesChange={setTravelModes}
                onRefresh={() => refreshTravelTimes()}
              />
              <Button
                variant={useTimeSlotView ? "default" : "outline"}
                size="sm"
                onClick={() => setUseTimeSlotView(!useTimeSlotView)}
                className="text-xs"
                title={useTimeSlotView ? "Switch to simple list view" : "Switch to time slot view"}
              >
                <Grid3x3 className="h-3 w-3 mr-1" />
                {useTimeSlotView ? "Time Slots" : "Time View"}
              </Button>
              <div className="text-xs text-muted-foreground pl-2 border-l" aria-label="Keyboard shortcuts">
                <span className="hidden sm:inline">Drag </span>
                <GripVertical className="inline h-3 w-3" aria-hidden="true" />
                <span className="hidden sm:inline"> or Alt+↑↓ to reorder</span>
                <span className="sm:hidden">Alt+↑↓ reorder</span>
              </div>
              {isReordering && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Reordering...
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {groupedActivities.length > 0 && (
        <div role="main" aria-label="Itinerary activities by day">
          {groupedActivities.map(([date, activities]) => {
          const dateInfo = formatDate(date);
          const expanded = isExpanded(date);
          
          return (
            <Collapsible key={date} open={expanded} onOpenChange={() => toggleDayExpansion(date)}>
              <div 
                ref={(el) => {
                  if (el) {
                    dayRefs.current.set(date, el);
                  } else {
                    dayRefs.current.delete(date);
                  }
                }}
                className="space-y-4"
              >
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
                    
                    <div className="text-sm text-muted-foreground flex items-center gap-3">
                      <span>
                        {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                      </span>
                      {selectionMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => selectDay(date)}
                          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1 h-auto"
                          title="Select all activities in this day"
                        >
                          Select Day
                        </Button>
                      )}
                      {/* Travel time summary */}
                      {(() => {
                        const dayTravelTimes = travelTimes[date] || [];
                        if (dayTravelTimes.length > 0) {
                          const totalTravel = getTotalTravelTimeForDay(dayTravelTimes);
                          return (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {totalTravel.formattedDuration} travel
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {!expanded && activities.length > 0 && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" 
                             title={`${activities.length} activities hidden`} />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>

                {/* Collapsible Activities Content */}
                <CollapsibleContent className="collapsible-content space-y-3">
                  {useTimeSlotView ? (
                    // Time Slot View - Use DayTimeSlots component
                    <DayTimeSlots
                      date={date}
                      activities={activities}
                      isExpanded={true} // Always expanded since we're inside CollapsibleContent
                      onToggleExpanded={() => {}} // No-op since parent Collapsible handles this
                      onActivityEdit={(activityId) => startEditing(activityId, 'name', activities.find(a => a.itinerary_activity_id === activityId)?.activity?.name || '')}
                      onActivityDelete={handleBulkDelete}
                      onActivitySelect={(activityId) => toggleSelection(activityId)}
                      selectedActivities={selectedActivities}
                      editingActivity={editingField?.activityId}
                      travelTimes={travelTimes[date] ? Object.fromEntries(
                        travelTimes[date].map(t => [t.fromActivityId, formatTravelTime(t.duration, t.mode)])
                      ) : {}}
                      travelTimesData={travelTimes[date] ? Object.fromEntries(
                        travelTimes[date].map(t => [t.fromActivityId, {
                          duration: t.duration,
                          durationValue: t.durationValue,
                          mode: t.mode
                        }])
                      ) : {}}
                      onApplyTimeSuggestion={(activityId, newStartTime, newEndTime) => {
                        // Find the activity and apply time suggestion
                        const activity = activities.find(a => a.itinerary_activity_id === activityId);
                        if (activity && (newStartTime || newEndTime)) {
                          saveField({
                            ...activity,
                            start_time: newStartTime || activity.start_time,
                            end_time: newEndTime || activity.end_time
                          });
                        }
                      }}
                      onAddFreeTimeActivity={(startTime, duration, suggestion) => {
                        // Create a placeholder activity for the free time suggestion
                        // This would typically integrate with the activity search/add flow
                        console.log('Add free time activity:', { startTime, duration, suggestion });
                        // TODO: Integrate with activity creation flow
                      }}
                      className={cn(isMobile ? "ml-8" : "ml-10")}
                    />
                  ) : (
                    // Traditional List View - Existing drag-and-drop implementation
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={activities.map(a => a.itinerary_activity_id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className={cn("space-y-3", isMobile ? "ml-8" : "ml-10")}>
                          {activities.map((activity, index) => {
                            const nextActivity = activities[index + 1];
                            const dayTravelTimes = travelTimes[date] || [];
                            const travelTimeToNext = dayTravelTimes.find(
                              t => t.fromActivityId === activity.itinerary_activity_id
                            );
                          
                          return (
                            <React.Fragment key={activity.itinerary_activity_id}>
                              <SortableActivity
                                activity={activity}
                                index={index}
                                editingField={editingField}
                                editingValues={editingValues}
                                savingStates={savingStates}
                                onStartEditing={startEditing}
                                onCancelEditing={cancelEditing}
                                onSaveField={saveField}
                                onRemoveActivity={handleRemoveActivity}
                                onEditKeyDown={handleEditKeyDown}
                                onEditingValueChange={handleEditingValueChange}
                                formatTime={formatTime}
                                formatTimeForEditing={formatTimeForEditing}
                                validateTimeInput={validateTimeInput}
                                getPriceDisplay={getPriceDisplay}
                                isMobile={isMobile}
                                isSelected={isActivitySelected(activity.itinerary_activity_id)}
                                onToggleSelection={(activityId, selected, event) => 
                                  toggleActivitySelection(activityId, selected, event)
                                }
                                selectionMode={selectionMode}
                                searchTerm={currentSearchTerm}
                              />
                              
                              {/* Travel Time Indicator */}
                              {nextActivity && travelTimeToNext && shouldShowTravelTime(travelTimeToNext) && (
                                <div className="flex items-center justify-center py-2">
                                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-full px-4 py-2 border">
                                    <div className="h-4 w-4 text-gray-400">
                                      {travelTimeToNext.mode === 'walking' && '🚶'}
                                      {travelTimeToNext.mode === 'driving' && '🚗'}
                                      {travelTimeToNext.mode === 'transit' && '🚌'}
                                      {travelTimeToNext.mode === 'bicycling' && '🚲'}
                                    </div>
                                    <span className={cn("font-medium", getTravelTimeColor(travelTimeToNext.durationValue))}>
                                      {travelTimeToNext.duration}
                                    </span>
                                    <span className="text-gray-400">({travelTimeToNext.distance})</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Loading state for travel time */}
                              {nextActivity && travelTimesLoading[date] && !travelTimeToNext && (
                                <div className="flex items-center justify-center py-2">
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Calculating travel time...</span>
                                  </div>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </SortableContext>

                    {/* Drag Overlay */}
                    <DragOverlay>
                      {activeId && draggedActivity ? (
                        <Card className="shadow-xl opacity-90">
                          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-5 w-5 text-gray-400" />
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {draggedActivity.activity?.name || 'Unnamed Activity'}
                                </h3>
                                {draggedActivity.start_time && (
                                  <span className="text-sm text-gray-500">
                                    {formatTime(draggedActivity.start_time)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                  )}

                  {/* Travel Time Conflicts */}
                  {(() => {
                    const dayTravelTimes = travelTimes[date] || [];
                    if (dayTravelTimes.length > 0) {
                      const dayActivitiesWithCoords = activities.map(activity => ({
                        itinerary_activity_id: activity.itinerary_activity_id,
                        start_time: activity.start_time,
                        end_time: activity.end_time,
                        activity: activity.activity ? {
                          name: activity.activity.name,
                          coordinates: activity.activity.coordinates
                        } : undefined
                      }));
                      
                      return (
                        <div className={cn("mt-4", isMobile ? "ml-8" : "ml-10")}>
                          <TravelTimeConflicts
                            activities={dayActivitiesWithCoords}
                            travelTimes={dayTravelTimes}
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
          })}
        </div>
      )}
    </div>
  );
});

ItineraryListView.displayName = 'ItineraryListView';