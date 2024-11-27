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
import { useDateRangeStore } from "@/store/dateRangeStore";

export default function Builder() {
  const { itineraryId, destinationId } = useParams();
  const itinId = itineraryId.toString();
  const destId = destinationId.toString();

  const { fetchItineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const { setDateRange } = useDateRangeStore();

  const { isLoading, error, data } = useQuery({
    queryKey: ["itineraryActivities", itineraryId, destinationId],
    queryFn: () => fetchItineraryActivities(itinId || "", destId || ""),
    enabled: !!itineraryId && !!destinationId,
  });

  useEffect(() => {
    if (data && data.length > 0) {
      setItineraryActivities(data);
      const firstDate = new Date(data[0].date);
      const lastDate = new Date(data[data.length - 1].date);
      setDateRange(firstDate, lastDate);
    }
  }, [data, setItineraryActivities, setDateRange]);

  if (isLoading) return <Loading />;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <ScrollArea className="h-full w-full">
      <div className="flex flex-col items-center justify-center h-full w-full">
        <DragDropCalendar isLoading={isLoading} />
      </div>
    </ScrollArea>
  );
}
