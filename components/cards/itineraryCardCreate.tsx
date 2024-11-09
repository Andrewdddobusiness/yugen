import { Plus } from "lucide-react";
import PopUpCreateItinerary from "../popUp/popUpCreateItinerary";

export default function ItineraryCardCreate() {
  return (
    <PopUpCreateItinerary className="flex items-center justify-center rounded-lg bg-white border hover:bg-zinc-50 h-60 w-60 min-w-60 min-h-60 hover:opacity-80 transition-colors shadow-sm cursor-pointer">
      <Plus className="h-12 w-12 text-black" />
    </PopUpCreateItinerary>
  );
}
