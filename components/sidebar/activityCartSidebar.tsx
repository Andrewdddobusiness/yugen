import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";

import ActivityCardsHorizontal from "@/components/cards/activityCardsHorizontal";

import { cn } from "@/components/lib/utils";

import { X } from "lucide-react";

import { useCartStore } from "@/store/cartStore";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { IActivity, IActivityWithLocation, useActivitiesStore } from "@/store/activityStore";
import { useSidebarStore } from "@/store/sidebarStore";

export function ActivityCartSidebar() {
  // **** STORES ****
  const { setSelectedActivity } = useActivitiesStore();
  const { setIsSidebarRightOpen, openRightSidebar } = useSidebarStore();
  const { isCartOpen, setIsCartOpen } = useCartStore();
  const { itineraryActivities } = useItineraryActivityStore();
  const { state } = useSidebar();

  const sidebarWidth = state === "expanded" ? "16rem" : "4rem";

  // filter activities that are active and not deleted with delete_at
  const itineraryActivitiesOnlyActivities = itineraryActivities
    .filter((itineraryActivity) => itineraryActivity.deleted_at === null)
    .map((activity) => activity.activity)
    .filter(Boolean) as IActivityWithLocation[];

  // **** HANDLERS ****
  const handleActivitySelect = (activity: IActivity) => {
    setSelectedActivity(activity);
    setIsSidebarRightOpen(true);
  };
  console.log("itineraryActivities: ", itineraryActivities);

  console.log("itineraryActivitiesOnlyActivities: ", itineraryActivitiesOnlyActivities);

  return (
    <div
      className={cn(
        "absolute top-0 h-full bg-white transition-all duration-300 ease-in-out border-l border-zinc-200",
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

        <div className="flex-grow overflow-hidden px-2 py-4">
          <ScrollArea className="flex flex-col h-full px-4">
            <ActivityCardsHorizontal
              activities={itineraryActivitiesOnlyActivities}
              onSelectActivity={handleActivitySelect}
              variant="simple"
            />
          </ScrollArea>
        </div>
        <div className="bg-white p-4">
          <Separator className="mb-4" />
          <div className="text-sm text-gray-500">
            {itineraryActivitiesOnlyActivities.length} activities in itinerary
          </div>
        </div>
      </div>
    </div>
  );
}
