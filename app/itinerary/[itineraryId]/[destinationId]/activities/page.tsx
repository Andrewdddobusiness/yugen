"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import BuilderLayout from "@/components/layouts/builderLayout";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ActivityCards from "@/components/cards/activityCards";
import ActivitySidebar from "@/components/sidebar/activitySideBar";
import Mapbox from "@/components/map/mapbox";
import Loading from "@/components/loading/loading";
import ActivityFilters from "@/components/filters/activityFilters";
import ActivityCostFilters from "@/components/filters/activityCostFilters";
import SearchField from "@/components/search/searchField";
import ActivitySkeletonCards from "@/components/cards/activitySkeletonCards";

import {
  fetchItineraryDestination,
  fetchFilteredTableData,
  fetchFilteredTableData2,
  fetchSearchHistoryActivities,
  insertActivity,
} from "@/actions/supabase/actions";
import { fetchCityCoordinates, fetchPlaceDetails } from "@/actions/google/actions";
import { fetchNearbyActivities } from "@/actions/google/actions";

import { IActivity, IActivityWithLocation, IOpenHours, useActivitiesStore } from "@/store/activityStore";
import { IItineraryActivity, useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useMapStore } from "@/store/mapStore";
import { useActivityTabStore } from "@/store/activityTabStore";

import { filterActivities } from "@/utils/filters/filterActivities";
import { activityTypeFilters, activityCostFilters } from "@/utils/filters/filters";

import { Popup } from "react-map-gl";

export default function Activities() {
  const queryClient = useQueryClient();
  const { itineraryId, destinationId } = useParams();

  // **** STORES ****
  const {
    activities,
    setActivities,
    selectedActivity,
    setSelectedActivity,
    topPlacesActivities,
    setTopPlacesActivities,
    selectedFilters,
    selectedCostFilters,
    searchHistoryActivities,
    setSearchHistoryActivities,
  } = useActivitiesStore();
  const { fetchItineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const { mapRadius, setCenterCoordinates, itineraryCoordinates, setItineraryCoordinates } = useMapStore();
  const { isSidebarOpen, setIsSidebarOpen, sidebarKey, setSidebarKey } = useSidebarStore();
  const { selectedTab, setSelectedTab } = useActivityTabStore();

  // **** STATES ****
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
    name: string;
  } | null>(null);

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

  useEffect(() => {
    if (itineraryActivities) {
      setItineraryActivities(itineraryActivities as IItineraryActivity[]);
    }
  }, [itineraryActivities, setItineraryActivities]);

  // **** HANDLERS ****
  const handleActivitySelect = (activity: IActivity) => {
    setSelectedActivity(activity);
    setIsSidebarOpen(true);
    setSidebarKey(sidebarKey);
  };

  const handleCloseSidebar = () => {
    setSelectedActivity(null);
    setIsSidebarOpen(false);
  };
  const handleTabChange = (tab: "top-places" | "search" | "history") => {
    setSelectedTab(tab);
  };

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
        searchHistoryActivitiesData.activities.length > 0
      ) {
        const newActivities = searchHistoryActivitiesData.activities;
        const existingPlaceIds = new Set(searchHistoryActivities.map((activity) => activity.place_id));
        const filteredNewActivities = newActivities.filter((activity) => !existingPlaceIds.has(activity.place_id));

        setSearchHistoryActivities(newActivities);

        const missingPlaceIds = searchHistoryActivitiesData.missingPlaceIds || [];

        // Fetch missing activities
        for (const placeId of missingPlaceIds) {
          try {
            const placeDetails = await placeDetailsQuery(placeId);

            if (placeDetails) {
              const newActivity = await insertActivityMutation.mutateAsync(placeDetails);

              setSearchHistoryActivities((prevActivities: IActivity[]) => {
                const currentActivities = Array.isArray(prevActivities) ? prevActivities : [];
                if (currentActivities.some((a) => a.place_id === newActivity.place_id)) {
                  return currentActivities;
                }

                return [...currentActivities, newActivity];
              });
            }
          } catch (error) {
            console.error("Error fetching and inserting missing activity:", error);
          }
        }
      }
    };

    fetchActivities();
  }, [searchHistoryActivitiesData, setSearchHistoryActivities]);

  return (
    <>
      {isCoordinatesLoading || isDestinationLoading || isActivitiesLoading || isItineraryActivitiesLoading ? (
        <Loading />
      ) : (
        <div className="flex flex-row h-full pt-[64px] overflow-hidden">
          <div
            className={`p-4 flex flex-col h-full transition-all duration-300 ${
              isSidebarOpen ? "w-1/2 md:w-1/3 " : "w-full sm:w-1/2 "
            }`}
          >
            <div className="flex flex-col items-center">
              <div className="text-2xl text-black font-bold flex justify-left pt-8">Explore Activities</div>
              <div className="text-md text-zinc-500 flex justify-left">Search for activities that you want to do!</div>
              <SearchField />
              <div className="flex flex-row justify-between w-full pt-8 px-4">
                <ActivityCostFilters />

                <ActivityFilters />
              </div>
              <Separator className="mt-8 mb-4" />
            </div>
            <div className="flex flex-col flex-grow overflow-hidden">
              <Tabs
                defaultValue={selectedTab}
                value={selectedTab}
                onValueChange={(value) => handleTabChange(value as "top-places" | "search" | "history")}
                className="flex flex-col h-full"
              >
                <div className="pl-4 pt-4 pb-2">
                  <TabsList>
                    <TabsTrigger value="top-places">Top Places</TabsTrigger>
                    <TabsTrigger value="search">Wide Search</TabsTrigger>
                    <TabsTrigger value="history">Search History</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="top-places" className="flex-grow overflow-hidden ">
                  <ScrollArea className="h-full px-4">
                    {topPlacesActivities && (
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
                    )}
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="search" className="flex-grow overflow-hidden">
                  <ScrollArea className="h-full px-4">
                    {activities && (
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
                    )}
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="history" className="flex-grow overflow-hidden">
                  <ScrollArea className="h-full px-4">
                    {searchHistoryActivities && Array.isArray(searchHistoryActivities) ? (
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
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <div
            className={`border-x h-full relative transition-all duration-300 ${
              isSidebarOpen ? "w-0 md:w-1/3 hidden md:block" : "sm:w-1/2 w-0 hidden sm:block"
            }`}
          >
            {cityCoordinates && (
              <Mapbox
              // onWaypointHover={(activity: IActivity) => {
              //   if (activity.geometry?.location) {
              //     setPopupInfo({
              //       longitude: activity.geometry.location.lng,
              //       latitude: activity.geometry.location.lat,
              //       name: activity.name,
              //     });
              //   }
              // }}
              // onWaypointLeave={() => {
              //   setPopupInfo(null);
              // }}
              />
            )}
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
          <div
            className={`absolute top-0 right-0 h-full z-50 transition-all duration-300 transform ${
              isSidebarOpen
                ? "w-[calc(50%-18px)] md:w-[calc(33.333333%-18px)] translate-x-0"
                : "w-[calc(33.333333%-18px)] translate-x-full hidden"
            }`}
          >
            {isSidebarOpen && (
              <ActivitySidebar
                key={sidebarKey}
                activity={{
                  ...(selectedActivity as IActivityWithLocation),
                  country_name: destinationData?.data?.country,
                  city_name: destinationData?.data?.city,
                  itinerary_destination_id: destinationData?.data?.itinerary_destination_id,
                }}
                onClose={handleCloseSidebar}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
