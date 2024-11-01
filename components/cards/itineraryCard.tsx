"use client";
import { useState } from "react";
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

import { MoreHorizontal } from "lucide-react";

import { capitalizeFirstLetter } from "@/utils/formatting/capitalise";
import { formatUserFriendlyDate } from "@/utils/formatting/datetime";

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
        className="h-60 w-60 cursor-pointer relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Image
          src={
            process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BASE_URL +
            `/storage/v1/object/public/cities/${itinerary.country.toLowerCase()}-${itinerary?.city?.toLowerCase()}/1.jpg`
          }
          alt="Image"
          width={1920}
          height={1080}
          priority={true}
          className="h-40 w-60 rounded-t-lg"
        />
        <CardHeader>
          <CardTitle>
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
            className={`absolute z-50 top-2 right-2 p-1 bg-gray-200 rounded transition-opacity duration-300 text-black hover:text-white ${
              isHovered ? "opacity-100 hover:bg-black" : "opacity-0"
            }`}
          >
            <MoreHorizontal className={`h-5 w-5`} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="absolute -left-4 -bottom-10">
            <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-red-600 focus:text-red-600">
              {isDeleting ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>
    </Link>
  );
}
