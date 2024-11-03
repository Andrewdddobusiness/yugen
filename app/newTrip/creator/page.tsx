"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import DashboardLayout from "@/components/layouts/dashboardLayout";
import { DatePickerWithRangePopover } from "@/components/date/dateRangePickerPopover";
import { ComboBox } from "@/components/comboBox/comboBox";

import { Button } from "@/components/ui/button";

import { Plus, Minus, Loader2 } from "lucide-react";

import { itinerarySchema } from "@/schemas/createItinerarySchema";
import { createClient } from "@/utils/supabase/client";
import { insertTableData } from "@/actions/supabase/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { whitelistedLocations } from "@/lib/googleMaps/whitelistedLocations";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";

export default function NewTripCreator() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  const [adultsCount, setAdultsCount] = useState(1);
  const [kidsCount, setKidsCount] = useState(0);

  const [destinationLocation, setDestinationLocation] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<any>();

  const [destinationError, setDestinationError] = useState(false);
  const [dateRangeError, setDateRangeError] = useState(false);

  const [loading, setLoading] = useState<any>(false);

  const form = useForm<z.infer<typeof itinerarySchema>>({
    resolver: zodResolver(itinerarySchema),
  });

  const handleDestinationChange = (location: any) => {
    setDestinationLocation(location);
    setDestinationError(false); // Reset error on change
  };

  const handleDateChange = (newDate: any) => {
    setDateRange(newDate);
    setDateRangeError(false); // Reset error on change
  };

  const handleCreateItinerary = async () => {
    setLoading(true);

    if (!destinationLocation) {
      setDestinationError(true);
    }
    if (!dateRange) {
      setDateRangeError(true);
    }

    if (!destinationLocation || !dateRange) {
      setLoading(false);
      return;
    }

    const itineraryData = {
      user_id: user.id,
      adults: adultsCount,
      kids: kidsCount,
    };

    let itineraryId;

    try {
      const response = await insertTableData("itinerary", itineraryData);
      if (response.data) {
        itineraryId = response.data[0].itinerary_id;
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const selectedLocation = destinationLocation.split(", ");
    const city = selectedLocation[0];
    const country = selectedLocation[1];

    const itineraryDestinationsData = {
      itinerary_id: itineraryId,
      city: city,
      country: country,
      order_number: 1,
      from_date: dateRange?.from,
      to_date: dateRange?.to,
    };

    try {
      const response = await insertTableData("itinerary_destination", itineraryDestinationsData);
      if (response.success) {
        router.push("/itineraries");
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDecreaseCount = (type: string) => {
    if (type === "adults" && adultsCount > 1) {
      setAdultsCount((prevCount) => prevCount - 1);
    } else if (type === "kids" && kidsCount > 0) {
      setKidsCount((prevCount) => prevCount - 1);
    }
  };

  const handleIncreaseCount = (type: string) => {
    if (type === "adults" && adultsCount < 10) {
      setAdultsCount((prevCount) => prevCount + 1);
    } else if (type === "kids" && kidsCount < 10) {
      setKidsCount((prevCount) => prevCount + 1);
    }
  };

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

  const locationList = whitelistedLocations.map(
    (location) =>
      `${capitalizeFirstLetterOfEachWord(location.city)}, ${capitalizeFirstLetterOfEachWord(location.country)}`
  );

  return (
    <div className="grid grid-cols-2 h-screen">
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-left w-3/4 mt-16">
          <>
            <div className="text-4xl font-semibold">Plan your next holiday!</div>
            <div className="text-md text-zinc-500 mt-2">Let&apos;s get some details...</div>
            <div className="text-xl font-semibold mt-8">Where do you want to go?</div>
            <div className="flex flex-row w-full gap-4 text-5xl mt-2">
              {locationList ? (
                <ComboBox selection={locationList} onSelectionChange={handleDestinationChange} />
              ) : (
                <Skeleton className="w-full h-[40px] rounded-md" />
              )}
            </div>
            {destinationError && <div className="text-sm text-red-500 mt-2">Please select a destination.</div>}
            <div className="flex flex-row text-5xl mt-2">
              <DatePickerWithRangePopover onDateChange={handleDateChange} fetchDateRangeProp={false} />
            </div>
            {dateRangeError && <div className="text-sm text-red-500 mt-2">Please select a date range.</div>}
            <div className="text-xl font-semibold mt-8">How many people are going?</div>
            <div className="flex flex-row justify-between items-center text-xl mt-2 border rounded-md p-1">
              <div className="flex justify-between items-center gap-2 text-md p-2">
                <div className="flex justify-center items-center rounded-md border w-10 h-10 ">{adultsCount}</div>
                <div>Adults</div>
              </div>
              <div className="flex justify-between gap-2 p-2">
                <Button variant={"outline"} size={"sm"} onClick={() => handleDecreaseCount("adults")}>
                  <Minus size={12} />
                </Button>
                <Button variant={"outline"} size={"sm"} onClick={() => handleIncreaseCount("adults")}>
                  <Plus size={12} />
                </Button>
              </div>
            </div>
            <div className="flex flex-row justify-between items-center text-xl mt-2 border rounded-md p-1">
              <div className="flex justify-between items-center gap-2 text-md p-2">
                <div className="flex justify-center items-center rounded-md border w-10 h-10">{kidsCount}</div>
                <div>Kids</div>
              </div>
              <div className="flex justify-between gap-2 p-2">
                <Button variant={"outline"} size={"sm"} onClick={() => handleDecreaseCount("kids")}>
                  <Minus size={12} />
                </Button>
                <Button variant={"outline"} size={"sm"} onClick={() => handleIncreaseCount("kids")}>
                  <Plus size={12} />
                </Button>
              </div>
            </div>
          </>

          {/* BUTTONS NAVIGATION */}
          <div className="flex flex-row justify-end mt-8">
            {loading ? (
              <Button disabled size="sm" variant={"default"} className="rounded-full">
                <Loader2 className="mr-2 h-4 w-4 animate-spin " />
                Please wait
              </Button>
            ) : (
              <Button size="sm" variant={"default"} onClick={handleCreateItinerary} className={`rounded-full`}>
                Create Itinerary
              </Button>
            )}
          </div>
        </div>
      </div>
      <div>
        <Image
          src="/map2.jpg"
          alt="Image"
          width={1920}
          height={1080}
          objectFit="cover"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
