"use client";
import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import DragDropCalendar from "@/components/calendar/calendar";
import { DatePickerWithRangePopover } from "@/components/date/dateRangePickerPopover";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import ItineraryList from "@/components/list/itineraryList";
import { useParams, useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import Loading from "@/components/loading/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Builder() {
  const { itineraryId, destinationId } = useParams();
  const itinId = itineraryId.toString();
  const destId = destinationId.toString();

  const { fetchItineraryActivities, setItineraryActivities } = useItineraryActivityStore();

  const { isLoading, error, data } = useQuery({
    queryKey: ["itineraryActivities", itineraryId, destinationId],
    queryFn: () => fetchItineraryActivities(itinId || "", destId || ""),
    enabled: !!itineraryId && !!destinationId,
  });

  useEffect(() => {
    if (data) {
      setItineraryActivities(data);
    }
  }, [data, setItineraryActivities]);

  if (isLoading) return <Loading />;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={40} className="flex flex-col min-h-0">
        <div className="flex flex-col items-center justify-between px-16 flex-shrink-0">
          <h3 className="w-full text-4xl font-bold">Itinerary</h3>
        </div>
        <Tabs defaultValue="list" className="flex flex-col flex-grow min-h-0">
          <TabsList className="flex flex-row px-16 flex-shrink-0">
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="flex-grow min-h-0">
            <ScrollArea className="h-full w-full">
              <ItineraryList />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="table" className="flex-grow min-h-0">
            <ScrollArea className="h-full w-full">
              <ItineraryList />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={60} className="min-h-0">
        <ScrollArea className="h-full w-full">
          <DragDropCalendar isLoading={isLoading} />
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
