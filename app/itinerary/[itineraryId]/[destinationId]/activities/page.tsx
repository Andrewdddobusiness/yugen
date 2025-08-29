"use client";
import React, { useEffect, useState, lazy, Suspense } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ActivityCards from "@/components/card/activity/ActivityCards";

import Loading from "@/components/loading/Loading";
import ActivityTypeFilters from "@/components/filters/ActivityTypeFilters";
import ActivityCostFilters from "@/components/filters/ActivityCostFilters";
import ActivitySkeletonCards from "@/components/card/activity/ActivitySkeletonCards";

import {
  fetchItineraryDestination,
  fetchSearchHistoryActivities,
  insertActivity,
  deleteItinerarySearchHistory,
} from "@/actions/supabase/actions";
import { fetchPlaceDetails, fetchCityCoordinates } from "@/actions/google/actions";

import { IActivity, IActivityWithLocation, useActivitiesStore } from "@/store/activityStore";

import { useSidebarStore } from "@/store/sidebarStore";

import { useMapStore } from "@/store/mapStore";
import { useActivityTabStore } from "@/store/activityTabStore";

import { filterActivities } from "@/utils/filters/filterActivities";
import { activityTypeFilters, activityCostFilters } from "@/utils/filters/filters";

import { InfoWindow } from "@vis.gl/react-google-maps";
// Lazy load heavy Google Maps component
const GoogleMapComponent = lazy(() => import("@/components/map/GoogleMap"));
import ClearHistoryButton from "@/components/button/map/ClearHistoryButton";
import ActivityOrderFilters from "@/components/filters/ActivityOrderFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { EarthIcon } from "lucide-react";
import { ViewToggleButton } from "@/components/button/map/MapViewToggleButton";
import { cn } from "@/components/lib/utils";

import { useSidebar } from "@/components/ui/sidebar";

