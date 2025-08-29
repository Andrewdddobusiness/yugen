"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { ActivityCard } from "./ActivityCard";
import { type IActivityWithLocation } from "@/store/activityStore";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

interface LegacyActivityCardHorizontalProps {
  activity: IActivityWithLocation;
  onClick?: () => void;
  onAddToItinerary?: () => void;
  onOptionsClick?: () => void;
  variant?: "full" | "simple";
}

/**
 * Legacy wrapper for the old ActivityCardHorizontal component
 * Maps old variant names to new ones
 */
export function LegacyActivityCardHorizontal({ 
  activity, 
  onClick, 
  onOptionsClick,
  variant = "full"
}: LegacyActivityCardHorizontalProps) {
  const { itineraryId, destinationId } = useParams();
  const { insertItineraryActivity, removeItineraryActivity, isActivityAdded } = useItineraryActivityStore();
  
  const [loading, setLoading] = useState(false);
  const isAdded = isActivityAdded(activity.place_id);

  const handleAddToItinerary = async () => {
    setLoading(true);
    if (!activity || !itineraryId || !destinationId) {
      setLoading(false);
      return;
    }
    
    try {
      await insertItineraryActivity(
        activity, 
        itineraryId.toString(), 
        destinationId.toString()
      );
    } catch (error) {
      console.error("Error adding activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromItinerary = async () => {
    setLoading(true);
    if (!activity || !itineraryId) {
      setLoading(false);
      return;
    }
    
    try {
      await removeItineraryActivity(
        activity.place_id, 
        Array.isArray(itineraryId) ? itineraryId[0] : itineraryId
      );
    } catch (error) {
      console.error("Error removing activity:", error);
    } finally {
      setLoading(false);
    }
  };

  // Map old variant names to new ones
  const newVariant = variant === "full" ? "horizontal-full" : "horizontal-simple";

  return (
    <ActivityCard
      activity={activity}
      variant={newVariant}
      size="md"
      onClick={onClick}
      onAddToItinerary={isAdded ? undefined : handleAddToItinerary}
      onRemoveFromItinerary={isAdded ? handleRemoveFromItinerary : undefined}
      onOptionsClick={onOptionsClick}
      isLoading={loading}
      showImage={variant === "full"}
      showDescription={variant === "full"}
      showMetadata={variant === "full"}
      className={variant === "simple" ? "h-16" : "h-[200px]"}
    />
  );
}