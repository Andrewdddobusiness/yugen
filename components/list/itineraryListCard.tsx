"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { GripVertical, Loader2 } from "lucide-react";
import { useState } from "react";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";
import TimePopover from "../time/timePopover";
import { Button } from "@/components/ui/button";

import { cn } from "@/components/lib/utils";

import { DatePickerPopover } from "../date/datePickerPopover";
import { useItineraryActivityStore, IActivity } from "@/store/itineraryActivityStore";

interface ItineraryListCardProps {
  activity: IActivity;
  dragHandleProps: any;
  isDragging: boolean;
}

export const ItineraryListCard: React.FC<ItineraryListCardProps> = ({ activity, dragHandleProps, isDragging }) => {
  const { activities } = useItineraryActivityStore();

  // Find the latest activity data from the store
  const latestActivity = activities.find((a) => a.itinerary_activity_id === activity.itinerary_activity_id) || activity;

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "relative flex flex-row gap-4 rounded-lg transition-all duration-300",
        isDragging ? "opacity-50" : ""
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left column for grip - only this part is draggable */}
      <div className="flex items-center justify-center h-full w-12 cursor-grab" {...dragHandleProps}>
        <span className="p-1 rounded-md border bg-white">
          <GripVertical size={20} />
        </span>
      </div>

      {/* Right column for the card content */}
      <div className="flex flex-col flex-grow p-4">
        <div className="flex xs:flex-col md:flex-row gap-4">
          <Carousel>
            <CarouselContent>
              {activity.activities?.image_url?.length > 0 ? (
                activity.activities.image_url.map((image: string, index: number) => (
                  <CarouselItem key={index}>
                    <Image
                      src={image}
                      alt={activity.activities.activity_name}
                      width={200}
                      height={200}
                      priority={true}
                      className="xs:min-w-60 md:min-w-48 max-h-32 object-cover rounded-md"
                    />
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem>
                  <div className="xs:min-w-60 md:min-w-48 h-[200px] flex items-center justify-center bg-gray-200 rounded-md">
                    No image available
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
          </Carousel>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold mt-2">
              {capitalizeFirstLetterOfEachWord(activity.activities.activity_name)}
            </h3>
            <p className="text-gray-600 text-md">{activity.activities.description}</p>
            <div className="flex flex-row gap-4">
              <TimePopover
                itineraryActivityId={latestActivity.itinerary_activity_id}
                storeStartTime={latestActivity.start_time}
                storeEndTime={latestActivity.end_time}
              />

              <DatePickerPopover itineraryActivityId={activity.itinerary_activity_id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
