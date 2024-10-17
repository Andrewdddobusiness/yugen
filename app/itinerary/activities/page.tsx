"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

import BuilderLayout from "@/components/layouts/builderLayout";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import ActivityCards from "@/components/cards/activityCards";
import MapBox from "@/components/map/mapbox";
import ActivitySidebar from "@/components/sidebar/activitySideBar";

import { MdMoneyOff, MdAttachMoney } from "react-icons/md";
import { Drama, Landmark, MountainSnow, Palette, Loader2 } from "lucide-react";

import {
  fetchTableData,
  fetchItineraryDestination,
} from "@/actions/supabase/actions";
import { fetchCityCoordinates } from "@/actions/google/actions";
import { fetchNearbyActivities } from "@/actions/google/actions";
import Loading from "@/components/loading/loading";
import ActivityFilters from "@/components/filters/activityFilters";

import { IActivity, IActivityWithLocation } from "@/store/activityStore";
import {
  IItineraryActivity,
  useitineraryActivityStore,
} from "@/store/itineraryActivityStore";
import { InfiniteScroll } from "@/components/scroll/infiniteScroll";

export default function Activities() {
  const searchParams = useSearchParams();
  const itineraryId = searchParams.get("i");
  const destinationId = searchParams.get("d");

  const { fetchItineraryActivities, setItineraryActivities } =
    useitineraryActivityStore();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [freeFilter, setFreeFilter] = useState<boolean>(false);
  const [paidFilter, setPaidFilter] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<IActivity | null>(
    null
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarKey, setSidebarKey] = useState(0);
  const [mapCenterFunction, setMapCenterFunction] = useState<
    ((location: [number, number]) => void) | null
  >(null);
  const [selectedFilter, setSelectedFilter] = useState("");

  const { data: itineraryActivities, isLoading: isItineraryActivitiesLoading } =
    useQuery({
      queryKey: ["itineraryActivities", itineraryId, destinationId],
      queryFn: () =>
        fetchItineraryActivities(
          itineraryId as string,
          destinationId as string
        ),
      enabled: !!itineraryId && !!destinationId,
    });

  useEffect(() => {
    if (itineraryActivities) {
      setItineraryActivities(itineraryActivities as IItineraryActivity[]);
      console.log(itineraryActivities);
    }
  }, [itineraryActivities, setItineraryActivities]);

  const { data: destinationData, isLoading: isDestinationLoading } = useQuery({
    queryKey: ["itineraryDestination", itineraryId],
    queryFn: () => fetchItineraryDestination(itineraryId as string),
    enabled: !!itineraryId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: cityCoordinates, isLoading: isCoordinatesLoading } = useQuery({
    queryKey: [
      "cityCoordinates",
      destinationData?.data?.city,
      destinationData?.data?.country,
    ],
    queryFn: () =>
      fetchCityCoordinates(
        destinationData?.data?.city,
        destinationData?.data?.country
      ),
    enabled: !!destinationData?.data?.city && !!destinationData?.data?.country,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const {
    data: activitiesData,
    isLoading: isActivitiesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "nearbyActivities",
      cityCoordinates?.latitude,
      cityCoordinates?.longitude,
    ],
    queryFn: ({ pageParam = 0 }) =>
      fetchNearbyActivities(
        cityCoordinates!.latitude,
        cityCoordinates!.longitude,
        pageParam
      ),
    getNextPageParam: (lastPage, pages) => {
      if ((lastPage as any[]).length < 20) return undefined;
      return pages.length;
    },
    enabled: !!cityCoordinates,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialPageParam: 0,
  });

  const handleActivitySelect = (activity: any) => {
    setSelectedActivity(activity);
    setIsSidebarOpen(true);
    setSidebarKey((prevKey) => prevKey + 1);
  };

  const handleCloseSidebar = () => {
    setSelectedActivity(null);
    setIsSidebarOpen(false);
  };

  const handleWaypointClick = (location: [number, number] | null) => {
    if (mapCenterFunction && location) {
      mapCenterFunction(location);
    }
  };

  const handleActivityHover = (coordinates: [number, number]) => {
    if (mapCenterFunction) {
      mapCenterFunction(coordinates);
    }
  };

  const filteredActivities =
    selectedFilter === ""
      ? activitiesData
      : activitiesData?.pages
          .flatMap((page: any) => page)
          .filter((activity: any) => {
            const types = activity.types || [];
            switch (selectedFilter) {
              case "Food & Drink":
                return types.some((type: string) =>
                  ["restaurant", "cafe", "bar"].includes(type)
                );
              case "Historical":
                return (
                  types.includes("museum") ||
                  types.includes("tourist_attraction")
                );
              case "Shopping":
                return (
                  types.includes("shopping_mall") || types.includes("store")
                );
              default:
                return true;
            }
          });

  return (
    <BuilderLayout
      title="Activities"
      activePage="activities"
      itineraryNumber={1}
    >
      {isCoordinatesLoading ||
      isDestinationLoading ||
      isActivitiesLoading ||
      isItineraryActivitiesLoading ? (
        <Loading />
      ) : (
        <div className="flex flex-row flex-grow overflow-y-auto h-full relative">
          <div className="flex flex-row w-full transition-all duration-300">
            <div
              className={`p-4 min-h-[870px] rounded-lg flex flex-col transition-all duration-300 ${
                isSidebarOpen ? "w-1/2 md:w-1/3 " : "w-1/2"
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="text-2xl text-black font-bold flex justify-left pt-8">
                  Explore Activities
                </div>
                <div className="text-md text-zinc-500 flex justify-left">
                  Search for activities that you want to do!
                </div>
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px] mt-2"
                />
                <div className="flex flex-row justify-between w-full mt-4">
                  <div className="ml-8">
                    <Toggle
                      variant="outline"
                      className={`h-8 rounded-full ${
                        freeFilter ? "bg-gray-200" : ""
                      }`}
                      onClick={() => setFreeFilter(!freeFilter)}
                    >
                      <MdMoneyOff size={16} />
                      {!isSidebarOpen && <div className="pl-1">Free</div>}
                    </Toggle>
                    <Toggle
                      variant="outline"
                      className={`h-8 rounded-full ml-2 ${
                        paidFilter ? "bg-gray-200" : ""
                      }`}
                      onClick={() => setPaidFilter(!paidFilter)}
                    >
                      <MdAttachMoney size={16} />
                      {!isSidebarOpen && <div className="pl-1">Paid</div>}
                    </Toggle>
                  </div>
                  <div className="mr-8">
                    <ActivityFilters
                      selectedFilter={selectedFilter}
                      setSelectedFilter={setSelectedFilter}
                    />
                  </div>
                </div>
                <Separator className="my-4" />
              </div>
              <ScrollArea className="flex flex-col h-full pb-4 px-4">
                <div>
                  {activitiesData?.pages.map((page, i) => (
                    <ActivityCards
                      key={i}
                      activities={page as IActivityWithLocation[]}
                      onSelectActivity={handleActivitySelect}
                      onHover={handleActivityHover}
                      isSidebarOpen={isSidebarOpen}
                    />
                  ))}
                </div>
                <InfiniteScroll
                  loadMore={fetchNextPage}
                  hasMore={!!hasNextPage}
                />
                {isFetchingNextPage && (
                  <div className="flex flex-col items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500 mb-2" />
                    <p className="text-sm text-gray-500">
                      Loading more activities...
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>
            <div
              className={`border relative transition-all duration-300 ${
                isSidebarOpen ? "w-0 md:w-1/2" : "lg:w-1/2"
              }`}
            >
              <MapBox
                key="mapbox"
                selectedActivity={selectedActivity}
                setSelectedActivity={setSelectedActivity}
                activities={activitiesData?.pages.flat()}
                center={
                  cityCoordinates
                    ? [cityCoordinates.longitude, cityCoordinates.latitude]
                    : undefined
                }
                onWaypointClick={setMapCenterFunction}
              />
            </div>
          </div>
          <div
            className={`absolute top-0 right-0 h-full z-50 transition-all duration-300 transform ${
              isSidebarOpen
                ? "w-6/12 md:w-4/12 translate-x-0"
                : "w-4/12 translate-x-full hidden"
            }`}
          >
            {isSidebarOpen && (
              <ActivitySidebar
                key={sidebarKey}
                activity={{
                  ...(selectedActivity as IActivityWithLocation),
                  country_name: destinationData?.data?.country,
                  city_name: destinationData?.data?.city,
                  destination_id: destinationData?.data?.destination_id,
                }}
                onClose={handleCloseSidebar}
              />
            )}
          </div>
        </div>
      )}
    </BuilderLayout>
  );
}
