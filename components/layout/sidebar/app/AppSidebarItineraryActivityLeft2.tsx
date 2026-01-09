"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { NotebookPen, Plus, SquareChevronLeft, TextSearch, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
} from "@/components/ui/sidebar";

import { NavUserIcon } from "./NavUserIcon";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePickerWithRangePopover3 } from "@/components/form/date/DateRangePickerPopover3";
import { useEffect, useState } from "react";
import { fetchItineraryDestination, setItineraryDestinationDateRange } from "@/actions/supabase/actions";
import { Separator } from "@/components/ui/separator";
import { useDateRangeStore } from '@/store/dateRangeStore';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { listItineraryDestinationsSummary } from "@/actions/supabase/destinations";
import { AddDestinationDialog } from "@/components/dialog/itinerary/AddDestinationDialog";
import { addDays, format } from "date-fns";

const SimplifiedItinerarySidebar = dynamic(
  () => import("@/components/layout/sidebar/SimplifiedItinerarySidebar").then((mod) => mod.SimplifiedItinerarySidebar),
  {
    ssr: false,
    loading: () => (
      <div className="p-3 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stroke-200 bg-bg-50/60 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    ),
  }
);


export function AppSidebarItineraryActivityLeft({
  useExternalDndContext = false,
}: {
  useExternalDndContext?: boolean;
}) {
  const { itineraryId, destinationId } = useParams();
  const pathname = usePathname();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [addDestinationOpen, setAddDestinationOpen] = useState(false);

  const queryClient = useQueryClient();
  
  // Get the date range store to sync with table components
  const { setDateRange: setStoreDateRange } = useDateRangeStore();

  const itineraryIdValue = Array.isArray(itineraryId) ? itineraryId[0] : String(itineraryId ?? "");
  const destinationIdValue = Array.isArray(destinationId) ? destinationId[0] : String(destinationId ?? "");

  const { data: destinationData } = useQuery({
    queryKey: ["itineraryDestination", itineraryIdValue, destinationIdValue],
    queryFn: () => fetchItineraryDestination(itineraryIdValue, destinationIdValue || undefined),
    enabled: Boolean(itineraryIdValue),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const itinerary = destinationData?.data;

  const { data: destinationsSummary = [] } = useQuery({
    queryKey: ["itineraryDestinationsSummary", itineraryIdValue],
    queryFn: async () => {
      const result = await listItineraryDestinationsSummary(itineraryIdValue);
      return result.success ? result.data ?? [] : [];
    },
    enabled: Boolean(itineraryIdValue),
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const currentDestinationId = Number(destinationIdValue || 0);
  const nextOrderNumber =
    Math.max(0, ...destinationsSummary.map((destination) => Number(destination.order_number ?? 0))) + 1;
  const lastDestination = destinationsSummary[destinationsSummary.length - 1] ?? null;
  const defaultNewDestinationRange = lastDestination?.to_date
    ? (() => {
        const from = addDays(new Date(lastDestination.to_date), 1);
        return { from, to: from };
      })()
    : undefined;

  useEffect(() => {
    if (!itinerary?.from_date || !itinerary?.to_date) return;
    const from = new Date(itinerary.from_date);
    const to = new Date(itinerary.to_date);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return;

    const dateRangeValue = { from, to };
    setDateRange(dateRangeValue);

    // Also update the date range store so table components can access it
    setStoreDateRange(from, to);
  }, [itinerary, setStoreDateRange]);

  const formatRange = (fromDate: string, toDate: string) => {
    try {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
    } catch {
      return "";
    }
  };

  const navigateToDestination = (nextDestinationId: number) => {
    if (!itineraryIdValue) return;
    const nextId = String(nextDestinationId);
    const currentBase = `/itinerary/${itineraryIdValue}/${destinationIdValue}`;
    const nextBase = `/itinerary/${itineraryIdValue}/${nextId}`;
    const nextPath = pathname?.startsWith(currentBase)
      ? pathname.replace(currentBase, nextBase)
      : `${nextBase}/builder`;
    router.push(nextPath);
  };

	  const navItems = [
	    {
	      title: "Back",
	      icon: SquareChevronLeft,
	      href: "/itineraries",
	    },
	    {
	      title: "Overview",
	      icon: TextSearch,
	      href: `/itinerary/${itineraryIdValue}/${destinationIdValue}/overview`,
	    },
	    {
	      title: "Build",
	      icon: NotebookPen,
	      href: `/itinerary/${itineraryIdValue}/${destinationIdValue}/builder`,
	    },
	  ];



  const handleDateRangeConfirm = async (dateRange: DateRange | undefined) => {
    try {
      setDateRange(dateRange);
      
      // Also update the date range store so table components can access it
      if (dateRange && dateRange.from && dateRange.to) {
        setStoreDateRange(dateRange.from, dateRange.to);
        
        const result = await setItineraryDestinationDateRange(itineraryIdValue, destinationIdValue, {
          from: dateRange.from,
          to: dateRange.to,
        });

        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ["itineraryDestination", itineraryIdValue, destinationIdValue] });
          queryClient.invalidateQueries({ queryKey: ["itineraryDateRange", itineraryIdValue] });
        } else {
          console.error("Error updating date range:", result.message);
        }
      } else {
        // Clear the store if no date range is selected
        setStoreDateRange(null, null);
      }
    } catch (error) {
      console.error("Error setting date range:", error);
    }
  };

  return (
    <Sidebar collapsible="icon" className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row">
      {/* Icon Sidebar */}
      <Sidebar
        collapsible="none"
        className="!w-[--sidebar-width-icon] border-r group-data-[collapsible=icon]:border-r-0"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0 mt-1">
                <Link href="/">
                  <div className="relative w-9 h-9">
                    <Image
                      className="object-contain"
                      src="/assets/yugi-mascot-1.png"
                      alt="Yugi Logo"
                      fill
                      priority
                      sizes="36px"
                      draggable={false}
                    />
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
                      asChild
                      className={cn(
                        pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground",
                        "transition-colors"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="pb-6">
          <NavUserIcon />
        </SidebarFooter>
      </Sidebar>

      {/* Content Sidebar */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex gap-4 ">
        <SidebarHeader className="px-12 pt-8 pb-4">
          {itinerary ? (
            <div className="flex flex-col gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-1 -mx-2 hover:bg-bg-50 transition-colors"
                    aria-label="Switch destination"
                  >
                    <div className="min-w-0">
                      <div className="text-2xl font-semibold truncate">
                        {itinerary.city} {", "} {itinerary.country}
                      </div>
                      {destinationsSummary.length > 1 ? (
                        <div className="text-xs text-muted-foreground">
                          {destinationsSummary.length} destinations
                        </div>
                      ) : null}
                    </div>
                    <ChevronDown className="h-5 w-5 text-ink-500 flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80">
                  {destinationsSummary.map((dest) => (
                    <DropdownMenuItem
                      key={dest.itinerary_destination_id}
                      className={cn(
                        "cursor-pointer",
                        Number(dest.itinerary_destination_id) === currentDestinationId && "bg-bg-50"
                      )}
                      onSelect={() => navigateToDestination(dest.itinerary_destination_id)}
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="font-medium truncate">
                          {dest.city}, {dest.country}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {formatRange(dest.from_date, dest.to_date)}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => setAddDestinationOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add destination
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
          <SimplifiedItinerarySidebar useExternalDndContext={useExternalDndContext} />
        </SidebarContent>
      </Sidebar>

      <SidebarRail />

      <AddDestinationDialog
        open={addDestinationOpen}
        onOpenChange={setAddDestinationOpen}
        itineraryId={itineraryIdValue}
        nextOrderNumber={nextOrderNumber}
        defaultDateRange={defaultNewDestinationRange}
        onDestinationCreated={(newDestinationId) => {
          queryClient.invalidateQueries({ queryKey: ["itineraryDestinationsSummary", itineraryIdValue] });
          setAddDestinationOpen(false);
          navigateToDestination(newDestinationId);
        }}
      />
    </Sidebar>
  );
}
