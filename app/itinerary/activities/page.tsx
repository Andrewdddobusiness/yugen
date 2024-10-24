"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import BuilderLayout from "@/components/layouts/builderLayout";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import ActivityCards from "@/components/cards/activityCards";
import ActivitySidebar from "@/components/sidebar/activitySideBar";
import Mapbox from "@/components/map/mapbox";
import { MdMoneyOff, MdAttachMoney } from "react-icons/md";

import { fetchItineraryDestination, fetchFilteredTableData, fetchFilteredTableData2 } from "@/actions/supabase/actions";
import { fetchCityCoordinates } from "@/actions/google/actions";
import { fetchNearbyActivities } from "@/actions/google/actions";
import Loading from "@/components/loading/loading";
import ActivityFilters from "@/components/filters/activityFilters";

import { IActivity, IActivityWithLocation, IOpenHours, useActivitiesStore } from "@/store/activityStore";
import { IItineraryActivity, useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useSidebarStore } from "@/store/sidebarStore";

import { useMapStore } from "@/store/mapStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActivityTabStore } from "@/store/activityTabStore";

export default function Activities() {
  const searchParams = useSearchParams();
  const itineraryId = searchParams.get("i");
  const destinationId = searchParams.get("d");

  // **** STORES ****
  const { activities, setActivities, selectedActivity, setSelectedActivity, topPlacesActivities, setTopPlacesActivities } = useActivitiesStore();
  const { fetchItineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const { mapRadius, setCenterCoordinates, itineraryCoordinates, setItineraryCoordinates } = useMapStore();
  const { isSidebarOpen, setIsSidebarOpen, sidebarKey, setSidebarKey } = useSidebarStore();
  const { selectedTab, setSelectedTab } = useActivityTabStore();

  // **** STATES ****
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [freeFilter, setFreeFilter] = useState<boolean>(false);
  const [paidFilter, setPaidFilter] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState("");

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // **** GET INITIAL ACTIVITIES ****
  const { data: itineraryActivities, isLoading: isItineraryActivitiesLoading } = useQuery({
    queryKey: ["itineraryActivities", itineraryId, destinationId],
    queryFn: () => fetchItineraryActivities(itineraryId as string, destinationId as string),
    enabled: !!itineraryId && !!destinationId,
  });

  useEffect(() => {
    if (itineraryActivities) {
      setItineraryActivities(itineraryActivities as IItineraryActivity[]);
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
    queryKey: ["cityCoordinates", destinationData?.data?.city, destinationData?.data?.country],
    queryFn: () => fetchCityCoordinates(destinationData?.data?.city, destinationData?.data?.country),
    enabled: !!destinationData?.data?.city && !!destinationData?.data?.country,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (cityCoordinates) {
      setCenterCoordinates([cityCoordinates.latitude, cityCoordinates.longitude]);
      setItineraryCoordinates([cityCoordinates.latitude, cityCoordinates.longitude]);
    }
  }, [cityCoordinates, setCenterCoordinates, setItineraryCoordinates]);

  const {
    data: fetchedActivities,
    isLoading: isActivitiesLoading,
    error: activitiesError,
    refetch: refetchActivities,
  } = useQuery({
    queryKey: ["nearbyActivities", itineraryCoordinates?.[0], itineraryCoordinates?.[1], mapRadius],
    queryFn: async () => {
      if (!itineraryCoordinates || itineraryCoordinates.length !== 2) {
        throw new Error("Invalid center coordinates");
      }
      return fetchNearbyActivities(itineraryCoordinates[0], itineraryCoordinates[1], mapRadius);
    },
    enabled: Array.isArray(itineraryCoordinates) && itineraryCoordinates.length === 2 && !initialLoadComplete,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (fetchedActivities && !initialLoadComplete) {
      setInitialLoadComplete(true);
      setActivities(fetchedActivities as IActivity[]);
    }
  }, [fetchedActivities, setActivities, initialLoadComplete, setInitialLoadComplete]);

  // **** GET TOP PLACES ACTIVITIES ****
  const { data: countryData, isLoading: isCountryDataLoading } = useQuery({
    queryKey: ["countryData", destinationData?.data?.country],
    queryFn: async () => {
      const result = await fetchFilteredTableData("country", "country_id", "country_name", [destinationData?.data?.country as string]);
      if (!result.success || !result.data) {
        throw new Error(result.message || "Failed to fetch country data");
      }
      return result.data;
    },
    enabled: !!destinationData?.data?.country,
  });

  const { data: cityData, isLoading: isCityDataLoading } = useQuery({
    queryKey: ["cityData", destinationData?.data?.city, countryData?.[0]?.country_id],
    queryFn: async () => {
      if (!countryData || !countryData[0] || typeof countryData[0].country_id === "undefined") {
        throw new Error("Country data is not available or invalid");
      }
      const result = await fetchFilteredTableData2("city", "city_id", {
        city_name: destinationData?.data?.city,
        country_id: countryData[0].country_id,
      });
      if ("error" in result || !result.data) {
        throw new Error(result.error?.message || "Failed to fetch city data");
      }
      return result.data;
    },
    enabled: !!destinationData?.data?.city && !!countryData && countryData.length > 0,
  });

  const { data: fetchedtopPlacesActivities, isLoading: isTopPlacesActivitiesLoading } = useQuery<IActivity[]>({
    queryKey: ["topPlacesActivities", cityData?.[0]?.city_id],
    queryFn: async () => {
      if (!cityData || !cityData[0] || typeof cityData[0].city_id === "undefined") {
        throw new Error("City data is not available or invalid");
      }
      const result = await fetchFilteredTableData2(
        "activity",
        `*,
        review(*),
        open_hours(*)`,
        {
          city_id: cityData[0].city_id,
          is_top_place: true,
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.message || "Failed to fetch top places activities");
      }
      return result.data.map((activity: any) => ({
        place_id: activity.place_id,
        name: activity.name,
        coordinates: activity.coordinates,
        types: activity.types,
        price_level: activity.price_level,
        address: activity.address,
        rating: activity.rating,
        description: activity.description,
        google_maps_url: activity.google_maps_url,
        website_url: activity.website_url,
        photo_names: activity.photo_names,
        duration: activity.duration,
        phone_number: activity.phone_number,
        reviews: activity.review,
        open_hours: activity.open_hours.map((oh: any) => ({
          day: oh.day,
          open_hour: oh.open_hour,
          open_minute: oh.open_minute,
          close_hour: oh.close_hour,
          close_minute: oh.close_minute,
        })),
        is_top_place: activity.is_top_place,
      }));
    },
    enabled: !!cityData && cityData.length > 0,
  });

  useEffect(() => {
    setTopPlacesActivities(fetchedtopPlacesActivities as IActivity[]);
  }, [fetchedtopPlacesActivities, isTopPlacesActivitiesLoading, setTopPlacesActivities]);

  useEffect(() => {
    if (itineraryActivities) {
      setItineraryActivities(itineraryActivities as IItineraryActivity[]);
    }
  }, [itineraryActivities, setItineraryActivities]);

  // **** HANDLERS ****
  const handleActivitySelect = (activity: any) => {
    setSelectedActivity(activity);
    setIsSidebarOpen(true);
    setSidebarKey(sidebarKey);
  };

  const handleCloseSidebar = () => {
    setSelectedActivity(null);
    setIsSidebarOpen(false);
  };

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  // const filteredActivities =
  //   selectedFilter === ""
  //     ? activitiesData
  //     : activitiesData?.pages
  //         .flatMap((page: any) => page)
  //         .filter((activity: any) => {
  //           const types = activity.types || [];
  //           switch (selectedFilter) {
  //             case "Food & Drink":
  //               return types.some((type: string) =>
  //                 ["restaurant", "cafe", "bar"].includes(type)
  //               );
  //             case "Historical":
  //               return (
  //                 types.includes("museum") ||
  //                 types.includes("tourist_attraction")
  //               );
  //             case "Shopping":
  //               return (
  //                 types.includes("shopping_mall") || types.includes("store")
  //               );
  //             default:
  //               return true;
  //           }
  //         });

  return (
    <BuilderLayout title="Activities" activePage="activities" itineraryNumber={1}>
      {isCoordinatesLoading || isDestinationLoading || isActivitiesLoading || isItineraryActivitiesLoading ? (
        <Loading />
      ) : (
        <div className="flex flex-row flex-grow overflow-hidden h-full relative">
          <div className={`p-4 flex flex-col transition-all duration-300 ${isSidebarOpen ? "w-1/2 md:w-1/3 " : "w-1/2"}`}>
            <div className="flex flex-col items-center">
              <div className="text-2xl text-black font-bold flex justify-left pt-8">Explore Activities</div>
              <div className="text-md text-zinc-500 flex justify-left">Search for activities that you want to do!</div>
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
                    className={`h-8 rounded-full ${freeFilter ? "bg-gray-200" : ""}`}
                    onClick={() => setFreeFilter(!freeFilter)}
                  >
                    <MdMoneyOff size={16} />
                    {!isSidebarOpen && <div className="pl-1">Free</div>}
                  </Toggle>
                  <Toggle
                    variant="outline"
                    className={`h-8 rounded-full ml-2 ${paidFilter ? "bg-gray-200" : ""}`}
                    onClick={() => setPaidFilter(!paidFilter)}
                  >
                    <MdAttachMoney size={16} />
                    {!isSidebarOpen && <div className="pl-1">Paid</div>}
                  </Toggle>
                </div>
                <div className="mr-8">
                  <ActivityFilters selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} />
                </div>
              </div>
              <Separator className="my-4" />
            </div>
            <div className="flex flex-col flex-grow overflow-hidden ">
              <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as "top-places" | "search")}>
                <TabsList>
                  <TabsTrigger value="top-places">Top places</TabsTrigger>
                  <TabsTrigger value="search">Search</TabsTrigger>
                </TabsList>
                <TabsContent value="top-places">
                  <ScrollArea className="h-full px-4">
                    {topPlacesActivities && (
                      <ActivityCards activities={topPlacesActivities as IActivityWithLocation[]} onSelectActivity={handleActivitySelect} />
                    )}
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="search">
                  <ScrollArea className="h-full px-4">
                    {activities && <ActivityCards activities={activities as IActivityWithLocation[]} onSelectActivity={handleActivitySelect} />}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <div className={`border-x h-full relative transition-all duration-300 ${isSidebarOpen ? "w-0 md:w-1/3" : "w-1/2"}`}>
            {cityCoordinates && <Mapbox />}
          </div>
          <div
            className={`absolute top-0 right-0 h-full z-50 transition-all duration-300 transform ${
              isSidebarOpen ? "w-6/12 md:w-4/12 translate-x-0" : "w-4/12 translate-x-full hidden"
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
