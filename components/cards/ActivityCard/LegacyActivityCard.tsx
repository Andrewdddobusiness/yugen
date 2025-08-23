"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ActivityCard } from "./ActivityCard";
import { type IActivityWithLocation } from "@/store/activityStore";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

interface LegacyActivityCardProps {
  activity: IActivityWithLocation;
  onClick?: () => void;
  onAddToItinerary?: () => void;
  onOptionsClick?: () => void;
}

/**
 * Legacy wrapper for the old ActivityCard component
 * This maintains backward compatibility while using the new unified ActivityCard
 */
export default function LegacyActivityCard({ 
  activity, 
  onClick, 
  onOptionsClick 
}: LegacyActivityCardProps) {
  const queryClient = useQueryClient();
  const { itineraryId, destinationId } = useParams();
  const { insertItineraryActivity, removeItineraryActivity, isActivityAdded } = useItineraryActivityStore();
  
  const [loading, setLoading] = useState(false);
  const isAdded = isActivityAdded(activity.place_id);

  const handleAddToItinerary = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleRemoveFromItinerary = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <ActivityCard
      activity={activity}
      variant="vertical"
      size="md"
      onClick={onClick}
      onAddToItinerary={isAdded ? undefined : handleAddToItinerary}
      onRemoveFromItinerary={isAdded ? handleRemoveFromItinerary : undefined}
      onOptionsClick={onOptionsClick}
      isLoading={loading}
      showSaveButton={true}
      className="h-[365px]"
    />
  );
}