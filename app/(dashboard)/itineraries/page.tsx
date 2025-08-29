"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import ItineraryCards from "@/components/card/itinerary/ItineraryCards";

import { fetchUserItineraries } from "@/actions/supabase/actions";
import { createClient } from "@/utils/supabase/client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import ItinerarySkeletonCard from "@/components/card/itinerary/ItinerarySkeletonCard";

export default function Itineraries() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>();
  const [isUserLoading, setIsUserLoading] = useState(true);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      setIsUserLoading(true);
      try {
        const { auth } = supabase;
        const { data: user } = await auth.getUser();

        if (!user.user) {
          throw new Error("User not authenticated");
        }
        setUser(user.user);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsUserLoading(false);
      }
    };

    fetchUserData();
  }, [supabase]);

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

  // Update the loading logic
  const isLoading = !user ? true : isItinerariesLoading;

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
          {isLoading && isUserLoading ? (
            <ItinerarySkeletonCard />
          ) : (
            <ItineraryCards itineraries={itineraryData || []} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}
