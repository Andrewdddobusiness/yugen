"use client";
import React from "react";
import Image from "next/image";
import ItineraryCards from "@/components/card/itinerary/ItineraryCards";

import { fetchUserItineraries } from "@/actions/supabase/actions";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import ItinerarySkeletonCard from "@/components/card/itinerary/ItinerarySkeletonCard";
import { useUserStore } from "@/store/userStore";

export default function Itineraries() {
  const queryClient = useQueryClient();
  const { user, isUserLoading } = useUserStore();

  // Fetch itineraries with proper typing
  const { data: itineraryData, isLoading: isItinerariesLoading } = useQuery({
    queryKey: ["itineraries", user?.id],
    queryFn: async () => {
      const response = await fetchUserItineraries(user?.id || "");
      return response.data || [];
    },
    enabled: !!user?.id,
  });

  const handleDelete = async () => {
    await queryClient.invalidateQueries({ queryKey: ["itineraries"] });
  };

  const isLoading = isUserLoading || isItinerariesLoading;

  return (
    <div className="flex flex-col min-h-screen w-full p-4 pb-20">
      {/* Hero Image Section */}
      <div className="h-40 w-full rounded-lg overflow-hidden relative">
        <Image
          src="/map2.jpg"
          alt="Image"
          width={1920}
          height={1080}
          className="w-full h-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col">
        <div className="py-8">
          <h1 className="text-xl font-bold text-gray-800">My Itineraries</h1>
        </div>

        <div className="flex-1">
          {isLoading ? (
            <ItinerarySkeletonCard />
          ) : (
            <ItineraryCards itineraries={itineraryData || []} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}
