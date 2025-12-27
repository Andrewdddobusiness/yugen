"use client";

import React, { useState } from 'react';
import { toast } from 'sonner';
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { useItineraryActivityStore, IItineraryActivity } from '@/store/itineraryActivityStore';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Use the interface from the store
type ItineraryActivity = IItineraryActivity;

interface ItineraryDragDropProviderProps {
  children: React.ReactNode;
  activities: ItineraryActivity[];
  isMobile: boolean;
  formatTime: (timeString: string | null) => string | null;
}

export function ItineraryDragDropProvider({ 
  children, 
  activities, 
  isMobile,
  formatTime 
}: ItineraryDragDropProviderProps) {
  const queryClient = useQueryClient();
  const { setItineraryActivities } = useItineraryActivityStore();
  
  const [draggedActivity, setDraggedActivity] = useState<ItineraryActivity | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [isReordering, setIsReordering] = useState(false);

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activity = activities.find(a => a.itinerary_activity_id === active.id);
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
    const previousActivities = useItineraryActivityStore.getState().itineraryActivities;
    
    try {
      // Find the activities involved in the drag
      const activeActivity = activities.find(a => a.itinerary_activity_id === active.id);
      const overActivity = activities.find(a => a.itinerary_activity_id === over.id);

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
      const dayActivities = activities.filter(a => {
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
      const newActivities = activities.map(activity => {
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

      // Revert local state on error.
      setItineraryActivities(previousActivities);
      queryClient.setQueryData(["itineraryActivities"], previousActivities);
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      
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
      
      {/* Reordering indicator */}
      {isReordering && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-white shadow-lg rounded-lg px-3 py-2 border z-50">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-600 font-medium">Reordering activities...</span>
        </div>
      )}
    </DndContext>
  );
}
