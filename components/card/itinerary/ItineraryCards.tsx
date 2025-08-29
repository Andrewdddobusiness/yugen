"use client";
import ItineraryCard from "./itineraryCard";
import ItineraryCardCreate from "./itineraryCardCreate";
import { IItineraryCard } from "@/components/cards/itineraryCard";

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
