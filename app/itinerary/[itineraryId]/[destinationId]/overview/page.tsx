"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import { Separator } from "@/components/ui/separator";

import BuilderLayout from "@/components/layout/BuilderLayout";
import PopUpGetStarted from "@/components/dialog/onboarding/GetStartedDialog";

import { createClient } from "@/utils/supabase/client";
import { capitalizeFirstLetter } from "@/utils/formatting/capitalise";

import { fetchCityDetails } from "@/actions/supabase/actions";
import { Skeleton } from "@/components/ui/skeleton";

import { Suspense } from "react";

function OverviewContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const id = searchParams.get("i");

  const [user, setUser] = useState<any>();
  const [loading, setLoading] = useState<any>(false);
  const [cityData, setCityData] = useState<any>();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
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
    const fetchCityData = async () => {
      if (user) {
        setLoading(true);
        try {
          const { data, error } = await fetchCityDetails(id);

          if (error) {
            console.error("Error fetching itinerary data:", error);
          } else {
            setCityData(data[0]);
          }
        } catch (error) {
          console.error("Error fetching itinerary data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCityData();
  }, [user, id]);

  return (
    <>
      <div className="p-4 h-1/4 relative">
        {cityData ? (
          <Image
            src={
              process.env.NEXT_PUBLIC_SUPABASE_URL +
              `/storage/v1/object/public/cities/co1_c${cityData.destination_city_id}/1.jpg`
            }
            alt="Image"
            width="1920"
            height="1080"
            className="h-[200px] w-full object-cover dark:brightness-[0.2] dark:grayscale rounded-lg"
          />
        ) : (
          <Skeleton className="w-full h-[250px] rounded-lg" />
        )}

        {cityData && (
          <>
            <div className="absolute bottom-1 left-12 transform -translate-y-1/2 text-white text-7xl font-bold">
              {capitalizeFirstLetter(cityData.cities.city_name)}
            </div>
            <div className="absolute bottom-8 left-[51px] transform -translate-y-1/2 text-white text-lg font-bold">
              {capitalizeFirstLetter(cityData.cities.countries.country_name)}
            </div>
          </>
        )}
      </div>
      <div className="flex flex-row">
        <div className="px-12 py-4 w-3/4">
          <div>
            <div className="col-span-1 text-2xl font-semibold text-black flex justify-left">About</div>
            {cityData ? (
              <>
                <div className="col-span-1 text-sm text-black flex justify-left mt-2">
                  {cityData.cities.city_description}
                </div>
              </>
            ) : (
              <Skeleton className="w-full h-[100px] rounded-lg mt-2" />
            )}
          </div>
          <div className="mt-8">
            <div className="col-span-1 text-2xl font-semibold text-black flex justify-left">Emergency Numbers</div>
            <div className="col-span-1 text-sm text-black mt-2">
              {cityData ? (
                <ul className="list-disc list-inside">
                  <li>Fire: {cityData.cities.emergency_fire}</li>
                  <li>Police: {cityData.cities.emergency_police}</li>
                  <li>Ambulance: {cityData.cities.emergency_ambulance}</li>
                </ul>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  <Skeleton className="w-full h-[10px] rounded-lg" />
                  <Skeleton className="w-full h-[10px] rounded-lg" />
                  <Skeleton className="w-full h-[10px] rounded-lg" />
                </div>
              )}
            </div>
          </div>
          <div className="mt-8">
            <div className="col-span-1 text-2xl font-semibold text-black flex justify-left">Power Information</div>
            <div className="col-span-1 text-sm text-black mt-2">
              {cityData ? (
                <ul className="list-disc list-inside">
                  <li>Plugs: {cityData.cities.plugs}</li>
                  <li>Voltage: {cityData.cities.voltage}</li>
                  <li>Standard: {cityData.cities.power_standard}</li>
                  <li>Frequency: {cityData.cities.frequency} Hz</li>
                </ul>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  <Skeleton className="w-full h-[10px] rounded-lg" />
                  <Skeleton className="w-full h-[10px] rounded-lg" />
                  <Skeleton className="w-full h-[10px] rounded-lg" />
                  <Skeleton className="w-full h-[10px] rounded-lg" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex h-screen px-4">
          <Separator orientation="vertical" />
        </div>
        <div className="px-4 w-1/4 mt-4">
          <div className="col-span-1 text-2xl font-semibold text-black flex justify-left">Insert Content Here</div>
          <div className="col-span-1 text-sm text-black flex justify-left mt-2">insert content here</div>
        </div>
      </div>
      <PopUpGetStarted />
    </>
  );
}

export default function Overview() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-screen" />}>
      <OverviewContent />
    </Suspense>
  );
}
