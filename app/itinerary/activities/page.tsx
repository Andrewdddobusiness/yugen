"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import BuilderLayout from "@/components/layouts/builderLayout";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ActivityCards from "@/components/cards/activityCards";
import MapBox from "@/components/map/mapbox";

import { MdMoneyOff, MdAttachMoney } from "react-icons/md";
import { Baby, Drama, Landmark, MountainSnow, Palette } from "lucide-react";

import { fetchActivityDetails } from "@/actions/supabase/actions";

import { createClient } from "@/utils/supabase/client";
import WaypointSidebar from "@/components/sidebar/activitySideBar";

export default function Activities() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const id = searchParams.get("i");

  const [user, setUser] = useState<any>();
  const [tab, setTab] = useState("explore");
  const [loading, setLoading] = useState<any>(false);
  const [activityData, setActivityData] = useState<any>([]);
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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { auth } = supabase;
        const { data: user } = await auth.getUser();
        console.log(user.user);
        if (!user.user) {
          throw new Error("User not authenticated");
        }
        setUser(user.user);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [supabase]);

  useEffect(() => {
    const fetchItineraryData = async () => {
      if (user) {
        console.log("id: ", id);
        setLoading(true);
        try {
          const { data, error } = await fetchActivityDetails(id);
          console.log("activity data: ", data![0].cities.activities);
          if (error) {
            console.error("Error fetching activities data:", error);
            setActivityData([]);
          } else {
            setActivityData(data[0].cities.activities);
          }
        } catch (error) {
          console.error("Error fetching activities data:", error);
          setActivityData([]);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchItineraryData();
  }, [user, id]);

  const filteredActivities = activityData.filter((activity: any) => {
    const matchesSearchQuery = activity.activity_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFreeFilter = freeFilter ? activity.activity_price === 0 : true;
    const matchesPaidFilter = paidFilter ? activity.activity_price > 0 : true;

    const activityTypes = JSON.parse(activity.activity_type);
    const matchesHistoricalFilter = historicalFilter
      ? activityTypes.includes("historical")
      : true;
    const matchesOutdoorFilter = outdoorFilter
      ? activityTypes.includes("outdoors")
      : true;
    const matchesArtFilter = artFilter ? activityTypes.includes("art") : true;
    const matchesEntertainmentFilter = entertainmentFilter
      ? activityTypes.includes("entertainment")
      : true;

    return (
      matchesSearchQuery &&
      matchesFreeFilter &&
      matchesPaidFilter &&
      matchesHistoricalFilter &&
      matchesOutdoorFilter &&
      matchesArtFilter &&
      matchesEntertainmentFilter
    );
  });

  const handleActivitySelect = (activity: any) => {
    setSelectedActivity(activity);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSelectedActivity(null);
    setIsSidebarOpen(false);
  };

  return (
    <BuilderLayout
      title="Activities"
      activePage="activities"
      itineraryNumber={1}
    >
      <div className="flex h-screen">
        <div className="flex flex-col flex-grow overflow-y-auto">
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value)}
            className="pt-4 pl-4"
          >
            <div className="flex items-center">
              <TabsList>
                <TabsTrigger value="explore">Explore</TabsTrigger>
                <TabsTrigger value="map">Map</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
          <div className="m-4 w-full min-h-[870px] rounded-lg">
            {tab === "explore" ? (
              <>
                <div>
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
                          <MdMoneyOff size={16} className="pr-1" />
                          <div>Free</div>
                        </Toggle>
                        <Toggle
                          variant="outline"
                          className={`h-8 rounded-full ml-2 ${
                            paidFilter ? "bg-gray-200" : ""
                          }`}
                          onClick={() => setPaidFilter(!paidFilter)}
                        >
                          <MdAttachMoney size={16} className="pr-1" />
                          <div>Paid</div>
                        </Toggle>
                      </div>
                      <div className="mr-8">
                        <Toggle
                          variant="outline"
                          className="h-8 rounded-full"
                          onClick={() => setHistoricalFilter(!historicalFilter)}
                        >
                          <Landmark size={16} className="pr-1" />
                          <div>Historical</div>
                        </Toggle>
                        <Toggle
                          variant="outline"
                          className="h-8 rounded-full ml-2"
                          onClick={() => setOutdoorFilter(!outdoorFilter)}
                        >
                          <MountainSnow size={16} className="pr-1" />
                          <div>Outdoors</div>
                        </Toggle>
                        <Toggle
                          variant="outline"
                          className="h-8 rounded-full ml-2"
                          onClick={() => setArtFilter(!artFilter)}
                        >
                          <Palette size={16} className="pr-1" />
                          <div> Art & Culture</div>
                        </Toggle>
                        <Toggle
                          variant="outline"
                          className="h-8 rounded-full ml-2"
                          onClick={() =>
                            setEntertainmentFilter(!entertainmentFilter)
                          }
                        >
                          <Drama size={16} className="pr-1" />
                          <div> Entertainment</div>
                        </Toggle>
                      </div>
                    </div>
                    <Separator className="my-4" />
                  </div>
                  <div className="mb-4 mx-4">
                    {filteredActivities && (
                      <ActivityCards
                        activities={filteredActivities}
                        onSelectActivity={handleActivitySelect}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <MapBox
                selectedActivity={selectedActivity}
                setSelectedActivity={setSelectedActivity}
              />
            )}
          </div>
        </div>
        {isSidebarOpen && (
          <div className="h-full flex-shrink-0">
            <WaypointSidebar
              onClose={handleCloseSidebar}
              activity={selectedActivity}
            />
          </div>
        )}
      </div>
    </BuilderLayout>
  );
}
