"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { MoreHorizontal } from "lucide-react";

import { capitalizeFirstLetter } from "@/utils/formatting/capitalise";
import { formatUserFriendlyDate } from "@/utils/formatting/datetime";

export interface IItineraryCard {
  itinerary_id: number;
  destination_id: number;
  city?: string;
  country: string;
  from_date: Date;
  to_date: Date;
}

interface ItineraryCardProps {
  itinerary: IItineraryCard;
}

export default function ItineraryCard({ itinerary }: ItineraryCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link href={`/itinerary/overview?i=${itinerary.itinerary_id}&d=${itinerary.destination_id}` || ""} legacyBehavior passHref>
      <Card
        className="aspect-w-1 aspect-h-1 cursor-pointer relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Image
          src={
            process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BASE_URL +
            `/storage/v1/object/public/cities/${itinerary.country.toLowerCase()}-${itinerary.city.toLowerCase()}/1.jpg`
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
            <DropdownMenuItem>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>
    </Link>
  );
}
