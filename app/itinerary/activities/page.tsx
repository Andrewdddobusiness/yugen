"use client";
import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import BuilderLayout from "@/components/layouts/builderLayout";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import ActivityCards from "@/components/cards/activityCards";
import MapBox from "@/components/map/mapbox";
import ActivitySidebar from "@/components/sidebar/activitySideBar";

import { MdMoneyOff, MdAttachMoney } from "react-icons/md";
import { Drama, Landmark, MountainSnow, Palette } from "lucide-react";

import { fetchItineraryDestination } from "@/actions/supabase/actions";
import { fetchCityCoordinates } from "@/actions/google/actions";
import { fetchNearbyActivities } from "@/actions/google/actions";
import Loading from "@/components/loading/loading";
import ActivityFilters from "@/components/filters/activityFilters";

export default function Activities() {
  const searchParams = useSearchParams();
  const id = searchParams.get("i");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [freeFilter, setFreeFilter] = useState<boolean>(false);
  const [paidFilter, setPaidFilter] = useState<boolean>(false);
  const [outdoorFilter, setOutdoorFilter] = useState<boolean>(false);
  const [historicalFilter, setHistoricalFilter] = useState<boolean>(false);
  const [artFilter, setArtFilter] = useState<boolean>(false);
  const [entertainmentFilter, setEntertainmentFilter] =
    useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarKey, setSidebarKey] = useState(0);
  const [mapCenterFunction, setMapCenterFunction] = useState<
    ((location: [number, number]) => void) | null
  >(null);
  const [selectedFilter, setSelectedFilter] = useState("");

  const { data: destinationData, isLoading: isDestinationLoading } = useQuery({
    queryKey: ["itineraryDestination", id],
    queryFn: () => fetchItineraryDestination(id as string),
    enabled: !!id,
    staleTime: Infinity, // Data won't become stale
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: cityCoordinates, isLoading: isCoordinatesLoading } = useQuery({
    queryKey: [
      "cityCoordinates",
      destinationData?.data?.cities?.city_name,
      destinationData?.data?.cities?.countries?.country_name,
    ],
    queryFn: () =>
      fetchCityCoordinates(
        destinationData?.data?.cities?.city_name,
        destinationData?.data?.cities?.countries?.country_name
      ),
    enabled:
      !!destinationData?.data?.cities?.city_name &&
      !!destinationData?.data?.cities?.countries?.country_name,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: activitiesData, isLoading: isActivitiesLoading } = useQuery({
    queryKey: [
      "nearbyActivities",
      cityCoordinates?.latitude,
      cityCoordinates?.longitude,
    ],
    queryFn: () =>
      fetchNearbyActivities(
        cityCoordinates!.latitude,
        cityCoordinates!.longitude
      ),
    enabled: !!cityCoordinates,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
      : activitiesData.filter((activity: any) => {
          const types = activity.types || [];
          switch (selectedFilter) {
            case "Food & Drink":
              return types.some((type: string) =>
                ["restaurant", "cafe", "bar"].includes(type)
              );
            case "Historical":
              return (
                types.includes("museum") || types.includes("tourist_attraction")
              );
            case "Shopping":
              return types.includes("shopping_mall") || types.includes("store");
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
      {isCoordinatesLoading || isDestinationLoading || isActivitiesLoading ? (
        <Loading />
      ) : (
        <div className="flex flex-row flex-grow overflow-y-auto h-full relative">
          <div className="flex flex-row w-full transition-all duration-300">
            <div
              className={`m-4 min-h-[870px] rounded-lg flex flex-col transition-all duration-300 ${
                isSidebarOpen ? "w-3/12" : "w-1/2"
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
              <ScrollArea className="flex flex-col h-full mb-4 mx-4">
                {filteredActivities && (
                  <ActivityCards
                    activities={filteredActivities}
                    onSelectActivity={handleActivitySelect}
                    onHover={handleActivityHover}
                  />
                )}
              </ScrollArea>
            </div>
            <div
              className={`border relative transition-all duration-300 ${
                isSidebarOpen ? "w-5/12" : "w-1/2"
              }`}
            >
              <MapBox
                key="mapbox"
                selectedActivity={selectedActivity}
                setSelectedActivity={setSelectedActivity}
                activities={activitiesData}
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
            className={`absolute top-0 right-0 h-full w-4/12 z-50 transition-all duration-300 transform ${
              isSidebarOpen ? "translate-x-0" : "translate-x-full hidden"
            }`}
          >
            {isSidebarOpen && (
              <ActivitySidebar
                key={sidebarKey}
                å
                onClose={handleCloseSidebar}
                activity={selectedActivity}
              />
            )}
          </div>
        </div>
      )}
    </BuilderLayout>
  );
}
