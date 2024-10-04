"use client";
import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Star, Globe, Clock } from "lucide-react";

import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";
import { Separator } from "../ui/separator";
import Link from "next/link";
import { checkEntryExists, insertTableData } from "@/actions/supabase/actions";

const ActivitySidebar = ({ onClose, activity, destinationId }: any) => {
  const searchParams = useSearchParams();
  const itineraryId = searchParams.get("i");

  const [loading, setLoading] = useState<any>(false);
  const [isActivityAdded, setIsActivityAdded] = useState<boolean>(false);

  useEffect(() => {
    const checkIfActivityAdded = async () => {
      try {
        setLoading(true);
        const { exists, error } = await checkEntryExists(
          "itinerary_activities",
          {
            itineraryId,
            activityId: activity.activity_id,
          }
        );
        if (exists) setIsActivityAdded(true);

        setLoading(false);
      } catch (error) {
        console.error("Error checking activity exists: ", error);
        setLoading(false);
      }
    };

    if (activity && itineraryId) {
      // Reset the state before checking for the new activity
      setIsActivityAdded(false);

      checkIfActivityAdded();
    }
  }, [activity, itineraryId]);

  const handleActivity = async () => {
    setLoading(true);

    const itineraryActivityData = {
      activity_id: activity.activity_id,
      itinerary_id: itineraryId,
      // destination_id: destinationId, // later implementation for multiple destinations in one itinerary
    };

    try {
      const response = await insertTableData(
        "itinerary_activities",
        itineraryActivityData
      );
      console.log(response);

      // Re-check if the activity is added after insertion
      const { exists, error } = await checkEntryExists("itinerary_activities", {
        itineraryId,
        activityId: activity.activity_id,
      });

      if (exists) {
        setIsActivityAdded(true);
      } else if (error) {
        console.error("Error re-checking activity exists: ", error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-80 h-full px-4 pt-4 ml-4 border">
      <div className={"flex justify-end"}>
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          className="rounded-full"
        >
          <X size={16} className="rounded-full hover:bg-zinc-100 " />
        </Button>
      </div>

      <div className="mt-4">
        <Carousel>
          <CarouselContent>
            {activity.image_url.map((image: string, index: number) => (
              <CarouselItem key={index}>
                <Image
                  src={image}
                  alt={`Image ${index}`}
                  width={300}
                  height={200}
                  className="h-60 w-full rounded-md object-cover"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
      <div className="mt-4">
        <div className="flex flex-row space-x-1 items-center mt-2">
          <Star size={14} />
          <p className="text-md">{activity.rating}</p>
        </div>
        <div className="font-semibold text-xl mt-2">
          {capitalizeFirstLetterOfEachWord(activity.activity_name)}
        </div>
        <p className="text-gray-500 text-md mt-1">{activity.address}</p>

        <p className="mt-2 text-md">{activity.description}</p>
      </div>
      <Separator className="mt-4" />
      <div className="flex flex-col mt-4 text-md">
        <Link
          href={activity.website_url}
          className="flex flex-row items-center hover:bg-gray-50"
        >
          <div className="p-4">
            <Globe size={20} />
          </div>
          <div className="hover:underline">Website</div>
        </Link>

        <div className="flex flex-row items-center hover:bg-gray-50">
          <div className="p-4">
            <Clock size={20} />
          </div>
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>Open Times</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  <div>Saturday</div>
                  <div>10 am–1 am</div>
                  <div>Sunday</div>
                  <div>10 am–12 am</div>
                  <div>Monday</div>
                  <div>10 am–12 am</div>
                  <div>Tuesday</div>
                  <div>10 am–12 am</div>
                  <div>Wednesday</div>
                  <div>10 am–12 am</div>
                  <div>Thursday</div>
                  <div>10 am–12 am</div>
                  <div>Friday</div>
                  <div>10 am–1 am</div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      <div className="flex flex-col w-full">
        {/* <Link href={`/itinerary/${1}/overview`}> */}
        {loading ? (
          <Button disabled className="mt-4">
            <Loader2 className="mr-2 h-4 w-4 animate-spin " />
            Please wait
          </Button>
        ) : isActivityAdded ? (
          <Button className="mt-4" disabled>
            Added
          </Button>
        ) : (
          <Button className="mt-4" onClick={handleActivity}>
            Add to Itinerary
          </Button>
        )}
      </div>
    </div>
  );
};

export default ActivitySidebar;
