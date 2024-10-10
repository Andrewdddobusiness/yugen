"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { Star, Globe, Clock, Loader2, X, Phone } from "lucide-react";

import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";

import { checkEntryExists, insertTableData } from "@/actions/supabase/actions";
import Rating from "../rating/rating";

import { formatDateTime } from "@/utils/formatting/time";

import CommentsCarousel from "../carousel/commentsCarousel";
import ImagesCarousel from "../carousel/imagesCarousel";

const getDayName = (dayNumber: number) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayNumber];
};

const formatMiltaryTime = (
  openHour: number,
  openMinute: number,
  closeHour: number,
  closeMinute: number
) => {
  const openAmpm = openHour >= 12 ? "PM" : "AM";
  const closeAmpm = closeHour >= 12 ? "PM" : "AM";

  const formattedOpenHour = openHour % 12 || 12;
  const formattedOpenMinute = openMinute.toString().padStart(2, "0");

  const formattedCloseHour = closeHour % 12 || 12;
  const formattedCloseMinute = closeMinute.toString().padStart(2, "0");

  return `${formattedOpenHour}:${formattedOpenMinute} ${openAmpm} - ${formattedCloseHour}:${formattedCloseMinute} ${closeAmpm}`;
};

const ActivitySidebar = ({ onClose, activity }: any) => {
  const searchParams = useSearchParams();
  const itineraryId = searchParams.get("i");

  const [loading, setLoading] = useState<any>(false);
  const [isActivityAdded, setIsActivityAdded] = useState<boolean>(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    const checkIfActivityAdded = async () => {
      if (!activity || !itineraryId) return;
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
      } catch (error) {
        console.error("Error checking activity exists: ", error);
      } finally {
        setLoading(false);
      }
    };

    checkIfActivityAdded();
  }, [activity, itineraryId]);

  const handleActivity = async () => {
    if (!activity || !itineraryId) return;
    setLoading(true);

    const itineraryActivityData = {
      activity_id: activity.activity_id,
      itinerary_id: itineraryId,
    };

    try {
      await insertTableData("itinerary_activities", itineraryActivityData);
      const { exists } = await checkEntryExists("itinerary_activities", {
        itineraryId,
        activityId: activity.activity_id,
      });
      if (exists) {
        setIsActivityAdded(true);
      }
    } catch (error) {
      console.error("Error adding activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderOpeningHours = () => {
    if (
      !activity ||
      !activity.currentOpeningHours ||
      !activity.currentOpeningHours.periods
    ) {
      return <p>Opening hours not available</p>;
    }

    const periods = activity.currentOpeningHours.periods;

    // Check if it's open 24/7
    if (
      periods.length === 1 &&
      periods[0].open.day === 2 &&
      periods[0].open.hour === 0 &&
      periods[0].open.minute === 0 &&
      periods[0].close.day === 1 &&
      periods[0].close.hour === 23 &&
      periods[0].close.minute === 59
    ) {
      return (
        <div className="grid grid-cols-[120px_1fr] items-center">
          <div className="text-sm font-medium py-2">Sunday:</div>
          <div className="text-sm">Open 24 hours</div>
          <div className="text-sm font-medium py-2">Monday:</div>
          <div className="text-sm">Open 24 hours</div>
          <div className="text-sm font-medium py-2">Tuesday:</div>
          <div className="text-sm">Open 24 hours</div>
          <div className="text-sm font-medium py-2">Wednesday:</div>
          <div className="text-sm">Open 24 hours</div>
          <div className="text-sm font-medium py-2">Thursday:</div>
          <div className="text-sm">Open 24 hours</div>
          <div className="text-sm font-medium py-2">Friday:</div>
          <div className="text-sm">Open 24 hours</div>
          <div className="text-sm font-medium py-2">Saturday:</div>
          <div className="text-sm">Open 24 hours</div>
        </div>
      );
    }

    return periods.map((period: any, index: number) => (
      <div key={index} className="grid grid-cols-[120px_1fr] items-center py-2">
        <div className="text-sm font-medium">
          {getDayName(period.open.day)}:
        </div>
        <div className="text-sm">
          {formatMiltaryTime(
            period.open.hour,
            period.open.minute,
            period.close.hour,
            period.close.minute
          )}
        </div>
      </div>
    ));
  };

  if (!activity) {
    return (
      <div className="flex flex-col w-80 h-full px-4 pt-4 border items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading activity...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full border bg-white relative">
      <div className="flex flex-col w-full h-full border bg-white relative">
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X size={16} className="rounded-full hover:bg-zinc-100" />
          </Button>
        </div>
        <ScrollArea className="h-full">
          <Accordion type="single" collapsible key={activity.activity_id}>
            <div className="px-4 pt-16">
              <div className="mt-4">
                {activity.photos && activity.photos.length > 0 && (
                  <div className="mt-4">
                    <ImagesCarousel
                      images={activity.photos}
                      showButtons={true}
                      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
                    />
                  </div>
                )}
              </div>
              <div className="mt-6">
                <div className="font-semibold text-2xl">
                  {capitalizeFirstLetterOfEachWord(activity.displayName.text)}
                </div>
                {activity.editorialSummary && (
                  <div className="flex flex-row space-x-1 items-center mt-2">
                    <Rating rating={activity.rating} />
                    <div className="ml-2 text-xs text-zinc-500">
                      {activity.rating}
                    </div>
                  </div>
                )}

                <p className="text-gray-500 text-md mt-1">
                  {activity.formattedAddress}
                </p>
                {activity.editorialSummary && (
                  <p className="mt-2 text-md">
                    {activity.editorialSummary.text}
                  </p>
                )}

                {activity.websiteUri && (
                  <>
                    <div>
                      {activity.websiteUri && (
                        <Link
                          href={activity.websiteUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-row items-center hover:bg-gray-50 text-md hover:underline mt-4"
                        >
                          <div className="p-4">
                            <Globe size={20} />
                          </div>
                          <div>Website</div>
                        </Link>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                {activity.nationalPhoneNumber && (
                  <>
                    <div className="flex flex-row items-center hover:bg-gray-50 text-md  hover:underline">
                      <div className="p-4">
                        <Phone size={20} />
                      </div>
                      <div>{activity.nationalPhoneNumber}</div>
                    </div>
                    <Separator />
                  </>
                )}

                <div className="flex flex-row items-center hover:bg-gray-50 text-md">
                  <div className="p-4">
                    <Clock size={20} />
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>Opening Hours</AccordionTrigger>
                      <AccordionContent className="flex flex-col w-full">
                        {renderOpeningHours()}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <Separator />

                {activity.reviews && activity.reviews.length > 0 && (
                  <div className="mt-4">
                    <CommentsCarousel reviews={activity.reviews} />
                  </div>
                )}
              </div>
            </div>
          </Accordion>
        </ScrollArea>
        <div className="flex flex-col w-full px-4 pb-4">
          {/* <Link href={`/itinerary/${1}/overview`}> */}
          <Separator className="mt-4" />
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
    </div>
  );
};

export default ActivitySidebar;
