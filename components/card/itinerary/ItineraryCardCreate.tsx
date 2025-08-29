import { Plus } from "lucide-react";
import PopUpCreateItinerary from "@/components/dialog/itinerary/CreateItineraryDialog";

export default function ItineraryCardCreate() {
  return (
    <PopUpCreateItinerary className="flex items-center justify-center rounded-xl shadow-lg hover:scale-105 transition-all duration-300 backdrop-blur-lg border hover:bg-zinc-50 h-60 w-full sm:w-60 min-w-60 min-h-60 hover:opacity-80 cursor-pointer active:scale-95">
      <Plus className="h-12 w-12 text-black" />
    </PopUpCreateItinerary>
  );
}
