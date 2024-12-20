"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ActivityCards from "@/components/cards/activityCards";

import Loading from "@/components/loading/loading";
import ActivityTypeFilters from "@/components/filters/activityTypeFilters";
import ActivityCostFilters from "@/components/filters/activityCostFilters";
import ActivitySkeletonCards from "@/components/cards/activitySkeletonCards";

import {
  fetchItineraryDestination,
  fetchFilteredTableData,
  fetchFilteredTableData2,
  fetchSearchHistoryActivities,
  insertActivity,
  deleteItinerarySearchHistory,
} from "@/actions/supabase/actions";
import { fetchCityCoordinates, fetchPlaceDetails } from "@/actions/google/actions";
import { fetchNearbyActivities } from "@/actions/google/actions";

import { IActivity, IActivityWithLocation, IOpenHours, useActivitiesStore } from "@/store/activityStore";

import { useSidebarStore } from "@/store/sidebarStore";

import { useMapStore } from "@/store/mapStore";
import { useActivityTabStore } from "@/store/activityTabStore";

import { filterActivities } from "@/utils/filters/filterActivities";
import { activityTypeFilters, activityCostFilters } from "@/utils/filters/filters";

import { Popup } from "react-map-gl";
import GoogleMapComponent from "@/components/map/googleMap";
import ClearHistoryButton from "@/components/buttons/clearHistoryButton";
import ActivityOrderFilters from "@/components/filters/activityOrderFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { EarthIcon } from "lucide-react";
import { ViewToggleButton } from "@/components/buttons/mapViewToggleButton";
import { cn } from "@/components/lib/utils";

import { useSidebar } from "@/components/ui/sidebar";

