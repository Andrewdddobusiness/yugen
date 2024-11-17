"use client";
import { useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { Card, CardFooter, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Rating from "@/components/rating/rating";

import { ChevronDown, Loader2, Image as ImageIcon } from "lucide-react";

import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";
import { formatCategoryTypeArray } from "@/utils/formatting/types";

import { IActivityWithLocation } from "@/store/activityStore";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

interface ItineraryCardProps {
  activity: IActivityWithLocation;
  onClick?: () => void;
  onAddToItinerary?: () => void;
  onOptionsClick?: () => void;
  variant?: "full" | "simple";
}

export default function ActivityCardHorizontal({
  activity,
  onClick,
  onOptionsClick,
  variant = "full",
}: ItineraryCardProps) {
  let { itineraryId, destinationId } = useParams();
  itineraryId = itineraryId.toString();
  destinationId = destinationId.toString();

  // **** STORES ****
  const { insertItineraryActivity, removeItineraryActivity, isActivityAdded, itineraryActivities } =
    useItineraryActivityStore();

  // **** STATES ****
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);

  const isAdded = isActivityAdded(activity.place_id);

  const formatPriceLevel = (priceLevel: string) => {
    switch (priceLevel) {
      case "PRICE_LEVEL_FREE":
        return "Free";
      case "PRICE_LEVEL_INEXPENSIVE":
        return "";
      case "PRICE_LEVEL_MODERATE":
        return "$$";
      case "PRICE_LEVEL_EXPENSIVE":
        return "$$$";
      case "PRICE_LEVEL_VERY_EXPENSIVE":
        return "$$$";
      default:
        return "";
    }
  };

  let priceLevelText = formatPriceLevel(activity.price_level);

  const handleAddToItinerary = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    if (!activity || !itineraryId || !destinationId) return;
    if (Array.isArray(itineraryId)) {
      await insertItineraryActivity(activity, itineraryId.toString(), destinationId.toString());
    } else {
      await insertItineraryActivity(activity, itineraryId.toString(), destinationId.toString());
    }
    setLoading(false);
  };

  const handleRemoveToItinerary = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    if (!activity || !itineraryId) return;
    if (Array.isArray(itineraryId)) {
      await removeItineraryActivity(activity.place_id, itineraryId[0]);
    } else {
      await removeItineraryActivity(activity.place_id, itineraryId);
    }
    setLoading(false);
  };

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOptionsClick) {
      onOptionsClick();
    }
  };

  return (
    <Card
      className={`flex flex-row cursor-pointer relative w-full ${
        variant === "simple" ? "h-16" : "h-[200px]"
      } transition-all duration-300 ease-in-out ${isHovered ? "bg-zinc-50 shadow-lg" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {variant === "full" ? (
        // Full card content
        <>
          {/* Left side - Image */}
          <div className="relative w-[250px] h-full ">
            {activity.photo_names ? (
              <div className="h-full w-full">
                {loading && activity.photo_names[0] ? (
                  <Skeleton className="flex items-center justify-center h-full w-full rounded-l-lg">
                    <ImageIcon size={32} className="text-zinc-300" />
                  </Skeleton>
                ) : (
                  <Image
                    src={`https://places.googleapis.com/v1/${activity.photo_names[0]}/media?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&maxHeightPx=1000&maxWidthPx=1000`}
                    alt="Activity Image"
                    width={1920}
                    height={1080}
                    priority
                    className="h-full w-full rounded-l-lg object-cover"
                  />
                )}
              </div>
            ) : (
              <div className="h-full w-full bg-gray-200 rounded-l-lg flex items-center justify-center">
                <span className="text-gray-500">No image available</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2">
              {priceLevelText === "" ? null : <Badge>{priceLevelText}</Badge>}
            </div>
          </div>

          {/* Right side - Full content */}
          <div className="flex flex-col flex-grow p-4 relative">
            <div className="absolute top-4 right-4 flex gap-2">
              {/* Action buttons */}
              {loading ? (
                <Button variant="outline" className="h-8" disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </Button>
              ) : isAdded ? (
                <Button variant="secondary" className="h-8" onClick={handleRemoveToItinerary}>
                  Remove
                </Button>
              ) : (
                <Button variant="outline" className="h-8" onClick={handleAddToItinerary}>
                  Add to Itinerary
                </Button>
              )}
              <Button variant="default" className="h-8 w-8 p-0" onClick={handleOptionsClick}>
                <ChevronDown size={12} />
              </Button>
            </div>

            <div className="flex flex-col gap-2 pr-32">
              <div className="text-lg font-semibold line-clamp-1">{capitalizeFirstLetterOfEachWord(activity.name)}</div>
              <div className="flex items-center">
                <Rating rating={activity.rating} />
                <div className="ml-2 text-xs text-zinc-500">{activity.rating}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {formatCategoryTypeArray(activity.types.slice(0, 1)).map((type) => (
                  <Badge key={type} variant="secondary">
                    {type}
                  </Badge>
                ))}
              </div>
              <div className="text-sm line-clamp-3">{activity.description}</div>
            </div>
          </div>
        </>
      ) : (
        // Simple card content
        <div className="flex flex-row items-center justify-between w-full px-4">
          <div className="text-md font-semibold truncate">{capitalizeFirstLetterOfEachWord(activity.name)}</div>
          <div className="flex">
            {loading ? (
              <Button variant="outline" className="h-8 min-w-16 rounded-r-none" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
              </Button>
            ) : isAdded ? (
              <Button variant="secondary" className="h-8 min-w-16 rounded-r-none" onClick={handleRemoveToItinerary}>
                Remove
              </Button>
            ) : (
              <Button variant="outline" className="h-8 min-w-16 rounded-r-none" onClick={handleAddToItinerary}>
                Add to Itinerary
              </Button>
            )}
            <Button variant="default" className="h-8 w-8 p-0 rounded-l-none" onClick={handleOptionsClick}>
              <ChevronDown size={12} />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
