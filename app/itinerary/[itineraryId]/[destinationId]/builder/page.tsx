"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Loading from "@/components/loading/Loading";
import { Button } from "@/components/ui/button";
import { Calendar, Table, List, Map, X } from "lucide-react";

// Import stores
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { useMapStore } from "@/store/mapStore";

// Import server actions
import { getDestination } from "@/actions/supabase/destinations";

// Import view components - add one at a time to test
import { ItineraryListView } from "@/components/list/containers/ItineraryListView";
import { ItineraryTableView } from "@/components/table/ItineraryTable";
import { GoogleCalendarView } from "@/components/calendar/GoogleCalendarView";
import { ItineraryMap } from "@/components/map/ItineraryMap";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

export default function Builder() {
  const { itineraryId, destinationId } = useParams();
  const itinId = itineraryId.toString();
  const destId = destinationId.toString();

  const { itineraryActivities, fetchItineraryActivities } = useItineraryActivityStore();
  const { currentView, showMap, setCurrentView, toggleMap } = useItineraryLayoutStore();
  const { setItineraryCoordinates } = useMapStore();

  const [isLoading, setIsLoading] = useState(true);
  const [destinationData, setDestinationData] = useState<any>(null);

  // Fetch destination data
  const { data: destination } = useQuery({
    queryKey: ["destination", destId],
    queryFn: async () => {
      const result = await getDestination(destId);
      return result?.data;
    },
    enabled: !!destId,
  });

  useEffect(() => {
    if (destination) {
      setDestinationData(destination);
      setIsLoading(false);
    }
  }, [destination]);

  useEffect(() => {
    if (itinId) {
      fetchItineraryActivities(itinId);
    }
  }, [itinId, fetchItineraryActivities]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">
          {destinationData?.city}, {destinationData?.country}
        </h1>
        <p className="text-muted-foreground">Itinerary Builder</p>
      </div>

      <Tabs value={currentView} onValueChange={setCurrentView} className="flex-1">
        <div className="border-b px-4">
          <TabsList>
            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="table">
              <Table className="w-4 h-4 mr-2" />
              Table
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="w-4 h-4 mr-2" />
              List
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calendar" className="flex-1 p-4">
          <div className="h-full">
            <GoogleCalendarView 
              isLoading={false} 
              className="h-full"
            />
          </div>
        </TabsContent>

        <TabsContent value="table" className="flex-1 p-4">
          <ItineraryTableView 
            showMap={showMap} 
            onToggleMap={toggleMap}
          />
        </TabsContent>

        <TabsContent value="list" className="flex-1 p-4">
          <ItineraryListView 
            showMap={showMap} 
            onToggleMap={toggleMap}
          />
        </TabsContent>
      </Tabs>

      {showMap && (
        <div className="fixed bottom-4 right-4">
          <Button onClick={toggleMap} variant="outline" size="icon">
            <Map className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}