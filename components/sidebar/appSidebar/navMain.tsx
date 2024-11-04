"use client";

import { ChevronRight, Minus, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import { useUserStore } from "@/store/userStore";
import { useQuery } from "@tanstack/react-query";

import { fetchUserItineraries } from "@/actions/supabase/actions";

import { Home, LibraryBig, NotebookText } from "lucide-react";
import { formatDate } from "@/utils/formatting/datetime";
import { Skeleton } from "@/components/ui/skeleton";

export function NavMain() {
  const { user } = useUserStore();

  const { data: itineraryData, isLoading: isItinerariesLoading } = useQuery({
    queryKey: ["itineraries", user?.id],
    queryFn: async () => {
      const response = await fetchUserItineraries(user?.id || "");
      return response.data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href={"/"}>
              <Home />
              <span className="text-md font-semibold">Home</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <Collapsible asChild defaultOpen={false}>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={"/itineraries"}>
                <NotebookText />
                <span className="text-md font-semibold">Itineraries</span>
              </Link>
            </SidebarMenuButton>
            {isItinerariesLoading ? (
              <SidebarMenuAction>
                <Skeleton className="h-4 w-4 rounded-lg" />
              </SidebarMenuAction>
            ) : itineraryData && itineraryData?.length > 0 ? (
              <>
                <CollapsibleTrigger asChild>
                  <SidebarMenuAction className="data-[state=open]:rotate-90">
                    <ChevronRight />
                    <span className="sr-only">Toggle</span>
                  </SidebarMenuAction>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="flex-col gap-2">
                    {itineraryData?.map((itinerary) => (
                      <SidebarMenuSubItem key={itinerary.city}>
                        <SidebarMenuSubButton asChild>
                          <Link
                            href={`/itinerary/${itinerary.itinerary_id}/${itinerary.itinerary_destination_id}/activities`}
                            className="flex flex-col items-start w-full pl-2 "
                          >
                            <div className="flex flex-row items-center gap-2">
                              <Minus size="12" />
                              <div>
                                <div className="text-left w-full text-md">
                                  {itinerary.city}
                                  {", "} {itinerary.country}
                                </div>
                                <div className="text-left w-full text-xs text-muted-foreground">
                                  {formatDate(itinerary.from_date)} {" - "} {formatDate(itinerary.to_date)}
                                </div>
                              </div>
                            </div>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </>
            ) : null}
          </SidebarMenuItem>
        </Collapsible>

        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href={"/explore"}>
              <LibraryBig />
              <span className="text-md font-semibold">Explore</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
