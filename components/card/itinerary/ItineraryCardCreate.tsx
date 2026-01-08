import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/loading/LoadingSpinner";

const PopUpCreateItinerary = dynamic(() => import("@/components/dialog/itinerary/CreateItineraryDialog"), {
  ssr: false,
  loading: () => (
    <Button
      disabled
      className="flex items-center justify-center rounded-xl shadow-lg backdrop-blur-lg border h-60 w-full sm:w-60 min-w-60 min-h-60"
    >
      <LoadingSpinner />
    </Button>
  ),
});

export default function ItineraryCardCreate() {
  return (
    <PopUpCreateItinerary className="flex items-center justify-center rounded-xl shadow-lg hover:scale-105 transition-all duration-300 backdrop-blur-lg border hover:bg-zinc-50 h-60 w-full sm:w-60 min-w-60 min-h-60 hover:opacity-80 cursor-pointer active:scale-95">
      <Plus className="h-12 w-12 text-black" />
    </PopUpCreateItinerary>
  );
}
