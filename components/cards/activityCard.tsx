"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import Rating from "@/components/rating/rating";

import { Button } from "../ui/button";

import { ChevronDown, Loader2, Image as ImageIcon } from "lucide-react";

import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";
import { formatCategoryTypeArray } from "@/utils/formatting/types";

import { IActivityWithLocation } from "@/store/activityStore";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";

interface ItineraryCardProps {
  activity: IActivityWithLocation;
  onClick?: () => void;
  onAddToItinerary?: () => void;
  onOptionsClick?: () => void;
}

export default function ActivityCard({ activity, onClick, onOptionsClick }: ItineraryCardProps) {
  const searchParams = useSearchParams();
  const itineraryId = searchParams.get("i");
  const { insertItineraryActivity, removeItineraryActivity, itineraryActivities } = useItineraryActivityStore();
  const [isActivityAdded, setIsActivityAdded] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);

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

  useEffect(() => {
    const checkIfActivityAdded = async () => {
      if (!activity || !itineraryId) return;
      try {
        setLoading(true);
        const activityExists = itineraryActivities.some((itineraryActivity) => {
          const isMatch = itineraryActivity.activity?.place_id === activity.place_id;
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
  }, [activity, itineraryId, itineraryActivities]);

  let priceLevelText = formatPriceLevel(activity.price_level);

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

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOptionsClick) {
      onOptionsClick();
    }
  };

  return (
    <Card
      className={`flex flex-col cursor-pointer relative w-full h-[365px] transition-all duration-300 ease-in-out ${
        isHovered ? "bg-zinc-50 shadow-lg" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative">
        {activity.photo_names ? (
          <div className="h-40 w-full rounded-t-lg object-cover">
            {loading && activity.photo_names[0] ? (
              <Skeleton className=" flex items-center justify-center h-40 w-full rounded-t-lg">
                <ImageIcon size={32} className="text-zinc-300" />
              </Skeleton>
            ) : (
              <Image
                src={`https://places.googleapis.com/v1/${activity.photo_names[0]}/media?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&maxHeightPx=1000&maxWidthPx=1000`}
                alt="Activity Image"
                width={1920}
                height={1080}
                priority
                className="h-40 w-full rounded-t-lg object-cover"
              />
            )}
          </div>
        ) : (
          <div className="h-40 w-full bg-gray-200 rounded-t-lg flex items-center justify-center">
            <span className="text-gray-500">No image available</span>
          </div>
        )}

        <div className="absolute top-2 left-2">{priceLevelText === "" ? null : <Badge>{priceLevelText}</Badge>}</div>
      </div>

      <CardContent className="flex flex-col gap-2 mt-5 flex-grow">
        <div className="text-lg font-semibold line-clamp-1">{capitalizeFirstLetterOfEachWord(activity.name)}</div>
        <div className="flex items-center">
          <div className="items-center  md:flex">
            <Rating rating={activity.rating} />
          </div>

          <div className="ml-2 text-xs text-zinc-500">{activity.rating}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {formatCategoryTypeArray(activity.types.slice(0, 1)).map((type) => (
            <Badge key={type}>{type}</Badge>
          ))}
        </div>
        <div className="text-sm line-clamp-2 h-10 overflow-hidden">{activity.description}</div>
      </CardContent>

      <CardFooter className="p-0 absolute bottom-0 left-0 right-0">
        <div className="inline-flex shadow-sm w-full" role="group">
          {loading ? (
            <Button
              variant="outline"
              className="flex w-3/4 px-4 py-1 text-sm font-medium rounded-tl-none rounded-r-none hover:bg-gray-100 hover:text-black"
              disabled
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin " />
              Please wait
            </Button>
          ) : isActivityAdded ? (
            <Button
              variant="secondary"
              className="flex w-3/4 px-4 py-1 text-sm font-medium rounded-tl-none rounded-r-none hover:bg-gray-100 hover:text-black"
              onClick={handleRemoveToItinerary}
            >
              Remove
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex w-3/4 px-4 py-1 text-sm font-medium rounded-tl-none rounded-r-none hover:bg-gray-100 hover:text-black"
              onClick={handleAddToItinerary}
            >
              Add to Itinerary
            </Button>
          )}
          <Button
            variant="default"
            className="flex w-1/4 justify-center items-center px-3 py-1 text-sm font-medium rounded-l-none rounded-tr-none hover:bg-zinc-700"
            onClick={handleOptionsClick}
          >
            <ChevronDown size={12} />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
