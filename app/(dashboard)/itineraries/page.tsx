"use client";
import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import ItineraryCards from "@/components/cards/itineraryCards";

import { fetchUserItineraries } from "@/actions/supabase/actions";
import { createClient } from "@/utils/supabase/client";
import { IItineraryCard } from "@/components/cards/itineraryCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ItinerarySkeletonCard from "@/components/cards/itinerarySkeletonCard";

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
        {isLoading && isUserLoading ? (
          <ItinerarySkeletonCard />
        ) : (
          <ItineraryCards itineraries={itineraryData || []} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
