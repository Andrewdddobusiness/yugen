"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import ItineraryCards from "@/components/cards/itineraryCards";
import DashboardLayout from "@/components/layouts/dashboardLayout";

import { fetchTableData } from "@/actions/supabase/actions";

import { createClient } from "@/utils/supabase/client";

import { IItineraryCard } from "@/components/cards/itineraryCard";

export default function Dashboard() {
  const supabase = createClient();

  const [user, setUser] = useState<any>();
  const [loadingItinerary, setLoadingItinerary] = useState<boolean>(false);
  const [itineraryData, setItineraryData] = useState<IItineraryCard[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoadingItinerary(true);
        const { auth } = supabase;
        const { data: user } = await auth.getUser();

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
          const response = (await fetchTableData(
            "itinerary_destination",
            "itinerary_id, destination_id, city, country, from_date, to_date"
          )) as { data: any[]; error: any }; // Type assertion with correct structure

          const { data, error } = response;

          if (error) {
            console.error("Error fetching itinerary data:", error);
            setItineraryData([]);
          } else {
            // Check if data is an array and has the expected structure
            if (Array.isArray(data)) {
              // Map the data to match the IItineraryCard interface
              const mappedData: IItineraryCard[] = data.map((item) => ({
                destination_id: item.destination_id,
                itinerary_id: item.itinerary_id,
                city: item.city,
                country: item.country,
                from_date: new Date(item.from_date), // Convert to Date object
                to_date: new Date(item.to_date), // Convert to Date object
              }));

              // Set the mapped itinerary data
              setItineraryData(mappedData);
            } else {
              console.error("Unexpected data structure:", data);
              setItineraryData([]);
            }
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
