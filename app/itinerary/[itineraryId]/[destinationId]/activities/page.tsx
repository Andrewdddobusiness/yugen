"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import Loading from "@/components/loading/Loading";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";

export default function ActivitiesPage() {
  const router = useRouter();
  const { itineraryId, destinationId } = useParams();

  useEffect(() => {
    if (!itineraryId || !destinationId) return;

    // Deprecated: activities page is now part of the builder (map panel).
    useItineraryLayoutStore.getState().setShowMap(true);
    router.replace(`/itinerary/${itineraryId}/${destinationId}/builder`);
  }, [destinationId, itineraryId, router]);

  return <Loading />;
}

