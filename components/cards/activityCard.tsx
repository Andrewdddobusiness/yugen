"use client";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import Rating from "@/components/rating/rating";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";
import { Star } from "lucide-react";
import { formatCategoryTypeArray } from "@/utils/formatting/types";

interface ItineraryCardProps {
  imageUrl: string;
  title: string;
  address: string;
  description: string;
  priceLevel: string;
  rating: number;
  types: string[];
  onClick?: () => void;
}

export default function ActivityCard({
  imageUrl,
  title,
  address,
  description,
  priceLevel,
  rating,
  types,
  onClick,
}: ItineraryCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const truncatedDescription =
    description.length > 65
      ? description.substring(0, 65) + "..."
      : description;

  const formatPriceLevel = (priceLevel: string) => {
    switch (priceLevel) {
      case "PRICE_LEVEL_INEXPENSIVE":
        return "$";
      case "PRICE_LEVEL_MODERATE":
        return "$$";
      case "PRICE_LEVEL_EXPENSIVE":
        return "$$$";
      default:
        return "";
    }
  };

  let priceLevelText = formatPriceLevel(priceLevel);

  return (
    <Card
      className={`aspect-w-1 aspect-h-1 cursor-pointer relative w-64 transition-all duration-300 ease-in-out ${
        isHovered ? "scale-105 shadow-lg" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Activity Image"
            width={240}
            height={160}
            objectFit="cover"
            className="h-40 w-full rounded-t-lg object-cover"
          />
        ) : (
          <div className="h-40 w-60 bg-gray-200 rounded-t-lg flex items-center justify-center">
            <span className="text-gray-500">No image available</span>
          </div>
        )}

        <div className="absolute top-2 left-2">
          {priceLevelText === "" ? null : <Badge>{priceLevelText}</Badge>}
        </div>
      </div>
      <CardHeader>
        <CardTitle className="text-lg">
          {capitalizeFirstLetterOfEachWord(title)}
        </CardTitle>
        <CardDescription className="flex flex-col gap-2">
          <h3 className="sr-only">Reviews</h3>
          <div className="flex items-center">
            <div className="items-center hidden md:flex">
              <Rating rating={rating} />
            </div>
            <div className="md:hidden">
              <Star size={14} />
            </div>
            <div className="ml-2 text-xs text-zinc-500">{rating}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            {formatCategoryTypeArray(types.slice(0, 1)).map((type) => (
              <Badge key={type}>{type}</Badge>
            ))}
          </div>
          <div className="text-sm">{truncatedDescription}</div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