export default function Activities() {
  const queryClient = useQueryClient();
  const { itineraryId, destinationId } = useParams();

  // **** STORES ****
  const {
    activities,
    setActivities,
    setSelectedActivity,
    topPlacesActivities,
    setTopPlacesActivities,
    selectedFilters,
    selectedCostFilters,
    searchHistoryActivities,
    setSearchHistoryActivities,
  } = useActivitiesStore();
  const { mapRadius, setCenterCoordinates, itineraryCoordinates, setItineraryCoordinates, isMapView, setIsMapView } =
    useMapStore();
  const { setIsSidebarRightOpen } = useSidebarStore();
  const { selectedTab, setSelectedTab } = useActivityTabStore();
  const { open } = useSidebar();

  // **** STATES ****
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
    name: string;
  } | null>(null);

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
      const result = await fetchFilteredTableData("country", "country_id", "country_name", [
        destinationData?.data?.country as string,
      ]);
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

  const { data: fetchedtopPlacesActivities, isLoading: isTopPlacesActivitiesLoading } = useQuery({
    queryKey: ["topPlacesActivities", cityData?.[0]?.city_id],
    queryFn: async (): Promise<IActivity[]> => {
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
      return result.data.map((activity: IActivity) => ({
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
        reviews: activity.reviews,
        open_hours: activity.open_hours.map((oh: IOpenHours) => ({
          day: oh.day,
          open_hour: oh.open_hour,
          open_minute: oh.open_minute,
          close_hour: oh.close_hour,
          close_minute: oh.close_minute,
        })),
        is_top_place: activity.is_top_place,
      })) as IActivity[];
    },
    enabled: !!cityData && cityData.length > 0,
  });

  useEffect(() => {
    setTopPlacesActivities(fetchedtopPlacesActivities as IActivity[]);
  }, [fetchedtopPlacesActivities, isTopPlacesActivitiesLoading, setTopPlacesActivities]);

  // **** GET SEARCH HISTORY ACTIVITIES ****
  const { data: searchHistoryActivitiesData, isLoading: isSearchHistoryLoading } = useQuery<{
    activities: IActivity[];
    missingPlaceIds: string[];
  }>({
    queryKey: ["searchHistoryActivities", itineraryId, destinationId],
    queryFn: async () => {
      const result = await fetchSearchHistoryActivities(itineraryId as string, destinationId as string);
      if (result.error) throw result.error;
      return result;
    },
    enabled: !!itineraryId && !!destinationId,
  });

  const placeDetailsQuery = async (placeId: string) => {
    const data = await queryClient.fetchQuery({
      queryKey: ["placeDetails", placeId],
      queryFn: async () => {
        try {
          const response = await fetchPlaceDetails(placeId);
          if (!response) {
            throw new Error("Failed to fetch place details");
          }
          return response;
        } catch (error) {
          console.error("Error fetching place details:", error);
          throw error;
        }
      },
      staleTime: Infinity,
    });
    return data;
  };

  const insertActivityMutation = useMutation({
    mutationFn: async (placeDetails: any) => {
      return await insertActivity(placeDetails);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["searchHistoryActivities"] });
    },
  });

  useEffect(() => {
    const fetchActivities = async () => {
      if (
        searchHistoryActivitiesData &&
        Array.isArray(searchHistoryActivitiesData.activities) &&
        (searchHistoryActivitiesData.activities.length > 0 || searchHistoryActivitiesData.missingPlaceIds.length > 0)
      ) {
        let newActivities: IActivity[] = [];

        if (searchHistoryActivitiesData.activities.length > 0) {
          newActivities = searchHistoryActivitiesData.activities;
        }

        setSearchHistoryActivities(newActivities);

        const missingPlaceIds = searchHistoryActivitiesData.missingPlaceIds || [];

        // Fetch missing activities
        for (const placeId of missingPlaceIds) {
          try {
            const placeDetails = await placeDetailsQuery(placeId);

            if (placeDetails) {
              const newActivity = await insertActivityMutation.mutateAsync(placeDetails);

              let currentActivities = Array.isArray(searchHistoryActivities) ? searchHistoryActivities : [];
              if (currentActivities.some((a: IActivity) => a.place_id === newActivity.place_id)) {
                currentActivities = currentActivities;
              } else {
                currentActivities = [...currentActivities, newActivity];
              }
              setSearchHistoryActivities(currentActivities);
            }
          } catch (error) {
            console.error("Error fetching and inserting missing activity:", error);
          }
        }
      }
    };

    fetchActivities();
  }, [searchHistoryActivitiesData, setSearchHistoryActivities]);

  // **** HANDLERS ****
  const handleActivitySelect = (activity: IActivity) => {
    setSelectedActivity(activity);
    setIsSidebarRightOpen(true);
  };

  const handleTabChange = (tab: "top-places" | "search" | "history") => {
    setSelectedTab(tab);
  };

  const handleClearHistory = async () => {
    await deleteItinerarySearchHistory(itineraryId as string, destinationId as string);
  };

  const toggleView = () => setIsMapView(!isMapView);

  if (isCoordinatesLoading || isDestinationLoading) return <Loading />;

  return (
    <div className="flex flex-row h-full w-full">
      <div
        className={cn(
          "p-4 flex flex-col h-full transition-all duration-300",
          isMapView ? "hidden lg:flex lg:w-1/2" : open ? "w-full lg:w-1/2" : "w-full lg:w-1/2"
        )}
      >
        <div className="flex flex-col flex-grow overflow-hidden">
          <Tabs
            defaultValue={selectedTab}
            value={selectedTab}
            onValueChange={(value) => handleTabChange(value as "top-places" | "search" | "history")}
            className="flex flex-col h-full"
          >
            <div className="flex flex-row justify-center">
              <TabsList className="border">
                <TabsTrigger value="top-places">Top Places</TabsTrigger>
                <TabsTrigger value="search">Wide Search</TabsTrigger>
                <TabsTrigger value="history">Search History</TabsTrigger>
              </TabsList>
            </div>
            <Separator className="mt-4 mb-2" />
            <TabsContent value="top-places" className="flex-grow overflow-hidden">
              <div className="flex flex-col h-full gap-4">
                <div className="flex flex-row justify-between w-full px-4">
                  <div className="flex flex-row gap-2 w-full">
                    <ActivityCostFilters />
                    <ActivityTypeFilters />
                    <ActivityOrderFilters
                      activities={topPlacesActivities as IActivityWithLocation[]}
                      setActivities={setTopPlacesActivities}
                    />
                  </div>
                </div>
                <ScrollArea className="flex h-full px-4 pb-14 sm:pb-0">
                  {topPlacesActivities && Array.isArray(topPlacesActivities) && topPlacesActivities.length > 0 ? (
                    <ActivityCards
                      activities={
                        (selectedFilters.length > 0 || selectedCostFilters.length > 0
                          ? filterActivities(
                              filterActivities(
                                topPlacesActivities as IActivityWithLocation[],
                                selectedFilters,
                                activityTypeFilters
                              ),
                              selectedCostFilters,
                              activityCostFilters
                            )
                          : topPlacesActivities) as IActivityWithLocation[]
                      }
                      onSelectActivity={handleActivitySelect}
                    />
                  ) : (
                    <ActivitySkeletonCards />
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
            <TabsContent value="search" className="flex-grow overflow-hidden">
              <div className="flex flex-col h-full gap-4">
                <div className="flex flex-row justify-between w-full px-4 pb-4">
                  <div className="flex flex-row gap-2 w-full">
                    <ActivityCostFilters />
                    <ActivityTypeFilters />
                    <ActivityOrderFilters
                      activities={activities as IActivityWithLocation[]}
                      setActivities={setActivities}
                    />
                  </div>
                </div>

                <ScrollArea className="h-full px-4">
                  {activities && Array.isArray(activities) && activities.length > 0 ? (
                    <ActivityCards
                      activities={
                        (selectedFilters.length > 0 || selectedCostFilters.length > 0
                          ? filterActivities(
                              filterActivities(
                                activities as IActivityWithLocation[],
                                selectedFilters,
                                activityTypeFilters
                              ),
                              selectedCostFilters,
                              activityCostFilters
                            )
                          : activities) as IActivityWithLocation[]
                      }
                      onSelectActivity={handleActivitySelect}
                    />
                  ) : (
                    <ActivitySkeletonCards />
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
            <TabsContent value="history" className="flex-grow overflow-hidden">
              <div className="flex flex-col h-full gap-4">
                <div className="relative w-full px-4">
                  <ScrollArea className="w-full pb-4">
                    <div className="flex flex-row items-center justify-between gap-2 min-w-max">
                      <div className="flex flex-row gap-2">
                        <ActivityCostFilters />
                        <ActivityTypeFilters />
                        <ActivityOrderFilters
                          activities={searchHistoryActivities as IActivityWithLocation[]}
                          setActivities={setSearchHistoryActivities}
                        />
                      </div>
                      <ClearHistoryButton onClearHistory={handleClearHistory} />
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                <ScrollArea className="h-full px-4">
                  {searchHistoryActivities &&
                  Array.isArray(searchHistoryActivities) &&
                  searchHistoryActivities.length > 0 ? (
                    <ActivityCards
                      activities={
                        (selectedFilters.length > 0 || selectedCostFilters.length > 0
                          ? filterActivities(
                              filterActivities(
                                searchHistoryActivities as IActivityWithLocation[],
                                selectedFilters,
                                activityTypeFilters
                              ),
                              selectedCostFilters,
                              activityCostFilters
                            )
                          : searchHistoryActivities) as IActivityWithLocation[]
                      }
                      onSelectActivity={handleActivitySelect}
                    />
                  ) : (
                    <ActivitySkeletonCards />
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <div
        className={cn(
          "h-full relative transition-all duration-300",
          isMapView ? (open ? "w-full lg:w-1/2" : "w-full lg:w-1/2") : "hidden lg:w-1/2 lg:block"
        )}
      >
        {isCoordinatesLoading ? (
          <div className="w-full h-full bg-zinc-50 rounded-lg flex items-center justify-center">
            <div className="space-y-3 w-full h-full">
              <Skeleton className="flex items-center justify-center w-full h-full rounded-lg bg-zinc-200">
                <EarthIcon className="w-[20%] h-[20%] text-zinc-300" />
              </Skeleton>
            </div>
          </div>
        ) : cityCoordinates ? (
          <GoogleMapComponent />
        ) : null}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            className="z-50"
          >
            <div className="px-2 py-1 text-sm font-medium">{popupInfo.name}</div>
          </Popup>
        )}
      </div>
      <ViewToggleButton isMapView={isMapView} onToggle={toggleView} />
    </div>
  );
}
