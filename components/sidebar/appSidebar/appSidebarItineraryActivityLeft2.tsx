"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, usePathname } from "next/navigation";
import { Binoculars, Command, NotebookPen, SquareChevronLeft, TextSearch, Heart, Search, Lightbulb } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WishlistPanel from "@/components/wishlist/WishlistPanel";
import PlaceSearch from "@/components/search/PlaceSearch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWishlistStore } from '@/store/wishlistStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoreVertical, Trash2, Edit, ExternalLink, MapPin, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WishlistItem } from '@/components/sidebar/WishlistItem';

// Sidebar-specific wishlist component
function SidebarWishlist() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const {
    wishlistItems,
    selectedCategory,
    selectedPriority,
    isLoading,
    setSelectedCategory,
    setSelectedPriority,
    setSearchQuery: setStoreSearchQuery,
    getFilteredItems,
    getWishlistCount,
    removeWishlistItem
  } = useWishlistStore();

  const filteredItems = getFilteredItems();
  const wishlistCount = getWishlistCount();

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setStoreSearchQuery(value);
  };

  const handleRemoveItem = async (item: any) => {
    try {
      removeWishlistItem(item.searchHistoryId);
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  };

  const formatRating = (rating: number) => (
    <div className="flex items-center space-x-1">
      <Star className="h-3 w-3 text-yellow-400 fill-current" />
      <span className="text-xs font-medium">{rating.toFixed(1)}</span>
    </div>
  );

  return (
    <div className="p-3 space-y-3 w-full">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search saved places..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 h-8 bg-background text-sm w-full"
        />
      </div>

      {/* Count */}
      {wishlistCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{wishlistCount} saved</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCategory('');
              setSelectedPriority('');
              handleSearchChange('');
            }}
            className="h-5 text-xs px-2"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Wishlist Items */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-muted rounded-md"></div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8">
          <Heart className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {wishlistCount === 0 ? 'No places saved yet' : 'No places match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 w-full">
          {filteredItems.map((item) => (
            <WishlistItem
              key={item.placeId}
              item={item}
              isDragEnabled={true}
              onRemove={() => handleRemoveItem(item)}
              showActions={true}
              className="w-full bg-muted/50 hover:bg-muted border-0 shadow-none"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AppSidebarItineraryActivityLeft() {
  const { itineraryId, destinationId } = useParams();
  const pathname = usePathname();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("days");

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
                  <Image
                    className="w-full h-full"
                    src="/journey1.svg"
                    alt="Journey Logo"
                    width={100}
                    height={100}
                    priority
                    draggable={false}
                  />
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
                        <span>{item.title}</span>
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="px-4 py-2">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="days" className="text-xs">
                  <NotebookPen className="h-3 w-3 mr-1" />
                  Days
                </TabsTrigger>
                <TabsTrigger value="saved" className="text-xs">
                  <Heart className="h-3 w-3 mr-1" />
                  Saved
                </TabsTrigger>
                <TabsTrigger value="search" className="text-xs">
                  <Search className="h-3 w-3 mr-1" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="ideas" className="text-xs">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Ideas
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="days" className="h-full m-0">
                <ScrollArea className="h-full">
                  <ItineraryList />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="saved" className="h-full m-0">
                <ScrollArea className="h-full">
                  <SidebarWishlist />
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="search" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-3 w-full">
                    <PlaceSearch 
                      onPlaceSelect={(place) => console.log('Place selected:', place)}
                      showFilters={false}
                      className="border-0 shadow-none bg-transparent p-0 w-full"
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="ideas" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      Suggested places and activities for your trip
                    </div>
                    <div className="text-center text-muted-foreground py-8">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Coming soon...</p>
                      <p className="text-xs">AI-powered suggestions based on your preferences</p>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </SidebarContent>
      </Sidebar>

      <SidebarRail />
    </Sidebar>
  );
}
