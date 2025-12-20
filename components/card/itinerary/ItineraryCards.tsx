"use client";
import ItineraryCard from "./ItineraryCard";
import ItineraryCardCreate from "./ItineraryCardCreate";
import { IItineraryCard } from "./ItineraryCard";

interface ItineraryCardsProps {
  itineraries: IItineraryCard[];
  onDelete: (itineraryId: number) => void;
}

export default function ItineraryCards({ itineraries, onDelete }: ItineraryCardsProps) {
  return (
    <div className="flex h-full w-full flex-wrap gap-4">
      {itineraries.map((itinerary: IItineraryCard) => (
        <ItineraryCard key={itinerary.itinerary_id} itinerary={itinerary} onDelete={onDelete} />
      ))}
      <ItineraryCardCreate />
    </div>
  );
}
