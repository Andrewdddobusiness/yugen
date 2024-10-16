"use client";
import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import BuilderLayout from "@/components/layouts/builderLayout";
import DragDropCalendar from "@/components/calendar/calendar";
import { DatePickerWithRangePopover } from "@/components/date/dateRangePickerPopover";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import ItineraryList from "@/components/list/itineraryList";
import { useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useitineraryActivityStore } from "@/store/itineraryActivityStore";

export default function Builder() {
  const searchParams = useSearchParams();
  const id = searchParams.get("i");

  const { fetchItineraryActivities, setItineraryActivities } =
    useitineraryActivityStore();

  const { isLoading, error, data } = useQuery({
    queryKey: ["itineraryActivities", id],
    queryFn: () => fetchItineraryActivities(id || ""),
    enabled: !!id,
  });

  useEffect(() => {
    if (data) {
      setItineraryActivities(data);
    }
  }, [data, setItineraryActivities]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>An error occurred: {error.message}</div>;

  return (
    <div>
      <BuilderLayout title="Builder" activePage="builder" itineraryNumber={1}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50} className="p-4 border-b">
            <ScrollArea className="h-screen w-full">
              <div className="p-4 w-40">
                <DatePickerWithRangePopover className="mb-4" itineraryId={id} />
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
      </BuilderLayout>
    </div>
  );
}
