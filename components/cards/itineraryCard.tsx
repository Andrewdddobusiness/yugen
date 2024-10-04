"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MoreHorizontal } from "lucide-react";

import { capitalizeFirstLetter } from "@/utils/formatting/capitalise";

export default function ItineraryCard({
  link,
  imageUrl,
  destination,
  startDate,
  endDate,
}: any) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link href={link || ""} legacyBehavior passHref>
      <Card
        className="aspect-w-1 aspect-h-1 cursor-pointer relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Image
          src={imageUrl || ""}
          alt="Image"
          width={1920}
          height={1080}
          objectFit="cover"
          priority={true}
          className="h-40 w-60 rounded-t-lg"
        />
        <CardHeader>
          <CardTitle>{capitalizeFirstLetter(destination)}</CardTitle>
          <CardDescription>
            {startDate} - {endDate}
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
