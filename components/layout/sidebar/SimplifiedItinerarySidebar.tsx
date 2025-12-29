"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, MapPin, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ActivityCreatedBy } from '@/components/collaboration/ActivityCreatedBy';
import { useToast } from '@/components/ui/use-toast';
import { useParams } from 'next/navigation';
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
  getActivityTypeIcon 
}: { 
  activity: any;
  getActivityTypeIcon: (types: string[] | undefined) => string;
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
        style={style}
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
          "p-2 rounded-md bg-muted/30 hover:bg-muted/60 transition-all duration-200",
          "cursor-move group border border-transparent hover:border-muted-foreground/20",
          isDragging && "opacity-50 shadow-lg"
        )}
      >
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
  const { itineraryActivities, reorderItineraryActivities, updateItineraryActivity } = useItineraryActivityStore();
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const MAX_VISIBLE_ACTIVITIES = 3;
  
  // Filter out deleted activities
  const activeActivities = itineraryActivities.filter(activity => !activity.deleted_at);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group activities by date
  const activitiesByDate = activeActivities.reduce((acc, activity) => {
    const date = activity.date ? format(new Date(activity.date), 'yyyy-MM-dd') : 'Unscheduled';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof activeActivities>);

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
      const dateActivities = activitiesByDate[activeDate];
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
        <p className="text-xs text-muted-foreground mt-1">
          {activeActivities.length} {activeActivities.length === 1 ? 'activity' : 'activities'} added
        </p>
      </div>

      {/* Activities List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {sortedDates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No activities added yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add activities from the explore page
              </p>
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
                      .map((activity) => (
                        <SortableActivityItem
                          key={activity.itinerary_activity_id}
                          activity={activity}
                          getActivityTypeIcon={getActivityTypeIcon}
                        />
                      ))}
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
