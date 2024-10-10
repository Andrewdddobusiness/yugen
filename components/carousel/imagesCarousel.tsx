import React, { useState } from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from "../ui/carousel";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageCarouselProps {
  images: { name: string }[];
  showButtons?: boolean;
  apiKey: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  showButtons = false,
  apiKey,
}) => {
  const [api, setApi] = useState<CarouselApi>();

  const scrollPrev = () => api?.scrollPrev();
  const scrollNext = () => api?.scrollNext();

  return (
    <div className="relative w-full">
      <Carousel className={`w-full ${showButtons ? "" : ""}`} setApi={setApi}>
        {showButtons && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <CarouselContent>
          {images.map((photo, index) => (
            <CarouselItem key={index}>
              <Image
                src={`https://places.googleapis.com/v1/${photo.name}/media?key=${apiKey}&maxHeightPx=1000&maxWidthPx=1000`}
                alt={`Image ${index}`}
                width={1000}
                height={1000}
                className="h-80 w-full rounded-md object-cover"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {showButtons && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 h-10 w-10"
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
