"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import ItineraryCards from "@/components/cards/itineraryCards";
import DashboardLayout from "@/components/layouts/dashboardLayout";

import { fetchTableData, fetchUserItineraries } from "@/actions/supabase/actions";

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
          const { data, error } = await fetchUserItineraries(user.id);

          if (error) {
            console.error("Error fetching itinerary data:", error);
            setItineraryData([]);
          } else {
            setItineraryData(data || []);
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

  const handleDelete = (deletedItineraryId: number) => {
    setItineraryData((current) => current.filter((itinerary) => itinerary.itinerary_id !== deletedItineraryId));
  };

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
          <ItineraryCards itineraries={itineraryData} loading={loadingItinerary} onDelete={handleDelete} />
        </div>
      </div>
    </DashboardLayout>
  );
}
