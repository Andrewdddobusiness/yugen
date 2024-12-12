"use client";
import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Table2 } from "lucide-react";
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
  if (error) return <ErrorPage />;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <Tabs defaultValue="table" className="flex flex-col h-full">
        <div className="p-2 flex-none flex justify-end">
          <TabsList className="grid w-[90px] grid-cols-2 border">
            <TabsTrigger value="calendar" className="p-2">
              <Calendar className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="table" className="p-2">
              <Table2 className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </div>

        <Separator />

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="calendar" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="flex flex-col h-full">
                <DragDropCalendar isLoading={isLoading} />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="table" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="flex flex-col w-full h-full">
                <ItineraryTableView />
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
