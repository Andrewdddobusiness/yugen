import React, { useState } from "react";
import Image from "next/image";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "../ui/carousel";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface IImageCarouselProps {
  photoNames: string[];
  showButtons?: boolean;
}

const ImageCarousel: React.FC<IImageCarouselProps> = ({ photoNames, showButtons = false }) => {
  const [api, setApi] = useState<CarouselApi>();
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});

  const scrollPrev = () => api?.scrollPrev();
  const scrollNext = () => api?.scrollNext();

  // Function to generate proper Google Places photo URL
  const getPhotoUrl = (photoName: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_URL || "https://places.googleapis.com/v1";
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    return `${baseUrl}/${photoName}/media?key=${apiKey}&maxHeightPx=1000&maxWidthPx=1000`;
  };

  return (
    <div className="relative w-full">
      <Carousel className={`w-full ${showButtons ? "" : ""}`} setApi={setApi}>
        {showButtons && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10 opacity-50 hover:opacity-90 transition-opacity duration-300"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <CarouselContent>
          {photoNames.map((photoName: string, index: number) => (
            <CarouselItem key={index}>
              <div className="relative h-80 w-full">
                <Image
                  src={getPhotoUrl(photoName)}
                  alt={`Image ${index + 1}`}
                  fill
                  className="rounded-md object-cover"
                  onError={() => {
                    setImageError((prev) => ({ ...prev, [photoName]: true }));
                    console.error(`Failed to load image: ${photoName}`);
                  }}
                  unoptimized // Bypass Next.js image optimization for external URLs
                  // Add referrer policy
                  referrerPolicy="strict-origin-when-cross-origin"
                />
                {imageError[photoName] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
                    <p className="text-gray-500">Image failed to load</p>
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {showButtons && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10 opacity-50 hover:opacity-90 transition-opacity duration-300"
            onClick={scrollNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </Carousel>
    </div>
  );
};

export default ImageCarousel;
