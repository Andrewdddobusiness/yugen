"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import ItineraryCards from "@/components/cards/itineraryCards";
import DashboardLayout from "@/components/layouts/dashboardLayout";

import { fetchItineraryWithCities } from "@/actions/supabase/actions";

import { createClient } from "@/utils/supabase/client";

export default function Dashboard() {
  const supabase = createClient();

  const [user, setUser] = useState<any>();
  const [loadingItinerary, setLoadingItinerary] = useState<any>(false);
  const [itineraryData, setItineraryData] = useState<any[]>([]);

  // const handleCreateItinerary = async () => {
  //   setLoading(true);
  //   const itineraryData = {
  //     user_id: user.id,
  //     adults: adultsCount,
  //     kids: kidsCount,
  //   };

  //   let itineraryId;
  //   let destinationCityId;

  //   try {
  //     const response = await fetchTableData("itineraries", itineraryData);
  //     console.log(response);
  //     if (response.data) {
  //       itineraryId = response.data[0].itinerary_id;
  //     }

  //     console.log(response);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoadingItinerary(true);
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
        setLoadingItinerary(true);
        try {
          const { data, error } = await fetchItineraryWithCities();
          console.log("refined data: ", data);
          if (error) {
            console.error("Error fetching itinerary data:", error);
            setItineraryData([]);
          } else {
            setItineraryData(data);
          }
        } catch (error) {
          console.error("Error fetching itinerary data:", error);
          setItineraryData([]);
        } finally {
          setLoadingItinerary(false);
        }
      }
    };

    fetchItineraryData();
  }, [user]);

  return (
    <DashboardLayout title="Dashboard" activePage="home">
      <div className="m-4 border rounded-lg h-40">
        <Image
          src="/map2.jpg"
          alt="Image"
          width="1920"
          height="1080"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale rounded-lg"
        />
        <div className="pt-8">
          <div className="text-lg font-bold">My Itineraries</div>
        </div>
        <div className="flex flex-row py-4">
          <ItineraryCards
            itineraries={itineraryData}
            loading={loadingItinerary}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
