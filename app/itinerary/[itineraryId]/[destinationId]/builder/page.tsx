"use client";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Table2, Map } from "lucide-react";
import DragDropCalendar from "@/components/calendar/calendar";
import { DatePickerWithRangePopover } from "@/components/date/dateRangePickerPopover";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import ItineraryList from "@/components/list/itineraryList";
import { useParams, useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import Loading from "@/components/loading/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDateRangeStore } from "@/store/dateRangeStore";
import { ItineraryTableView } from "@/components/table/itineraryTable";

import ErrorPage from "@/app/error/page";
import { Separator } from "@/components/ui/separator";
import { fetchItineraryDestinationDateRange } from "@/actions/supabase/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import GoogleMapView from "@/components/map/googleMapView";

export default function Builder() {
  const { itineraryId, destinationId } = useParams();
  const itinId = itineraryId.toString();
  const destId = destinationId.toString();

  const { itineraryActivities, fetchItineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const { setDateRange } = useDateRangeStore();

  // Add new query for date range
  const { data: dateRangeData } = useQuery({
    queryKey: ["itineraryDestinationDateRange", itinId, destId],
    queryFn: () => fetchItineraryDestinationDateRange(itinId, destId),
    enabled: !!itinId && !!destId,
  });

  const { isLoading, error, data } = useQuery({
    queryKey: ["itineraryActivities", itineraryId, destinationId],
    queryFn: () => fetchItineraryActivities(itinId, destId),
    enabled: !!itineraryId && !!destinationId,
  });

  useEffect(() => {
    if (data) {
      setItineraryActivities(data);
    }
  }, [data, setItineraryActivities]);

  useEffect(() => {
    if (dateRangeData?.success && dateRangeData?.data) {
      setDateRange(dateRangeData?.data.from, dateRangeData?.data.to);
    }
  }, [dateRangeData, setDateRange]);

  const [showMap, setShowMap] = useState(false);

  const toggleMap = () => setShowMap(!showMap);

  if (isLoading) return <Loading />;
  if (error) return <ErrorPage />;

  return (
    <ResizablePanelGroup direction="horizontal" className="flex h-full w-full overflow-hidden">
      <ResizablePanel defaultSize={showMap ? 60 : 100}>
        <Tabs defaultValue="table" className="flex flex-col h-full">
          <div className="p-2 flex justify-between items-center shrink-0">
            <TabsList className="grid w-[90px] grid-cols-2 border">
              <TabsTrigger value="calendar" className="p-2">
                <Calendar className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="table" className="p-2">
                <Table2 className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            <Button variant="outline" size="icon" onClick={toggleMap} className={cn("h-8 w-8", showMap && "bg-muted")}>
              <Map className="h-4 w-4" />
            </Button>
          </div>

          <Separator className="mb-2" />

          <div className="flex-1 min-h-0">
            <TabsContent value="calendar" className="h-full m-0 data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1">
                <div className="h-full p-2">
                  <DragDropCalendar isLoading={isLoading} />
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="table" className="h-full m-0 data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1">
                <div className="h-full p-2">
                  <ItineraryTableView />
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel
        defaultSize={40}
        className={cn("transition-all duration-300 ease-in-out", !showMap && "hidden")}
        maxSize={50}
      >
        <div className="h-full w-full">
          <GoogleMapView
            activities={itineraryActivities.filter(
              (a) =>
                a.activity?.coordinates && Array.isArray(a.activity.coordinates) && a.activity.coordinates.length === 2
            )}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
