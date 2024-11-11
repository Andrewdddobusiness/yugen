"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import CommentsCarousel from "@/components/carousel/reviewsCarousel";
import ImagesCarousel from "@/components/carousel/imagesCarousel";
import LoadingSpinner from "@/components/loading/loadingSpinner";

import Rating from "@/components/rating/rating";
import { Skeleton } from "@/components/ui/skeleton";

import { toast } from "sonner";

import { Globe, Clock, Loader2, X, Phone, ImageOff } from "lucide-react";

import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";

import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { IActivityWithLocation, useActivitiesStore } from "@/store/activityStore";
import { formatOpenHours } from "@/utils/formatting/datetime";
import { useSidebarStore } from "@/store/sidebarStore";
import { useMapStore } from "@/store/mapStore";

const getDayName = (dayNumber: number) => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayNumber];
};

export function AppSidebarItineraryActivityRight() {
  let { itineraryId } = useParams();
  itineraryId = itineraryId.toString();
  // **** STORES ****
  const { setIsSidebarRightOpen } = useSidebarStore();
  const { selectedActivity } = useActivitiesStore();

  const { insertItineraryActivity, removeItineraryActivity, itineraryActivities } = useItineraryActivityStore();
  const [isActivityAdded, setIsActivityAdded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const { toggleSidebar } = useSidebar();
  const { setTempMarker } = useMapStore();

  useEffect(() => {
    const checkIfActivityAdded = async () => {
      if (!selectedActivity || !itineraryId) return;
      try {
        setLoading(true);
        const activityExists = itineraryActivities.some((itineraryActivity) => {
          const isMatch = itineraryActivity.activity?.place_id === selectedActivity.place_id;
          const isActive = itineraryActivity.deleted_at === null;

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
  }, [selectedActivity, itineraryId, itineraryActivities]);

  const handleAddToItinerary = async () => {
    setLoading(true);
    if (!selectedActivity || !itineraryId) return;
    const { success } = await insertItineraryActivity(selectedActivity as IActivityWithLocation, itineraryId);
    if (success) {
      setIsActivityAdded(true);
    } else {
      toast.error("Failed to add activity to itinerary");
    }
    setLoading(false);
  };

  const handleRemoveToItinerary = async () => {
    setLoading(true);
    if (!selectedActivity || !itineraryId) return;
    const { success } = await removeItineraryActivity(selectedActivity.place_id, itineraryId);
    if (success) {
      setIsActivityAdded(false);
    } else {
      toast.error("Failed to remove activity from itinerary");
    }
    setLoading(false);
  };

  const renderOpeningHours = () => {
    if (!selectedActivity) {
      return <p>Opening hours not available</p>;
    }

    const periods = selectedActivity.open_hours;

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

  // **** HANDLERS ****
  const handleCloseSidebar = () => {
    setIsSidebarRightOpen(false);
    toggleSidebar();
    setTempMarker(null);
  };

  if (!selectedActivity) {
    return (
      <Sidebar side={"right"} variant="inset" className="shadow-md bg-white">
        <SidebarHeader className="bg-white">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="absolute top-1 right-1 z-30">
                <Button variant="outline" size="icon" onClick={handleCloseSidebar} className="rounded-full">
                  <X size={16} className="rounded-full hover:bg-zinc-100" />
                </Button>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="bg-white">
          <ScrollArea className="h-full">
            <div className="px-4 pt-16">
              <Skeleton className="w-full h-[200px] rounded-lg" />
              <div className="mt-6">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-24 mt-2" />
                <Skeleton className="h-4 w-full mt-2" />
                <div className="mt-4">
                  <Skeleton className="h-12 w-full" />
                </div>
                <div className="mt-4">
                  <Skeleton className="h-12 w-full" />
                </div>
                <div className="mt-4">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              </div>
            </div>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="bg-white">
          <div className="flex flex-col w-full px-4 pb-4">
            <Separator className="mt-4" />
            <Button variant="outline" className="mt-4 disabled rounded-full hover:bg-gray-100 hover:text-black">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </Button>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  }

  return (
    <Sidebar side={"right"} variant="inset" className="shadow-md bg-white">
      <SidebarHeader className="bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="absolute top-1 right-1 z-10">
              <Button variant="outline" size="icon" onClick={handleCloseSidebar} className="rounded-full">
                <X size={16} className="rounded-full hover:bg-zinc-100" />
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <ScrollArea className="h-full">
          <Accordion type="single" collapsible>
            <div className="px-4 pt-16 gap-4">
              <div>
                {loading ? (
                  <Skeleton className="w-full h-[200px] rounded-lg" />
                ) : selectedActivity?.photo_names?.length > 0 ? (
                  <div className="mt-4">
                    <ImagesCarousel photoNames={selectedActivity.photo_names} showButtons={true} />
                  </div>
                ) : (
                  <div className="w-full h-[200px] bg-gray-100 rounded-lg flex flex-col items-center justify-center">
                    <ImageOff size={48} />
                    <p className="text-gray-500">No images available</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col pt-6 gap-2">
                {loading ? (
                  <Skeleton className="h-8 w-3/4" />
                ) : selectedActivity?.name ? (
                  <div className="font-semibold text-2xl">{capitalizeFirstLetterOfEachWord(selectedActivity.name)}</div>
                ) : (
                  <div className="font-semibold text-2xl text-gray-500">Unnamed Location</div>
                )}

                {loading ? (
                  <Skeleton className="h-4 w-24 mt-2" />
                ) : selectedActivity?.rating ? (
                  <div className="flex flex-row space-x-1 items-center">
                    <Rating rating={selectedActivity.rating} />
                    <div className="ml-2 text-xs text-zinc-500">{selectedActivity.rating}</div>
                  </div>
                ) : null}

                {loading ? (
                  <Skeleton className="h-4 w-full mt-2" />
                ) : selectedActivity?.description ? (
                  <p className="text-md">{selectedActivity.description}</p>
                ) : null}

                <Separator className="mt-2" />

                {loading ? (
                  <div>
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : selectedActivity?.website_url ? (
                  <>
                    <div>
                      <Link
                        href={selectedActivity.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-row items-center hover:bg-gray-50 text-md hover:underline"
                      >
                        <div className="p-4">
                          <Globe size={20} />
                        </div>
                        <div>Website</div>
                      </Link>
                    </div>
                    <Separator />
                  </>
                ) : null}

                {loading ? (
                  <div className="mt-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : selectedActivity?.phone_number ? (
                  <>
                    <div className="flex flex-row items-center hover:bg-gray-50 text-md  hover:underline">
                      <div className="p-4">
                        <Phone size={20} />
                      </div>
                      <div>{selectedActivity.phone_number}</div>
                    </div>
                    <Separator />
                  </>
                ) : null}

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

                {loading ? (
                  <div className="mt-4">
                    <Skeleton className="h-[300px] w-full" />
                  </div>
                ) : selectedActivity?.reviews?.length > 0 ? (
                  <div className="mt-4">
                    <CommentsCarousel reviews={selectedActivity.reviews} />
                  </div>
                ) : null}
              </div>
            </div>
          </Accordion>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="bg-white">
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
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
