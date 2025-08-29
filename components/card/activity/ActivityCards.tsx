import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ActivityCard } from "./ActivityCard";
import { IActivityWithLocation } from "@/store/activityStore";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import PersistedQueryProvider from "@/components/provider/query/PersistedQueryProvider";
import { useSidebar } from "@/components/ui/sidebar";

interface IActivityCardsProps {
  activities: IActivityWithLocation[];
  onSelectActivity: (activity: IActivityWithLocation) => void;
  // onHover: (coordinates: [number, number]) => void;
}

export default function ActivityCards({ activities, onSelectActivity }: IActivityCardsProps) {
  const { open } = useSidebar();
  const queryClient = useQueryClient();
  const { itineraryId, destinationId } = useParams();
  const { insertItineraryActivity, removeItineraryActivity, isActivityAdded } = useItineraryActivityStore();
  
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});

  const handleAddToItinerary = async (activity: IActivityWithLocation) => {
    setLoadingStates(prev => ({ ...prev, [activity.place_id]: true }));
    try {
      await insertItineraryActivity(
        activity, 
        itineraryId.toString(), 
        destinationId.toString()
      );
      
      queryClient.invalidateQueries({
        queryKey: ["itineraryActivities", itineraryId, destinationId],
        exact: true,
      });
    } catch (error) {
      console.error("Error adding activity:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [activity.place_id]: false }));
    }
  };

  const handleRemoveFromItinerary = async (activity: IActivityWithLocation) => {
    setLoadingStates(prev => ({ ...prev, [activity.place_id]: true }));
    try {
      if (!activity || !itineraryId) return;
      
      await removeItineraryActivity(
        activity.place_id, 
        Array.isArray(itineraryId) ? itineraryId[0] : itineraryId
      );
      
      queryClient.invalidateQueries({
        queryKey: ["itineraryActivities", itineraryId, destinationId],
        exact: true,
      });
    } catch (error) {
      console.error("Error removing activity:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [activity.place_id]: false }));
    }
  };

  return (
    <PersistedQueryProvider>
      <div
        className={`grid ${
          open
            ? "grid-cols-1 xl:grid-cols-2 4xl:grid-cols-3 6xl:grid-cols-4"
            : "grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 5xl:grid-cols-4"
        } gap-4`}
      >
        {activities.map((activity) => {
          const isAdded = isActivityAdded(activity.place_id);
          return (
            <ActivityCard
              key={activity.place_id}
              activity={activity}
              variant="vertical"
              size="md"
              onClick={() => onSelectActivity(activity)}
              onAddToItinerary={!isAdded ? () => handleAddToItinerary(activity) : undefined}
              onRemoveFromItinerary={isAdded ? () => handleRemoveFromItinerary(activity) : undefined}
              isLoading={loadingStates[activity.place_id] || false}
              isAdded={isAdded}
              showActions={true}
              showSaveButton={true}
            />
          );
        })}
      </div>
    </PersistedQueryProvider>
  );
}
