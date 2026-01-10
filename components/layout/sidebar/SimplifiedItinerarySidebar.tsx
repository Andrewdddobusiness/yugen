"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, MapPin, ChevronDown, ChevronUp, GripVertical, Filter, X } from 'lucide-react';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { ActivityCreatedBy } from '@/components/collaboration/ActivityCreatedBy';
import { useToast } from '@/components/ui/use-toast';
import { useParams } from 'next/navigation';
import { useIsFetching, useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ACTIVITY_ACCENT_BORDER_CLASSES, getActivityThemeForTypes } from '@/lib/activityAccent';
import { useItineraryLayoutStore } from '@/store/itineraryLayoutStore';
import { listItineraryDestinationsSummary } from '@/actions/supabase/destinations';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDndMonitor,
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
import {
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

type SidebarActivityCategory = "food" | "shopping" | "attraction" | "scenery" | "activity";

const SIDEBAR_CATEGORY_OPTIONS: Array<{
  value: SidebarActivityCategory;
  label: string;
  icon: string;
}> = [
  { value: "food", label: "Food", icon: "🍽️" },
  { value: "shopping", label: "Shopping", icon: "🛍️" },
  { value: "attraction", label: "Attraction", icon: "🎯" },
  { value: "scenery", label: "Scenery", icon: "🌿" },
  { value: "activity", label: "Other", icon: "📍" },
];

const inferSidebarCategory = (types: string[] | undefined): SidebarActivityCategory => {
  const typeSet = new Set((types ?? []).map((type) => type.toLowerCase()));

  const hasAny = (candidates: string[]) => candidates.some((candidate) => typeSet.has(candidate));

  if (
    hasAny([
      "restaurant",
      "meal_takeaway",
      "meal_delivery",
      "cafe",
      "bakery",
      "bar",
      "coffee_shop",
      "sandwich_shop",
      "food",
    ])
  ) {
    return "food";
  }

  if (
    hasAny([
      "shopping_mall",
      "department_store",
      "clothing_store",
      "shoe_store",
      "electronics_store",
      "jewelry_store",
      "book_store",
      "convenience_store",
      "supermarket",
      "grocery_or_supermarket",
      "store",
      "market",
    ])
  ) {
    return "shopping";
  }

  if (
    hasAny([
      "tourist_attraction",
      "museum",
      "art_gallery",
      "amusement_park",
      "aquarium",
      "zoo",
      "church",
      "synagogue",
      "mosque",
      "hindu_temple",
      "stadium",
      "historical_landmark",
      "landmark",
    ])
  ) {
    return "attraction";
  }

  if (
    hasAny([
      "park",
      "natural_feature",
      "beach",
      "campground",
      "rv_park",
      "mountain",
      "scenic_view",
      "botanical_garden",
    ])
  ) {
    return "scenery";
  }

  return "activity";
};

function SidebarActivitiesSkeleton() {
  return (
    <div className="p-3 space-y-4">
      {Array.from({ length: 3 }).map((_, group) => (
        <div key={group} className="space-y-2">
          <div className="flex items-center justify-between px-1 py-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="space-y-1.5 pl-5">
            {Array.from({ length: 3 }).map((__, i) => (
              <div key={i} className="rounded-md border border-transparent bg-muted/30 p-2">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Droppable Date Header Component
function DroppableDateHeader({ date, activitiesCount, isCollapsed, onToggle }: {
  date: string;
  activitiesCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `date-header-${date}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors",
        isOver && "bg-blue-100/50 border-blue-300"
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="w-full justify-start px-1 py-0.5 h-auto hover:bg-muted/50 text-xs font-medium text-muted-foreground transition-all"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            {date === 'Unscheduled' ? (
              'Unscheduled'
            ) : (
              format(new Date(date), 'EEE, MMM d')
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {activitiesCount}
            </Badge>
            {isCollapsed ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
            ) : (
              <ChevronUp className="h-3 w-3 text-muted-foreground/60" />
            )}
          </div>
        </div>
      </Button>
    </div>
  );
}

// Sortable Activity Item Component
function SortableActivityItem({ 
  activity, 
  getActivityTypeIcon,
  accentBorderClassName,
  accentBorderColor,
}: { 
  activity: any;
  getActivityTypeIcon: (types: string[] | undefined) => string;
  accentBorderClassName: string;
  accentBorderColor?: string;
}) {
  const { itineraryId, destinationId } = useParams();
  const duplicateItineraryActivity = useItineraryActivityStore((s) => s.duplicateItineraryActivity);
  const deleteItineraryActivityInstance = useItineraryActivityStore(
    (s) => s.deleteItineraryActivityInstance
  );
  const { toast } = useToast();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `sidebar:${activity.itinerary_activity_id}`,
    data: {
      type: "itinerary-activity",
      item: activity,
    },
  });

  const [contextMenu, setContextMenu] = useState<null | { x: number; y: number }>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menu = contextMenuRef.current;
      if (!menu) {
        setContextMenu(null);
        return;
      }
      if (menu.contains(event.target as Node)) return;
      setContextMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    const handleScrollOrResize = () => setContextMenu(null);

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [contextMenu]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={{ ...style, ...(accentBorderColor ? { borderLeftColor: accentBorderColor } : {}) }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();

          const padding = 8;
          const menuWidth = 200;
          const menuHeight = 88;
          const nextX = Math.min(e.clientX, window.innerWidth - menuWidth - padding);
          const nextY = Math.min(e.clientY, window.innerHeight - menuHeight - padding);
          setContextMenu({ x: nextX, y: nextY });
        }}
        className={cn(
          "w-full rounded-md border border-stroke-200 border-l-4 bg-muted/30 hover:bg-muted/60 transition-colors duration-200",
          "cursor-move group overflow-hidden",
          !accentBorderColor && accentBorderClassName,
          isDragging && "opacity-50 shadow-lg"
        )}
      >
        <div className="p-2">
          <div className="flex items-start gap-2">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="mt-0.5 cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground/60 group-hover:text-muted-foreground" />
            </div>

            {/* Activity Type Icon */}
            <span className="text-sm mt-0.5">
              {getActivityTypeIcon(activity.activity?.types)}
            </span>

            {/* Activity Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium truncate">
                  {activity.activity?.name || 'Unnamed Activity'}
                </p>
                <ActivityCreatedBy
                  userId={activity.created_by}
                  mode="avatar"
                  avatarClassName="h-5 w-5"
                />
              </div>
              
              {/* Time if scheduled */}
              {activity.start_time && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(`2024-01-01T${activity.start_time}`), 'h:mm a')}
                    {activity.end_time && (
                      <> - {format(new Date(`2024-01-01T${activity.end_time}`), 'h:mm a')}</>
                    )}
                  </span>
                </div>
              )}

              {/* Location preview */}
              {activity.activity?.address && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
                    {activity.activity.address.split(',')[0]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="fixed z-[10000] min-w-48 rounded-lg border border-stroke-200 bg-bg-0 shadow-card p-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-900 hover:bg-bg-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!itineraryId || !destinationId) return;
                duplicateItineraryActivity(
                  String(activity.itinerary_activity_id),
                  itineraryId.toString(),
                  destinationId.toString()
                );
                closeContextMenu();
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const result = await deleteItineraryActivityInstance(
                  String(activity.itinerary_activity_id)
                );

                if (!result.success) {
                  toast({
                    title: "Delete failed",
                    description: result.error ?? "Could not delete activity.",
                    variant: "destructive",
                  });
                  return;
                }

                toast({ title: "Removed from itinerary" });
                closeContextMenu();
              }}
            >
              Remove from itinerary
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

export function SimplifiedItinerarySidebar({
  useExternalDndContext = false,
}: {
  useExternalDndContext?: boolean;
}) {
  const { itineraryId, destinationId } = useParams();
  const { itineraryActivities, reorderItineraryActivities, updateItineraryActivity } = useItineraryActivityStore();
  const activityCategoryAccents = useItineraryLayoutStore((s) => s.activityCategoryAccents);
  const activityCategoryCustomColors = useItineraryLayoutStore((s) => s.activityCategoryCustomColors);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const itineraryIdValue = Array.isArray(itineraryId) ? itineraryId[0] : String(itineraryId ?? "");

  const { data: destinationsSummary = [] } = useQuery({
    queryKey: ["itineraryDestinationsSummary", itineraryIdValue],
    queryFn: async () => {
      const result = await listItineraryDestinationsSummary(itineraryIdValue);
      return result.success ? result.data ?? [] : [];
    },
    enabled: Boolean(itineraryIdValue),
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const filterStorageKey = itineraryIdValue ? `sidebar-filters:${itineraryIdValue}` : null;
  const [onlyUnscheduled, setOnlyUnscheduled] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<SidebarActivityCategory[]>([]);
  const [cityFilters, setCityFilters] = useState<string[]>([]);
  const hasLoadedFiltersRef = useRef(false);

  useEffect(() => {
    if (!filterStorageKey) return;
    if (hasLoadedFiltersRef.current) return;
    hasLoadedFiltersRef.current = true;

    try {
      const raw = window.localStorage.getItem(filterStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        onlyUnscheduled?: boolean;
        categoryFilters?: SidebarActivityCategory[];
        cityFilters?: string[];
      };

      setOnlyUnscheduled(Boolean(parsed.onlyUnscheduled));
      setCategoryFilters(Array.isArray(parsed.categoryFilters) ? parsed.categoryFilters : []);
      setCityFilters(Array.isArray(parsed.cityFilters) ? parsed.cityFilters : []);
    } catch {
      // ignore corrupted storage
    }
  }, [filterStorageKey]);

  useEffect(() => {
    if (!filterStorageKey) return;
    if (!hasLoadedFiltersRef.current) return;

    try {
      window.localStorage.setItem(
        filterStorageKey,
        JSON.stringify({ onlyUnscheduled, categoryFilters, cityFilters })
      );
    } catch {
      // ignore write failures (private mode, quota, etc.)
    }
  }, [filterStorageKey, onlyUnscheduled, categoryFilters, cityFilters]);
  
  // Filter out deleted activities
  const activeActivities = itineraryActivities.filter(activity => !activity.deleted_at);
  const isActivitiesFetching =
    useIsFetching({
      queryKey: ["itineraryActivities", itineraryId, destinationId],
    }) > 0;
  const showSkeleton = isActivitiesFetching && activeActivities.length === 0;

  const getCityKeyForActivity = useCallback(
    (activity: any) => {
      if (!activity?.date) return "Unscheduled";
      const dateValue = String(activity.date);
      const match = destinationsSummary.find(
        (destination) =>
          typeof destination?.from_date === "string" &&
          typeof destination?.to_date === "string" &&
          destination.from_date <= dateValue &&
          destination.to_date >= dateValue
      );
      return match?.city ? String(match.city) : "Other";
    },
    [destinationsSummary]
  );

  const categoryFilterSet = new Set(categoryFilters);
  const cityFilterSet = new Set(cityFilters);

  const cityOptions = (() => {
    const baseCities = destinationsSummary
      .map((destination) => String(destination.city ?? "").trim())
      .filter(Boolean);
    const uniqueCities = Array.from(new Set(baseCities));

    const hasUnscheduled = activeActivities.some((activity) => !activity.date);
    const hasOther = activeActivities.some(
      (activity) => activity.date && getCityKeyForActivity(activity) === "Other"
    );

    const options: string[] = [...uniqueCities];
    if (hasUnscheduled) options.unshift("Unscheduled");
    if (hasOther) options.push("Other");
    return options;
  })();

  const isCategoryFiltering =
    categoryFilterSet.size > 0 && categoryFilterSet.size < SIDEBAR_CATEGORY_OPTIONS.length;
  const isCityFiltering = cityFilterSet.size > 0 && cityFilterSet.size < cityOptions.length;

  const filteredActivities = activeActivities.filter((activity) => {
    if (onlyUnscheduled && activity.date) return false;

    if (isCategoryFiltering) {
      const category = inferSidebarCategory(activity.activity?.types);
      if (!categoryFilterSet.has(category)) return false;
    }

    if (isCityFiltering) {
      const cityKey = getCityKeyForActivity(activity);
      if (!cityFilterSet.has(cityKey)) return false;
    }

    return true;
  });

  const categoryCounts = filteredActivities.reduce(
    (acc, activity) => {
      const category = inferSidebarCategory(activity.activity?.types);
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    },
    {} as Record<SidebarActivityCategory, number>
  );

  const cityCounts = filteredActivities.reduce(
    (acc, activity) => {
      const key = getCityKeyForActivity(activity);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const activeFilterCount =
    (onlyUnscheduled ? 1 : 0) +
    (isCategoryFiltering ? 1 : 0) +
    (isCityFiltering ? 1 : 0);

  const clearFilters = () => {
    setOnlyUnscheduled(false);
    setCategoryFilters([]);
    setCityFilters([]);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group activities by date
  const activitiesByDateAll = activeActivities.reduce((acc, activity) => {
    const date = activity.date ? format(new Date(activity.date), 'yyyy-MM-dd') : 'Unscheduled';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof activeActivities>);

  const activitiesByDate = filteredActivities.reduce((acc, activity) => {
    const date = activity.date ? format(new Date(activity.date), 'yyyy-MM-dd') : 'Unscheduled';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof filteredActivities>);

  // Sort dates
  const sortedDates = Object.keys(activitiesByDate).sort((a, b) => {
    if (a === 'Unscheduled') return 1;
    if (b === 'Unscheduled') return -1;
    return a.localeCompare(b);
  });

  const getActivityTypeIcon = (types: string[] | undefined) => {
    if (!types || types.length === 0) return '📍';
    if (types.includes('restaurant')) return '🍽️';
    if (types.includes('lodging')) return '🏨';
    if (types.includes('tourist_attraction')) return '🎯';
    if (types.includes('museum')) return '🏛️';
    if (types.includes('park')) return '🌳';
    if (types.includes('shopping_mall')) return '🛍️';
    if (types.includes('cafe')) return '☕';
    if (types.includes('bar')) return '🍺';
    return '📍';
  };

  const toggleDateCollapse = (date: string) => {
    const newCollapsed = new Set(collapsedDates);
    if (newCollapsed.has(date)) {
      newCollapsed.delete(date);
    } else {
      newCollapsed.add(date);
    }
    setCollapsedDates(newCollapsed);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const toItineraryActivityId = (id: unknown) => {
      const raw = String(id);
      return raw.startsWith('sidebar:') ? raw.slice('sidebar:'.length) : raw;
    };
    const dragData = event.active.data?.current as any;
    if (dragData?.type !== 'itinerary-activity') return;
    setActiveId(toItineraryActivityId(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const toItineraryActivityId = (id: unknown) => {
      const raw = String(id);
      return raw.startsWith('sidebar:') ? raw.slice('sidebar:'.length) : raw;
    };
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const dragData = active.data?.current as any;
    if (dragData?.type !== 'itinerary-activity') {
      setActiveId(null);
      return;
    }

    const activeActivityId = toItineraryActivityId(active.id);
    const overActivityId = toItineraryActivityId(over.id);

    const activeActivity = itineraryActivities.find(
      (activity) => activity.itinerary_activity_id === activeActivityId
    );

    if (!activeActivity) {
      setActiveId(null);
      return;
    }

    // Check if we're dropping over a date header (for cross-date transfer)
    const overIdString = over.id.toString();
    if (overIdString.startsWith('date-header-')) {
      // Extract the target date from the drop zone ID
      const targetDate = overIdString.replace('date-header-', '');
      
      // Update the activity's date
      const updatedActivity = {
        ...activeActivity,
        date: targetDate === 'Unscheduled' ? null : targetDate,
        start_time: null, // Clear time when moving to new date
        end_time: null
      };

      // Update the activities list
      const updatedActivities = itineraryActivities.map(activity =>
        activity.itinerary_activity_id === activeActivityId ? updatedActivity : activity
      );

      reorderItineraryActivities(updatedActivities);
      
      // Also persist to backend
      updateItineraryActivity(updatedActivity);
      
      setActiveId(null);
      return;
    }

    // Handle reordering within same date or between dates
    const overActivity = itineraryActivities.find(
      (activity) => activity.itinerary_activity_id === overActivityId
    );

    if (!overActivity) {
      setActiveId(null);
      return;
    }

    const activeDate = activeActivity.date 
      ? format(new Date(activeActivity.date), 'yyyy-MM-dd') 
      : 'Unscheduled';
    const overDate = overActivity.date 
      ? format(new Date(overActivity.date), 'yyyy-MM-dd') 
      : 'Unscheduled';

    if (activeDate === overDate) {
      // Reordering within same date
      const dateActivities = activitiesByDateAll[activeDate] ?? [];
      const oldIndex = dateActivities.findIndex(
        (activity) => activity.itinerary_activity_id === activeActivityId
      );
      const newIndex = dateActivities.findIndex(
        (activity) => activity.itinerary_activity_id === overActivityId
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedDateActivities = arrayMove(dateActivities, oldIndex, newIndex);
        
        // Update the store with reordered activities
        const allOtherActivities = activeActivities.filter(
          (activity) => {
            const activityDate = activity.date 
              ? format(new Date(activity.date), 'yyyy-MM-dd') 
              : 'Unscheduled';
            return activityDate !== activeDate;
          }
        );
        
        const newAllActivities = [...allOtherActivities, ...reorderedDateActivities];
        reorderItineraryActivities(newAllActivities);
      }
    } else {
      // Moving between different dates
      const updatedActivity = {
        ...activeActivity,
        date: overActivity.date,
        start_time: null, // Clear time when moving to new date
        end_time: null
      };

      // Remove from old date and add to new date at the position of the drop target
      const otherActivities = itineraryActivities.filter(
        activity => activity.itinerary_activity_id !== activeActivityId
      );
      
      const overIndex = otherActivities.findIndex(
        activity => activity.itinerary_activity_id === overActivityId
      );
      
      const newActivities = [...otherActivities];
      newActivities.splice(overIndex, 0, updatedActivity);
      
      reorderItineraryActivities(newActivities);
      
      // Also persist to backend
      updateItineraryActivity(updatedActivity);
    }

    setActiveId(null);
  };

  // Get the currently dragged activity for the overlay
  const activeActivity = activeId ? itineraryActivities.find(
    activity => activity.itinerary_activity_id === activeId
  ) : null;

  const content = (
      <div className="h-full flex flex-col">
      {useExternalDndContext && (
        <SidebarDndMonitor
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        />
      )}
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gradient-to-b from-muted/30 to-background">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <div className="h-2 w-2 bg-blue-500 rounded-full" />
          Itinerary Overview
        </h3>
        {showSkeleton ? (
          <div className="mt-2">
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'} shown
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-xs justify-start"
              >
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filters
                {activeFilterCount > 0 ? (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 py-0 text-[11px]">
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-ink-900">Unscheduled only</div>
                  <div className="text-xs text-muted-foreground">Hide scheduled days</div>
                </div>
                <Switch checked={onlyUnscheduled} onCheckedChange={setOnlyUnscheduled} />
              </div>

              <Separator className="my-3" />

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </div>
                <div className="mt-2 space-y-2">
                  {SIDEBAR_CATEGORY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 text-sm cursor-pointer select-none"
                    >
                      <Checkbox
                        checked={categoryFilterSet.has(option.value)}
                        onCheckedChange={(checked) => {
                          setCategoryFilters((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(option.value);
                            else next.delete(option.value);
                            return Array.from(next);
                          });
                        }}
                      />
                      <span className="text-base leading-none">{option.icon}</span>
                      <span className="text-ink-900">{option.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {categoryCounts[option.value] ?? 0}
                      </span>
                    </label>
                  ))}
                </div>
                {categoryFilterSet.size === 0 ? (
                  <div className="mt-2 text-xs text-muted-foreground">Showing all types</div>
                ) : null}
              </div>

              {cityOptions.length > 0 ? (
                <>
                  <Separator className="my-3" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      City
                    </div>
                    <div className="mt-2 max-h-40 overflow-auto pr-1 space-y-2">
                      {cityOptions.map((city) => (
                        <label
                          key={city}
                          className="flex items-center gap-2 text-sm cursor-pointer select-none"
                        >
                          <Checkbox
                            checked={cityFilterSet.has(city)}
                            onCheckedChange={(checked) => {
                              setCityFilters((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(city);
                                else next.delete(city);
                                return Array.from(next);
                              });
                            }}
                          />
                          <span className="text-ink-900">{city}</span>
                          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {cityCounts[city] ?? 0}
                          </span>
                        </label>
                      ))}
                    </div>
                    {cityFilterSet.size === 0 ? (
                      <div className="mt-2 text-xs text-muted-foreground">Showing all cities</div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {activeFilterCount > 0 ? (
                <>
                  <Separator className="my-3" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start text-xs"
                    onClick={clearFilters}
                  >
                    <X className="h-3.5 w-3.5 mr-2" />
                    Clear filters
                  </Button>
                </>
              ) : null}
            </PopoverContent>
          </Popover>

          {activeFilterCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={clearFilters}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {/* Activities List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {showSkeleton ? (
            <SidebarActivitiesSkeleton />
          ) : sortedDates.length === 0 ? (
            <div className="text-center py-8">
              {activeActivities.length === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">No activities added yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add activities from the explore page
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">No matching activities</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try adjusting your filters.
                  </p>
                  {activeFilterCount > 0 ? (
                    <div className="mt-3 flex justify-center">
                      <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            sortedDates.map((date) => (
              <div key={date} className="space-y-2">
                {/* Date Header */}
                <DroppableDateHeader
                  date={date}
                  activitiesCount={activitiesByDate[date].length}
                  isCollapsed={collapsedDates.has(date)}
                  onToggle={() => toggleDateCollapse(date)}
                />

                {/* Activities for this date */}
                {!collapsedDates.has(date) && (
                  <SortableContext
                    items={activitiesByDate[date].map((a) => `sidebar:${a.itinerary_activity_id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5 pl-5">
                      {activitiesByDate[date]
                      .sort((a, b) => {
                        if (!a.start_time || !b.start_time) return 0;
                        return a.start_time.localeCompare(b.start_time);
                      })
                      .map((activity) => {
                        const { accent, customHex } = getActivityThemeForTypes(
                          activity.activity?.types,
                          activity.activity_id || activity.itinerary_activity_id,
                          activityCategoryAccents,
                          activityCategoryCustomColors
                        );

                        return (
                          <SortableActivityItem
                            key={activity.itinerary_activity_id}
                            activity={activity}
                            getActivityTypeIcon={getActivityTypeIcon}
                            accentBorderClassName={ACTIVITY_ACCENT_BORDER_CLASSES[accent]}
                            accentBorderColor={customHex ?? undefined}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                )}

                {date !== sortedDates[sortedDates.length - 1] && (
                  <Separator className="mt-3" />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      </div>
  );

  if (useExternalDndContext) {
    return content;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {content}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeActivity ? (
          <div className="p-2 rounded-md bg-muted/60 border border-muted-foreground/20 shadow-lg">
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5">
                {getActivityTypeIcon(activeActivity.activity?.types)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {activeActivity.activity?.name || 'Unnamed Activity'}
                </p>
                {activeActivity.start_time && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(`2024-01-01T${activeActivity.start_time}`), 'h:mm a')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SidebarDndMonitor({
  onDragStart,
  onDragEnd,
  onDragCancel,
}: {
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
}) {
  useDndMonitor({ onDragStart, onDragEnd, onDragCancel });
  return null;
}
