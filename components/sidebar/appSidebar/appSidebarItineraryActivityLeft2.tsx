"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Binoculars, Command, NotebookPen, SquareChevronLeft, TextSearch } from "lucide-react";
import { cn } from "@/components/lib/utils";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import { NavUser } from "./navUser";
import ItineraryList from "@/components/list/itineraryList";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePickerWithRangePopover3 } from "@/components/date/dateRangePickerPopover3";
import { useEffect, useState } from "react";
import { fetchItineraryDestination, setItineraryDestinationDateRange } from "@/actions/supabase/actions";
import { Separator } from "@/components/ui/separator";

export function AppSidebarItineraryActivityLeft() {
  const { itineraryId, destinationId } = useParams();
  const { setOpen } = useSidebar();
  const pathname = usePathname();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const queryClient = useQueryClient();

  const { data: destinationData, isLoading: isDestinationLoading } = useQuery({
    queryKey: ["itineraryDestination", itineraryId],
    queryFn: () => fetchItineraryDestination(itineraryId as string),
    enabled: !!itineraryId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const itinerary = destinationData?.data;

  useEffect(() => {
    if (itinerary) {
      console.log("itinerary.from_date:", itinerary.from_date);
      console.log("itinerary.to_date:", itinerary.to_date);
      setDateRange({ from: itinerary.from_date as Date, to: itinerary.to_date as Date });
    }
  }, [itinerary]);

  const navItems = [
    {
      title: "Back",
      icon: SquareChevronLeft,
      href: "/itineraries",
    },
    {
      title: "Overview",
      icon: TextSearch,
      href: `/itinerary/${itineraryId}/${destinationId}/overview`,
    },
    {
      title: "Explore",
      icon: Binoculars,
      href: `/itinerary/${itineraryId}/${destinationId}/activities`,
    },
    {
      title: "Build",
      icon: NotebookPen,
      href: `/itinerary/${itineraryId}/${destinationId}/builder`,
    },
  ];

  const handleDateRangeConfirm = async (dateRange: DateRange | undefined) => {
    try {
      setDateRange(dateRange);
      if (dateRange && dateRange.from && dateRange.to) {
        const result = await setItineraryDestinationDateRange(itineraryId as string, destinationId as string, {
          from: dateRange.from,
          to: dateRange.to,
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
    <Sidebar collapsible="icon" className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row">
      {/* Icon Sidebar */}
      <Sidebar collapsible="none" className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0 mt-1">
                <Link href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Journey</span>
                    <span className="truncate text-xs">Free</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      asChild
                      className={cn(
                        pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground",
                        "transition-colors"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      {/* Content Sidebar */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex gap-4 ">
        <SidebarHeader className="px-12 pt-8 pb-4">
          {itinerary ? (
            <div className="flex flex-col gap-2">
              <div className="text-2xl font-semibold">
                {itinerary.city} {", "} {itinerary.country}
              </div>
              <div className="text-left w-full text-xs text-muted-foreground">
                <DatePickerWithRangePopover3
                  selectedDateRange={dateRange}
                  onDateRangeConfirm={handleDateRangeConfirm}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 w-full">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-full rounded-full " />
            </div>
          )}
        </SidebarHeader>
        <div className="px-8">
          <Separator />
        </div>
        <SidebarContent className="h-full w-full">
          <ItineraryList />
        </SidebarContent>
      </Sidebar>

      <SidebarRail />
    </Sidebar>
  );
}
