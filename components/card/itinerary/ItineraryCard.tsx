"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { softDeleteItinerary } from "@/actions/supabase/actions";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ImageIcon, MoreHorizontal } from "lucide-react";

import { capitalizeFirstLetter } from "@/utils/formatting/capitalise";
import { formatUserFriendlyDate } from "@/utils/formatting/datetime";
import { Skeleton } from "@/components/ui/skeleton";
import { getDestinationStockImageUrl } from "@/utils/images/destinationImages";

export interface IItineraryCard {
  itinerary_id: number;
  itinerary_destination_id: number;
  city?: string;
  country: string;
  from_date: Date;
  to_date: Date;
  deleted_at: string | null;
}

interface ItineraryCardProps {
  itinerary: IItineraryCard;
  onDelete: (itineraryId: number) => void;
}

export default function ItineraryCard({ itinerary, onDelete }: ItineraryCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    setUseLocalFallback(false);
    setIsImageLoading(true);
  }, [itinerary.itinerary_id, itinerary.city, itinerary.country]);

  const stockImageSrc = getDestinationStockImageUrl(
    { city: itinerary.city, country: itinerary.country },
    { width: 1200, height: 800 }
  );

  const imageSrc = useLocalFallback ? "/map2.jpg" : stockImageSrc;
  const builderHref = `/itinerary/${itinerary.itinerary_id}/${itinerary.itinerary_destination_id}/builder`;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDeleting(true);

    try {
      const result = await softDeleteItinerary(itinerary.itinerary_id);

      if (result.success) {
        toast.success("Itinerary deleted successfully");
        onDelete(itinerary.itinerary_id);
      } else {
        throw new Error("Failed to delete itinerary");
      }
    } catch (error) {
      console.error("Error deleting itinerary:", error);
      toast.error("Failed to delete itinerary");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Link
      href={builderHref}
      legacyBehavior
      passHref
    >
      <Card
        className="h-60 w-full sm:w-60 cursor-pointer relative backdrop-blur-lg sm:shadow-lg sm:hover:scale-105 transition-all duration-300 sm:active:scale-95 rounded-xl"
        onMouseEnter={() => {
          setIsHovered(true);
          router.prefetch(builderHref);
        }}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative h-40 w-full overflow-hidden rounded-t-xl">
          {isImageLoading ? (
            <Skeleton className="absolute inset-0 flex items-center justify-center">
              <ImageIcon size={32} className="text-zinc-300" />
            </Skeleton>
          ) : null}
          <Image
            src={imageSrc}
            alt={`${itinerary.city ? `${itinerary.city}, ` : ""}${itinerary.country} cover`}
            fill
            sizes="(max-width: 640px) 100vw, 240px"
            priority={true}
            className="object-cover"
            onLoadingComplete={() => setIsImageLoading(false)}
            onError={() => {
              if (!useLocalFallback) {
                setUseLocalFallback(true);
                setIsImageLoading(true);
              } else {
                setIsImageLoading(false);
              }
            }}
          />
        </div>
        <CardHeader>
          <CardTitle className="text-gray-800">
            {itinerary.city && (
              <>
                {capitalizeFirstLetter(itinerary.city || "")}
                {", "}
              </>
            )}
            <>{capitalizeFirstLetter(itinerary.country || "")}</>
          </CardTitle>
          <CardDescription>
            {formatUserFriendlyDate(itinerary.from_date)} - {formatUserFriendlyDate(itinerary.to_date)}
          </CardDescription>
        </CardHeader>

        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e: any) => e.stopPropagation()}
            className={`absolute z-50 top-2 right-2 p-1 bg-white rounded-lg transition-opacity duration-300 text-gray-500 hover:text-white ${
              isHovered ? "opacity-100 hover:bg-[#3F5FA3]" : "opacity-100 sm:opacity-0"
            }`}
          >
            <MoreHorizontal className={`h-5 w-5`} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="absolute -left-4 -bottom-10">
            <DropdownMenuItem
              onClick={(e: any) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete(e);
              }}
              disabled={isDeleting}
              className="text-red-600 focus:text-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>
    </Link>
  );
}
