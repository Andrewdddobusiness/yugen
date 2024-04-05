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

interface ItineraryCardProps {
  imageUrls: string[];
  title: string;
  address: string;
  description: string;
  duration: number;
  cost: number;
  rating: number;
  reviews: number;
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
    const hours = Math.floor(duration);
    const minutes = Math.round((duration % 1) * 60);
    if (hours === 0) {
      return `${minutes}M`;
    } else if (minutes === 0) {
      return `${hours}H`;
    } else {
      return `${hours}H ${minutes}M`;
    }
  };

  return (
    <Link href="/your-next-page" legacyBehavior passHref>
      <Card
        className="aspect-w-1 aspect-h-1 cursor-pointer relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          <Image
            src={imageUrls[0]}
            alt="Image"
            width={1920}
            height={1080}
            objectFit="cover"
            className="h-40 w-full rounded-t-lg"
          />
          <div className="absolute top-2 left-2">
            <Badge>{formatCost(cost)}</Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge>{formatDuration(duration)}</Badge>
          </div>
        </div>
        <CardHeader>
          <CardTitle className="mb-1">{title}</CardTitle>
          <CardDescription className="flex flex-col">
            <div className="mb-2">
              <h3 className="sr-only">Reviews</h3>
              <div className="flex items-center">
                <div className="flex items-center">
                  <Rating rating={rating} />
                </div>
                <p className="sr-only">4 out of 5 stars</p>
                <a href="#" className="ml-2 text-xs text-zinc-500">
                  ({reviews} reviews)
                </a>
              </div>
            </div>
            <div className="text-sm">{truncatedDescription}</div>
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
