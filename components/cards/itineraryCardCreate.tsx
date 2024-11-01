import { Plus } from "lucide-react";

import { HoverCard, HoverCardContent } from "@/components/ui/hover-card";

import ItineraryChoiceDialog from "../dialog/itineraryChoiceDialog";
import PopUpCreateItinerary from "../popUp/popUpCreateItinerary";

export default function ItineraryCardCreate() {
  return (
    <PopUpCreateItinerary className="bg-white border hover:bg-zinc-100 h-60 w-60">
      <HoverCard>
        <Plus className="h-12 w-12 text-black" />
        <HoverCardContent>Let&apos;s create an itinerary!</HoverCardContent>
      </HoverCard>
    </PopUpCreateItinerary>
  );
}
