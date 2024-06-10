"use client";
import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import DashboardLayout from "@/components/layouts/dashboardLayout";
import { DatePickerWithRange } from "@/components/date/dateRangePicker";
import { ComboBox } from "@/components/comboBox/comboBox";

import { Button } from "@/components/ui/button";

import { Plus, Minus, Loader2 } from "lucide-react";

import { itinerarySchema } from "@/schemas/createItinerarySchema";
import { createClient } from "@/utils/supabase/client";
import { fetchTableData, insertTableData } from "@/actions/supabase/actions";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewTripCreator() {
  const supabase = createClient();

  const [adultsCount, setAdultsCount] = useState(1);
  const [kidsCount, setKidsCount] = useState(0);
  const [cityList, setCityList] = useState<any>([]);
  const [destinationCity, setDestinationCity] = useState();
  const [dateRange, setDateRange] = useState<any>();

  const [loading, setLoading] = useState<any>(false);
  const [user, setUser] = useState<any>(null);

  const form = useForm<z.infer<typeof itinerarySchema>>({
    resolver: zodResolver(itinerarySchema),
  });

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

  const handleCreateItinerary = async () => {
    setLoading(true);
    const itineraryData = {
      user_id: user.id,
      adults: adultsCount,
      kids: kidsCount,
    };

    let itineraryId;
    let destinationCityId;

    try {
      const response = await insertTableData("itineraries", itineraryData);
      console.log(response);
      if (response.data) {
        itineraryId = response.data[0].itinerary_id;
      }

      console.log(response);
    } catch (error) {
      console.error(error);
    }

    const selectedCity = cityList.find(
      (city: { city_name: any }) => city.city_name === destinationCity
    );
    console.log(destinationCity);
    console.log(selectedCity);

    if (selectedCity) {
      destinationCityId = selectedCity.city_id;
    } else {
      console.error("Assigning city id failed.");
    }

    const itineraryDestinationsData = {
      itinerary_id: itineraryId,
      destination_city_id: destinationCityId,
      from_date: dateRange?.from,
      to_date: dateRange?.to,
    };

    try {
      const response = await insertTableData(
        "itinerary_destinations",
        itineraryDestinationsData
      );
      console.log(response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (newDate: any) => {
    setDateRange(newDate);
  };

  const handleSelectionChange = (city: any) => {
    setDestinationCity(city);
  };

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
    const fetchCityData = async () => {
      try {
        const response = await fetchTableData("cities", "city_id, city_name");

        if (response.data) {
          setCityList(response?.data);
        } else {
          setCityList([]);
        }
      } catch (error) {
        console.error("Error fetching city data:", error);
        setCityList([]);
      }
    };

    fetchCityData();
  }, []);

  return (
    <div>
      <DashboardLayout title="Itineraries" activePage="itineraries">
        <div className="flex flex-col items-center m-4  h-screen ">
          <div className="flex flex-col items-left w-1/2">
            <>
              <div className="text-5xl font-semibold mt-8">
                Plan your next holiday!
              </div>
              <div className="text-md text-zinc-500 mt-2">
                Let&apos;s get some details...
              </div>
              <div className="text-xl font-semibold mt-8">
                Where do you want to go?
              </div>
              <div className="flex flex-row w-full gap-4 text-5xl mt-2">
                {cityList ? (
                  <ComboBox
                    selection={cityList.map(
                      (city: { city_name: any }) => city.city_name
                    )}
                    onSelectionChange={handleSelectionChange}
                  />
                ) : (
                  <Skeleton className="w-full h-[40px] rounded-md" />
                )}
              </div>
              <div className="flex flex-row text-5xl mt-2">
                <DatePickerWithRange onDateChange={handleDateChange} />
              </div>
              <div className="flex flex-row text-5xl mt-2">
                <Button
                  className="rounded-full text-sm"
                  size={"sm"}
                  variant={"secondary"}
                >
                  <Plus size={12} className="mr-1" /> Add Destination
                </Button>
              </div>

              <div className="text-xl font-semibold mt-8">
                How many people are going?
              </div>
              <div className="flex flex-row justify-between items-center text-xl mt-2 border rounded-md p-1">
                <div className="flex justify-between items-center gap-2 text-md p-2">
                  <div className="flex justify-center items-center rounded-md border w-10 h-10 ">
                    {adultsCount}
                  </div>
                  <div>Adults</div>
                </div>
                <div className="flex justify-between gap-2 p-2">
                  <Button
                    variant={"outline"}
                    size={"sm"}
                    onClick={() => handleDecreaseCount("adults")}
                  >
                    <Minus size={12} />
                  </Button>
                  <Button
                    variant={"outline"}
                    size={"sm"}
                    onClick={() => handleIncreaseCount("adults")}
                  >
                    <Plus size={12} />
                  </Button>
                </div>
              </div>
              <div className="flex flex-row justify-between items-center text-xl mt-2 border rounded-md p-1">
                <div className="flex justify-between items-center gap-2 text-md p-2">
                  <div className="flex justify-center items-center rounded-md border w-10 h-10">
                    {kidsCount}
                  </div>
                  <div>Kids</div>
                </div>
                <div className="flex justify-between gap-2 p-2">
                  <Button
                    variant={"outline"}
                    size={"sm"}
                    onClick={() => handleDecreaseCount("kids")}
                  >
                    <Minus size={12} />
                  </Button>
                  <Button
                    variant={"outline"}
                    size={"sm"}
                    onClick={() => handleIncreaseCount("kids")}
                  >
                    <Plus size={12} />
                  </Button>
                </div>
              </div>
            </>

            {/* BUTTONS NAVIGATION */}
            <div className="flex flex-row justify-end mt-8">
              {/* <Link href={`/itinerary/${1}/overview`}> */}
              {loading ? (
                <Button
                  disabled
                  size="sm"
                  variant={"default"}
                  className="rounded-full"
                >
                  <Loader2 className="mr-2 h-4 w-4 animate-spin " />
                  Please wait
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={"default"}
                  onClick={handleCreateItinerary}
                  className={`w-20 rounded-full`}
                >
                  Confirm
                </Button>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </div>
  );
}
