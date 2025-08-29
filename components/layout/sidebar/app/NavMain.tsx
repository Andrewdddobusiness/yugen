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
              <span className="text-md font-semibold text-gray-800">Home</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <Collapsible asChild defaultOpen={false}>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={"/itineraries"}>
                <NotebookText />
                <span className="text-md font-semibold text-gray-800">Itineraries</span>
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
                  <SidebarMenuSub className="flex-col">
                    {itineraryData?.map((itinerary) => (
                      <SidebarMenuSubItem key={itinerary.city}>
                        <SidebarMenuSubButton asChild>
                          <Link
                            href={`/itinerary/${itinerary.itinerary_id}/${itinerary.itinerary_destination_id}/activities`}
                            className="w-full py-5"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Minus size="12" className="shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="truncate text-sm">
                                  {itinerary.city}, {itinerary.country}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {formatDate(itinerary.from_date)} - {formatDate(itinerary.to_date)}
                                </span>
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
            <Link href={"/guides"}>
              <LibraryBig />
              <span className="text-md font-semibold text-gray-800">Guides</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
