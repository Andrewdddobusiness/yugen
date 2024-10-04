import { Plus } from "lucide-react";

import { HoverCard, HoverCardContent } from "@/components/ui/hover-card";

import ItineraryChoiceDialog from "../dialog/itineraryChoiceDialog";

export default function ItineraryCardCreate() {
  return (
    <ItineraryChoiceDialog className="bg-white border hover:bg-zinc-100 h-full w-[247px]">
      <HoverCard>
        <Plus className="h-12 w-12 text-black" />
        <HoverCardContent>Let&apos;s create an itinerary!</HoverCardContent>
      </HoverCard>
    </ItineraryChoiceDialog>
  );
}
