"use client";

import Link from "next/link";
import { useParams } from "next/dist/client/components/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { Binoculars, NotebookPen, SquareChevronLeft, TextSearch } from "lucide-react";

import { useUserStore } from "@/store/userStore";

import { fetchItineraryDestination, fetchUserItineraries } from "@/actions/supabase/actions";

import { formatDate } from "@/utils/formatting/datetime";
import { Skeleton } from "@/components/ui/skeleton";

export function NavMainItineraryActivity() {
  const { itineraryId, destinationId } = useParams();

  const { data: destinationData, isLoading: isDestinationLoading } = useQuery({
    queryKey: ["itineraryDestination", itineraryId],
    queryFn: () => fetchItineraryDestination(itineraryId as string),
    enabled: !!itineraryId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const itinerary = destinationData?.data;

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="flex flex-col justify-start items-start text-blackpx-2 mb-4">
          {itinerary ? (
            <>
              <div className="text-lg font-semibold">
                {itinerary.city} {", "} {itinerary.country}
              </div>
              <div className="text-left w-full text-xs text-muted-foreground">
                {formatDate(itinerary.from_date as Date)} {" - "} {formatDate(itinerary.to_date as Date)}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-24" />
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

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={`/itinerary/${itineraryId}/${destinationId}/activities`}>
                <Binoculars />
                <span className="text-md font-semibold">Explore</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