export default function Activities() {
  const queryClient = useQueryClient();
  const { itineraryId, destinationId } = useParams();

  // **** STORES ****
  const {
    setSelectedActivity,
    selectedFilters,
    selectedCostFilters,
    areaSearchActivities,
    searchHistoryActivities,
    setSearchHistoryActivities,
  } = useActivitiesStore();
  const { mapRadius, setCenterCoordinates, itineraryCoordinates, setItineraryCoordinates, isMapView, setIsMapView } =
    useMapStore();
  const { setIsSidebarRightOpen } = useSidebarStore();
  const { selectedTab, setSelectedTab } = useActivityTabStore();
  const { open } = useSidebar();

  // **** STATES ****

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
    enabled: !!itineraryId && !!destinationId && selectedTab === "history", // Only fetch when history tab is active
    staleTime: 15 * 60 * 1000, // 15 minutes stale time - increased for better caching
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
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
      staleTime: Infinity, // Cache indefinitely since place details don't change
      gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
      retry: 1, // Reduce retry attempts
    });
    return data;
  };

  const insertActivityMutation = useMutation({
    mutationFn: async (placeDetails: any) => {
      return await insertActivity(placeDetails);
    },
    // Remove automatic invalidation to prevent excessive re-fetching
    // We'll handle state updates manually in the useEffect
  });

  // Track which place IDs we've already processed to prevent duplicate requests
  const [processedPlaceIds, setProcessedPlaceIds] = useState<Set<string>>(new Set());
  const [isProcessingMissingActivities, setIsProcessingMissingActivities] = useState(false);

  useEffect(() => {
    // Only process search history when the history tab is active
    if (selectedTab !== "history") {
      return;
    }

    // Set existing activities immediately for faster UI response
    if (
      searchHistoryActivitiesData &&
      Array.isArray(searchHistoryActivitiesData.activities) &&
      searchHistoryActivitiesData.activities.length > 0
    ) {
      setSearchHistoryActivities(searchHistoryActivitiesData.activities);
    }

    // Defer heavy processing to avoid blocking navigation - increased from 100ms to 1000ms
    const deferredProcessing = setTimeout(() => {
      // Only process if user hasn't navigated away and page is still visible
      if (document.visibilityState !== "visible") {
        return;
      }
      const fetchActivities = async () => {
        if (
          !searchHistoryActivitiesData ||
          isProcessingMissingActivities ||
          !Array.isArray(searchHistoryActivitiesData.activities)
        ) {
          return;
        }

        const missingPlaceIds = searchHistoryActivitiesData.missingPlaceIds || [];

        // Filter out already processed place IDs
        const newMissingPlaceIds = missingPlaceIds.filter((placeId: string) => !processedPlaceIds.has(placeId));

        if (newMissingPlaceIds.length === 0) {
          return;
        }

        setIsProcessingMissingActivities(true);

        try {
          // Process missing activities in batches to avoid overwhelming the API
          const batchSize = 3;
          const batches = [];
          for (let i = 0; i < newMissingPlaceIds.length; i += batchSize) {
            batches.push(newMissingPlaceIds.slice(i, i + batchSize));
          }

          for (const batch of batches) {
            // Process batch in parallel but limit concurrency
            const batchPromises = batch.map(async (placeId: string) => {
              try {
                // Mark as processed immediately to prevent duplicate requests
                setProcessedPlaceIds((prev) => new Set([...prev, placeId]));

                const placeDetails = await placeDetailsQuery(placeId);
                if (placeDetails) {
                  return await insertActivityMutation.mutateAsync(placeDetails);
                }
                return null;
              } catch (error) {
                console.error(`Error processing place ID ${placeId}:`, error);
                return null;
              }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            const newActivities = batchResults
              .filter(
                (result): result is PromiseFulfilledResult<any> =>
                  result.status === "fulfilled" && result.value !== null
              )
              .map((result) => result.value);

            // Update activities with new batch results
            if (newActivities.length > 0) {
              setSearchHistoryActivities((current: IActivity[] | undefined) => {
                const currentArray = Array.isArray(current) ? current : [];
                const existingPlaceIds = new Set(currentArray.map((a: IActivity) => a.place_id));
                const uniqueNewActivities = newActivities.filter((a: IActivity) => !existingPlaceIds.has(a.place_id));
                return [...currentArray, ...uniqueNewActivities];
              });
            }

            // Add small delay between batches to prevent API rate limiting
            if (batches.indexOf(batch) < batches.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
        } catch (error) {
          console.error("Error processing missing activities:", error);
        } finally {
          setIsProcessingMissingActivities(false);
        }
      };

      fetchActivities();
    }, 1000); // Defer by 1000ms to avoid blocking navigation

    return () => clearTimeout(deferredProcessing);
  }, [
    selectedTab, // Add selectedTab to trigger processing when tab changes
    searchHistoryActivitiesData?.activities,
    searchHistoryActivitiesData?.missingPlaceIds,
    // Remove the problematic dependencies that cause infinite loops:
    // - isProcessingMissingActivities (causes loop with setIsProcessingMissingActivities)
    // - insertActivityMutation (not stable)
    // - processedPlaceIds (updated inside effect)
    // - setSearchHistoryActivities (Zustand setter not stable)
  ]);

  // **** HANDLERS ****
  const handleActivitySelect = (activity: IActivity) => {
    setSelectedActivity(activity);
    setIsSidebarRightOpen(true);
  };

  const handleTabChange = (tab: "area-search" | "history") => {
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
            defaultValue="area-search"
            value={selectedTab}
            onValueChange={(value) => handleTabChange(value as "area-search" | "history")}
            className="flex flex-col h-full"
          >
            <div className="flex flex-row justify-center">
              <TabsList className="border">
                <TabsTrigger value="area-search">Map Search</TabsTrigger>
                <TabsTrigger value="history">Search History</TabsTrigger>
              </TabsList>
            </div>
            <Separator className="mt-4 mb-2" />
            <TabsContent value="area-search" className="flex-grow overflow-hidden">
              <div className="flex flex-col h-full gap-4">
                <div className="flex flex-row justify-between w-full px-4 pb-4">
                  <div className="flex flex-row gap-2 w-full">
                    <ActivityCostFilters />
                    <ActivityTypeFilters />
                    <ActivityOrderFilters
                      activities={areaSearchActivities as IActivityWithLocation[]}
                      setActivities={() => {}} // No-op since we don't need to set activities for area search
                    />
                  </div>
                </div>

                <ScrollArea className="h-full px-4">
                  {areaSearchActivities && Array.isArray(areaSearchActivities) && areaSearchActivities.length > 0 ? (
                    <ActivityCards
                      activities={
                        (selectedFilters.length > 0 || selectedCostFilters.length > 0
                          ? filterActivities(
                              filterActivities(
                                areaSearchActivities as IActivityWithLocation[],
                                selectedFilters,
                                activityTypeFilters
                              ),
                              selectedCostFilters,
                              activityCostFilters
                            )
                          : areaSearchActivities) as IActivityWithLocation[]
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
                  {/* Processing indicator */}
                  {isProcessingMissingActivities && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="text-sm text-blue-700">Loading additional activities...</span>
                      </div>
                    </div>
                  )}

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
                  ) : isSearchHistoryLoading || isProcessingMissingActivities ? (
                    <ActivitySkeletonCards />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No search history available</p>
                    </div>
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
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading map...</span>
                </div>
              </div>
            }
          >
            <GoogleMapComponent />
          </Suspense>
        ) : null}
        {popupInfo && (
          <InfoWindow
            position={{ lat: popupInfo.latitude, lng: popupInfo.longitude }}
            onCloseClick={() => setPopupInfo(null)}
          >
            <div className="px-2 py-1 text-sm font-medium">{popupInfo.name}</div>
          </InfoWindow>
        )}
      </div>
      <ViewToggleButton isMapView={isMapView} onToggle={toggleView} />
    </div>
  );
}
