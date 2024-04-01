import { Plus } from "lucide-react";

import { HoverCard, HoverCardContent } from "@/components/ui/hover-card";

import ItineraryChoiceDialog from "../dialog/itineraryChoiceDialog";

export default function ItineraryCardCreate() {
  return (
    <ItineraryChoiceDialog>
      <HoverCard>
        <Plus className="h-12 w-12 text-black" />
        <HoverCardContent>Let&apos;s create an itinerary!</HoverCardContent>
      </HoverCard>
    </ItineraryChoiceDialog>
  );
}
