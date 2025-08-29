"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
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
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageExists, setImageExists] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Check if image exists in Supabase storage
  useEffect(() => {
    const checkImageExists = async () => {
      if (!itinerary.city) return;

      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Try to fetch the image directly
        const { data, error } = await supabase.storage
          .from("cities")
          .download(`${itinerary.country.toLowerCase()}-${itinerary.city.toLowerCase()}/1.jpg`);

        if (data && !error) {
          setImageExists(true);
        } else {
          setImageExists(false);
        }
      } catch (error) {
        console.error("Error checking image:", error);
        setImageExists(false);
      } finally {
        setIsImageLoading(false);
      }
    };

    checkImageExists();
  }, [itinerary.city, itinerary.country]);

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
      href={`/itinerary/${itinerary.itinerary_id}/${itinerary.itinerary_destination_id}/activities`}
      legacyBehavior
      passHref
    >
      <Card
        className="h-60 w-full sm:w-60 cursor-pointer relative backdrop-blur-lg sm:shadow-lg sm:hover:scale-105 transition-all duration-300 sm:active:scale-95 rounded-xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isImageLoading ? (
          <Skeleton className="flex items-center justify-center h-40 w-full rounded-t-lg">
            <ImageIcon size={32} className="text-zinc-300" />
          </Skeleton>
        ) : imageExists ? (
          <Image
            src={`${
              process.env.NEXT_PUBLIC_SUPABASE_URL
            }/storage/v1/object/public/cities/${itinerary.country.toLowerCase()}-${itinerary.city.toLowerCase()}/1.jpg`}
            alt="City Image"
            width={1920}
            height={1080}
            priority={true}
            className="h-40 w-full object-cover rounded-t-xl"
            onError={() => setImageExists(false)}
          />
        ) : (
          <Skeleton className="flex items-center justify-center h-40 w-full rounded-t-lg">
            <ImageIcon size={32} className="text-zinc-300" />
          </Skeleton>
        )}
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
              isHovered ? "opacity-100 hover:bg-[#3A86FF]" : "opacity-100 sm:opacity-0"
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
