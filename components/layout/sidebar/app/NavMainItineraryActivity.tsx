"use client";

import Link from "next/link";
import { useParams } from "next/dist/client/components/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { NotebookPen, SquareChevronLeft, TextSearch } from "lucide-react";

import { fetchItineraryDestination, setItineraryDestinationDateRange } from "@/actions/supabase/actions";

import { Skeleton } from "@/components/ui/skeleton";

import { DateRange } from "react-day-picker";
import { useEffect, useState } from "react";
import { DatePickerWithRangePopover3 } from "@/components/form/date/DateRangePickerPopover3";
import { format, isValid, parseISO } from "date-fns";

export function NavMainItineraryActivity() {
  const { itineraryId, destinationId } = useParams();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const queryClient = useQueryClient();

  const { data: destinationData, isLoading: isDestinationLoading } = useQuery({
    queryKey: ["itineraryDestination", itineraryId, destinationId],
    queryFn: () => fetchItineraryDestination(itineraryId as string, destinationId as string | undefined),
    enabled: !!itineraryId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const itinerary = destinationData?.data;

  useEffect(() => {
    if (!itinerary?.from_date || !itinerary?.to_date) return;
    const from = parseISO(itinerary.from_date);
    const to = parseISO(itinerary.to_date);
    if (!isValid(from) || !isValid(to)) return;
    setDateRange({ from, to });
  }, [itinerary]);

  const handleDateRangeConfirm = async (dateRange: DateRange | undefined) => {
    try {
      setDateRange(dateRange);
      if (dateRange && dateRange.from && dateRange.to) {
        const result = await setItineraryDestinationDateRange(itineraryId as string, destinationId as string, {
          from: format(dateRange.from, "yyyy-MM-dd"),
          to: format(dateRange.to, "yyyy-MM-dd"),
        });

        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ["itineraryDestination", itineraryId] });
          queryClient.invalidateQueries({ queryKey: ["itineraryDateRange", itineraryId] });
        } else {
          console.error("Error updating date range:", result.message);
        }
      }
    } catch (error) {
      console.error("Error setting date range:", error);
    }
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="flex flex-col justify-start items-start text-black px-2 mb-12 gap-2">
          {itinerary ? (
            <>
              <div className="text-lg font-semibold">
                {itinerary.city} {", "} {itinerary.country}
              </div>
              <div className="text-left w-full text-xs text-muted-foreground">
                <DatePickerWithRangePopover3
                  selectedDateRange={dateRange}
                  onDateRangeConfirm={handleDateRangeConfirm}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col space-y-2 w-full">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-full rounded-full " />
            </div>
          )}
        </SidebarGroupLabel>

        <SidebarGroupLabel>Itinerary</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem className="border-b border-b-border pb-1">
            <SidebarMenuButton asChild>
              <Link href={"/itineraries"}>
                <SquareChevronLeft />
                <span className="text-md font-semibold">Back</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

	          <SidebarMenuItem>
	            <SidebarMenuButton asChild>
	              <Link href={`/itinerary/${itineraryId}/${destinationId}/overview`}>
	                <TextSearch />
	                <span className="text-md font-semibold">Overview</span>
	              </Link>
	            </SidebarMenuButton>
	          </SidebarMenuItem>

	          <SidebarMenuItem>
	            <SidebarMenuButton asChild>
	              <Link href={`/itinerary/${itineraryId}/${destinationId}/builder`}>
	                <NotebookPen />
                <span className="text-md font-semibold">Build & Organise</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
