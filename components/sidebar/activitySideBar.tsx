"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import CommentsCarousel from "../carousel/commentsCarousel";
import ImagesCarousel from "../carousel/imagesCarousel";

import { Globe, Clock, Loader2, X, Phone } from "lucide-react";

import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";

import Rating from "../rating/rating";

import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { IActivityWithLocation } from "@/store/activityStore";
import { formatOpenHours } from "@/utils/formatting/datetime";

const getDayName = (dayNumber: number) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayNumber];
};

interface IActivitySidebarProps {
  activity: IActivityWithLocation;
  onClose: () => void;
}

export default function ActivitySidebar({ activity, onClose }: IActivitySidebarProps) {
  const searchParams = useSearchParams();
  const itineraryId = searchParams.get("i");

  const { insertItineraryActivity, removeItineraryActivity, itineraryActivities } = useItineraryActivityStore();
  const [isActivityAdded, setIsActivityAdded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const checkIfActivityAdded = async () => {
      if (!activity || !itineraryId) return;
      try {
        setLoading(true);
        const activityExists = itineraryActivities.some((itineraryActivity) => {
          const isMatch = itineraryActivity.activity?.place_id === activity.place_id;
          const isActive = itineraryActivity.is_active === true;

          return isMatch && isActive;
        });

        setIsActivityAdded(activityExists);
      } catch (error) {
        console.error("Error checking activity exists: ", error);
      } finally {
        setLoading(false);
      }
    };

    checkIfActivityAdded();
  }, [activity, itineraryId, itineraryActivities]);

  const handleAddToItinerary = async () => {
    setLoading(true);
    if (!activity || !itineraryId) return;
    const { success } = await insertItineraryActivity(activity, itineraryId);
    if (success) {
      setIsActivityAdded(true);
    } else {
      toast.error("Failed to add activity to itinerary");
    }
    setLoading(false);
  };

  const handleRemoveToItinerary = async () => {
    setLoading(true);
    if (!activity || !itineraryId) return;
    const { success } = await removeItineraryActivity(activity.place_id, itineraryId);
    if (success) {
      setIsActivityAdded(false);
    } else {
      toast.error("Failed to remove activity from itinerary");
    }
    setLoading(false);
  };

  const renderOpeningHours = () => {
    if (!activity) {
      return <p>Opening hours not available</p>;
    }

    const periods = activity.open_hours;

    // Check if it's open 24/7
    if (
      periods.length === 0 ||
      (periods.length === 1 &&
        periods[0].open_hour === 0 &&
        periods[0].open_minute === 0 &&
        periods[0].close_hour === 23 &&
        periods[0].close_minute === 59)
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
        <div className="text-sm font-medium">{getDayName(period.day)}:</div>
        <div className="text-sm">
          {formatOpenHours(period.day, period.open_hour, period.open_minute)} -{" "}
          {formatOpenHours(period.day, period.close_hour, period.close_minute)}
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
          <Button variant="outline" size="icon" onClick={onClose} className="rounded-full">
            <X size={16} className="rounded-full hover:bg-zinc-100" />
          </Button>
        </div>
        <ScrollArea className="h-full">
          <Accordion type="single" collapsible>
            <div className="px-4 pt-16">
              <div className="mt-4">
                {activity.photo_names && activity.photo_names.length > 0 && (
                  <div className="mt-4">
                    <ImagesCarousel photoNames={activity.photo_names} showButtons={true} />
                  </div>
                )}
              </div>
              <div className="mt-6">
                <div className="font-semibold text-2xl">{capitalizeFirstLetterOfEachWord(activity.name)}</div>
                {activity.rating && (
                  <div className="flex flex-row space-x-1 items-center mt-2">
                    <Rating rating={activity.rating} />
                    <div className="ml-2 text-xs text-zinc-500">{activity.rating}</div>
                  </div>
                )}

                <p className="text-gray-500 text-md mt-1">{activity.address}</p>
                {activity.description && <p className="mt-2 text-md">{activity.description}</p>}

                {activity.website_url && (
                  <>
                    <div>
                      <Link
                        href={activity.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-row items-center hover:bg-gray-50 text-md hover:underline mt-4"
                      >
                        <div className="p-4">
                          <Globe size={20} />
                        </div>
                        <div>Website</div>
                      </Link>
                    </div>
                    <Separator />
                  </>
                )}

                {activity.phone_number && (
                  <>
                    <div className="flex flex-row items-center hover:bg-gray-50 text-md  hover:underline">
                      <div className="p-4">
                        <Phone size={20} />
                      </div>
                      <div>{activity.phone_number}</div>
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
                      <AccordionContent className="flex flex-col w-full">{renderOpeningHours()}</AccordionContent>
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
            <Button variant="outline" className="mt-4 disabled rounded-full hover:bg-gray-100 hover:text-black">
              <Loader2 className="mr-2 h-4 w-4 animate-spin " />
              Please wait
            </Button>
          ) : isActivityAdded ? (
            <Button variant="secondary" className="mt-4 rounded-full" onClick={handleRemoveToItinerary}>
              Remove
            </Button>
          ) : (
            <Button variant="outline" className="mt-4 rounded-full" onClick={handleAddToItinerary}>
              Add to Itinerary
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
