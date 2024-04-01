"use client";
import { useState } from "react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

interface ItineraryCardProps {
  imageUrl: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export default function ItineraryCard({
  imageUrl,
  destination,
  startDate,
  endDate,
}: ItineraryCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link href="/your-next-page" legacyBehavior passHref>
      <Card
        className="aspect-w-1 aspect-h-1 cursor-pointer relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Image
          src={imageUrl}
          alt="Image"
          width={1920}
          height={1080}
          objectFit="cover"
          className="h-40 w-full rounded-t-lg"
        />
        <CardHeader>
          <CardTitle>{destination}</CardTitle>
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
