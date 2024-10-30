import ItineraryCard from "./itineraryCard";
import ItineraryCardCreate from "./itineraryCardCreate";
import ItinerarySkeletonCard from "./itinerarySkeletonCard";

import { IItineraryCard } from "@/components/cards/itineraryCard";

interface ItineraryCardsProps {
  itineraries: IItineraryCard[];
  loading: boolean;
  onDelete: (itineraryId: number) => void;
}

export default function ItineraryCards({ itineraries, loading, onDelete }: ItineraryCardsProps) {
  return (
    <div className="h-60 flex flex-wrap gap-4">
      {loading ? (
        <ItinerarySkeletonCard />
      ) : (
        itineraries.map((itinerary: IItineraryCard, index: number) => (
          <ItineraryCard key={itinerary.itinerary_id} itinerary={itinerary} onDelete={onDelete} />
        ))
      )}
      <ItineraryCardCreate />
    </div>
  );
}
