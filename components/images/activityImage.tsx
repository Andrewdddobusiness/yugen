"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { getPlacePhotoAction } from "@/actions/google/actions";
import { useEffect } from "react";
import { Skeleton } from "../ui/skeleton";
import { ImageIcon, ImageOff } from "lucide-react";

interface ActivityImageProps {
  photoNames: string[];
  alt: string;
  priority?: boolean;
  className?: string;
}

export const ActivityImage = ({
  photoNames,
  alt,
  priority = false,
  className = "h-40 w-full rounded-t-lg object-cover",
}: ActivityImageProps) => {
  const {
    data: imageData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["placePhoto", photoNames[0]],
    queryFn: async () => {
      console.log("Cache miss - fetching photo:", photoNames[0]);
      if (!photoNames.length) return null;

      for (const photoName of photoNames) {
        try {
          const result = await getPlacePhotoAction(photoName);
          if (result.success && result.data) {
            return result.data;
          }
        } catch (err) {
          console.error(`Error loading image ${photoName}:`, err);
          continue;
        }
      }
      return null;
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 w-full rounded-t-lg bg-gray-200 ">
        <Skeleton className="flex items-center justify-center h-40 w-full rounded-t-lg">
          <ImageIcon size={32} className="text-zinc-300" />
        </Skeleton>
      </div>
    );
  }

  if (isError || !imageData) {
    return (
      <div className="flex items-center justify-center h-40 w-full rounded-t-lg bg-gray-200 ">
        <ImageOff size={32} className="text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="relative">
      {imageData && (
        <Image
          src={imageData}
          alt={alt}
          width={1920}
          height={1080}
          priority={priority}
          className={className}
          onError={() => console.error("Image failed to load")}
        />
      )}
    </div>
  );
};
