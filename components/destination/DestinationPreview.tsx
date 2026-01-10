"use client";

import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, CreditCard, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import DestinationMap from "./DestinationMap";
import { useQuery } from "@tanstack/react-query";
import { getDestinationInsights } from "@/actions/destination/insights";
import { Skeleton } from "@/components/ui/skeleton";

interface Destination {
  id: string;
  name: string;
  country: string;
  city: string;
  formatted_address: string;
  place_id: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timezone: string;
  photos?: string[];
  description?: string;
}

interface DestinationPreviewProps {
  destination: Destination;
  onBack: () => void;
  onConfirm: () => void;
}

export default function DestinationPreview({ destination, onBack, onConfirm }: DestinationPreviewProps) {
  const { data: insights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ["destinationInsights", destination.place_id],
    queryFn: async () => {
      const response = await getDestinationInsights({
        placeId: destination.place_id,
        name: destination.name,
        country: destination.country,
        coordinates: destination.coordinates,
      });

      return response.success ? response.data : null;
    },
    enabled: Boolean(destination.place_id && destination.coordinates),
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const description = insights?.description?.trim() || destination.description?.trim() || "";
  const currency = insights?.currency?.trim() || "";
  const languages = insights?.languages?.trim() || "";
  const timeZoneLabel = insights?.timeZone?.id
    ? `${insights.timeZone.id}${insights.timeZone.utcOffset ? ` (${insights.timeZone.utcOffset})` : ""}`
    : "";
  const highlights = insights?.highlights ?? [];

  const heroPhotoPath = insights?.heroPhotoPath?.trim() || "";
  const heroPhotoSrc = heroPhotoPath
    ? `/api/photos/${heroPhotoPath}?maxWidthPx=1600&maxHeightPx=900`
    : "";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to destinations
        </Button>
        <Button
          onClick={onConfirm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          Choose {destination.name}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Hero Section */}
        <div className="relative h-64">
          {heroPhotoSrc ? (
            <>
              <Image src={heroPhotoSrc} alt={destination.name} fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600" />
              <div className="absolute inset-0 bg-black/25" />
            </>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-5 w-5" />
              <span className="text-lg font-semibold">{destination.formatted_address}</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{destination.name}</h1>
            <div className="flex flex-wrap gap-2 text-sm">
              {timeZoneLabel ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Clock className="h-4 w-4" />
                  <span className="truncate max-w-[260px]">{timeZoneLabel}</span>
                </div>
              ) : null}
              {currency ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <CreditCard className="h-4 w-4" />
                  <span className="truncate max-w-[260px]">{currency}</span>
                </div>
              ) : null}
              {languages ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                  <Languages className="h-4 w-4" />
                  <span className="truncate max-w-[260px]">{languages}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">About {destination.name}</h2>
            {isLoadingInsights ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-3/6" />
              </div>
            ) : description ? (
              <p className="text-gray-600 leading-relaxed">{description}</p>
            ) : (
              <p className="text-gray-600 leading-relaxed">
                {destination.name} is a destination in {destination.country}. Add your travel dates to start building your itinerary.
              </p>
            )}
          </div>

          {/* Key Information */}
          {timeZoneLabel || currency || languages ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {timeZoneLabel ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Info</h3>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium text-gray-900">Time Zone</div>
                      <div className="text-gray-600">{timeZoneLabel}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div />
              )}

              {currency || languages ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Local Details</h3>
                  <div className="space-y-3">
                    {currency ? (
                      <div>
                        <div className="font-medium text-gray-900">Currency</div>
                        <div className="text-gray-600">{currency}</div>
                      </div>
                    ) : null}
                    {languages ? (
                      <div>
                        <div className="font-medium text-gray-900">Language</div>
                        <div className="text-gray-600">{languages}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Top Attractions */}
          {isLoadingInsights ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Attractions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            </div>
          ) : highlights.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Attractions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {highlights.map((highlight, index) => (
                  <motion.div
                    key={`${highlight}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="bg-blue-50 rounded-lg p-3 text-center"
                  >
                    <div className="text-sm font-medium text-blue-900">{highlight}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Map */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
            <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
              <DestinationMap
                coordinates={destination.coordinates}
                name={destination.name}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
