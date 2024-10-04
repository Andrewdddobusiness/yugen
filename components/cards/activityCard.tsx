"use client";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import Rating from "@/components/rating/rating";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";
import { Star } from "lucide-react";

interface ItineraryCardProps {
  imageUrls: string[];
  title: string;
  address: string;
  description: string;
  duration: number;
  cost: number;
  rating: number;
  reviews: number;
  onClick?: () => void; // Add onClick prop
}

export default function ActivityCard({
  imageUrls,
  title,
  address,
  description,
  duration,
  cost,
  rating,
  reviews,
  onClick, // Destructure onClick prop
}: ItineraryCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const truncatedDescription =
    description.length > 65
      ? description.substring(0, 65) + "..."
      : description;

  const formatCost = (cost: number): string => {
    if (cost === 0) {
      return "Free";
    } else if (Math.abs(cost - Math.round(cost)) < 0.1) {
      return `$${Math.round(cost)}`;
    } else {
      return `$${cost}`;
    }
  };

  const formatDuration = (duration: number): string => {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    if (hours === 0) {
      return `${minutes}M`;
    } else if (minutes === 0) {
      return `${hours}H`;
    } else {
      return `${hours}H ${minutes}M`;
    }
  };

  return (
    <Card
      className="aspect-w-1 aspect-h-1 cursor-pointer relative w-60"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="relative">
        {imageUrls &&
          imageUrls.map((imageUrl: any, index: any) => (
            <Image
              key={index}
              src={imageUrl || ""}
              alt="Image"
              width={1920}
              height={1080}
              objectFit="cover"
              priority={true}
              className="h-40 w-60 rounded-t-lg object-cover"
            />
          ))}

        <div className="absolute top-2 left-2">
          <Badge>{formatCost(cost)}</Badge>
        </div>
        <div className="absolute top-2 right-2">
          <Badge>{formatDuration(duration)}</Badge>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="mb-1">
          {capitalizeFirstLetterOfEachWord(title)}
        </CardTitle>
        <CardDescription className="flex flex-col">
          <div className="mb-2">
            <h3 className="sr-only">Reviews</h3>
            <div className="flex items-center">
              <div className="items-center hidden md:flex">
                <Rating rating={rating} />
              </div>
              <div className="md:hidden">
                <Star size={14} />
              </div>
              {/* <p className="sr-only">4 out of 5 stars</p> */}
              <a href="#" className="ml-2 text-xs text-zinc-500">
                ({reviews} reviews)
              </a>
            </div>
          </div>
          <div className="text-sm">{truncatedDescription}</div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
