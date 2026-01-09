"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DestinationSelector from "@/components/destination/DestinationSelector";
import { useCreateItineraryStore, type Destination } from "@/store/createItineraryStore";

export default function DestinationSelectionPage() {
  const router = useRouter();
  const { legs, addLeg, setLegDestination } = useCreateItineraryStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDestinationSelect = (destination: Destination) => {
    const firstLegId = legs[0]?.id ?? addLeg();
    setLegDestination(firstLegId, destination);
    // Navigate to the next step (date selection or back to popup)
    router.push("/itinerary/create");
  };

  const handleClose = () => {
    // Navigate back to home or previous page
    router.push("/");
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto h-screen">
        <DestinationSelector
          onDestinationSelect={handleDestinationSelect}
          onClose={handleClose}
          initialDestination={legs[0]?.destination ?? null}
        />
      </div>
    </div>
  );
}
