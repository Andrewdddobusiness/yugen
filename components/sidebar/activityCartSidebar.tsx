import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";
import { cn } from "@/components/lib/utils";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useCartStore } from "@/store/cartStore";
import { useSidebar } from "@/components/ui/sidebar";

export function ActivityCartSidebar() {
  const { itineraryActivities } = useItineraryActivityStore();
  const { isCartOpen, setIsCartOpen } = useCartStore();
  const { state } = useSidebar();

  const sidebarWidth = state === "expanded" ? "16rem" : "4rem";

  return (
    <div
      className={cn(
        "absolute top-0 h-full bg-white transition-all duration-300 ease-in-out",
        "shadow-[2px_2px_5px_rgba(0,0,0,0.1)]",
        isCartOpen ? "w-[400px] opacity-100 visible" : "w-0 opacity-0 invisible"
      )}
      style={{
        left: sidebarWidth,
      }}
    >
      <div className="flex flex-col h-full">
        <div className="bg-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Itinerary Activities</h2>
          <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)} className="rounded-full">
            <X size={16} />
          </Button>
        </div>

        <Separator />

        <ScrollArea className="flex-1 px-4">
          {itineraryActivities.map((activity) => (
            <div key={activity.itinerary_activity_id} className="p-4 border rounded-lg mb-4 mt-4">
              <h3 className="font-medium">{activity.activity?.name}</h3>
              <p className="text-sm text-gray-500 mt-2">{activity.activity?.description}</p>
              {activity.date && (
                <p className="text-sm text-gray-500 mt-2">Date: {new Date(activity.date).toLocaleDateString()}</p>
              )}
            </div>
          ))}
        </ScrollArea>

        <div className="bg-white p-4">
          <Separator className="mb-4" />
          <div className="text-sm text-gray-500">{itineraryActivities.length} activities in itinerary</div>
        </div>
      </div>
    </div>
  );
}
