"use client";
import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import DragDropCalendar from "@/components/calendar/calendar";
import { DatePickerWithRangePopover } from "@/components/date/dateRangePickerPopover";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import ItineraryList from "@/components/list/itineraryList";
import { useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

export default function Builder() {
  const searchParams = useSearchParams();
  const itineraryId = searchParams.get("i");
  const destinationId = searchParams.get("d");

  const { fetchItineraryActivities, setItineraryActivities } = useItineraryActivityStore();

  const { isLoading, error, data } = useQuery({
    queryKey: ["itineraryActivities", itineraryId, destinationId],
    queryFn: () => fetchItineraryActivities(itineraryId || "", destinationId || ""),
    enabled: !!itineraryId && !!destinationId,
  });

  useEffect(() => {
    if (data) {
      setItineraryActivities(data);
    }
  }, [data, setItineraryActivities]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={50} className="p-4 border-b">
        <ScrollArea className="h-screen w-full">
          <div className="p-4 w-40">
            <DatePickerWithRangePopover className="mb-4" itineraryId={itineraryId || ""} />
          </div>
          <ItineraryList />
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} className="p-4 border-b">
        <ScrollArea className="h-screen w-full">
          <DragDropCalendar isLoading={isLoading} />
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
