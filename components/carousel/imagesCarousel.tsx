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

interface IImageCarouselProps {
  photoNames: string[];
  showButtons?: boolean;
}

const ImageCarousel: React.FC<IImageCarouselProps> = ({
  photoNames,
  showButtons = false,
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
          {photoNames.map((photoName: string, index: number) => (
            <CarouselItem key={index}>
              <Image
                src={`https://places.googleapis.com/v1/${photoName}/media?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&maxHeightPx=1000&maxWidthPx=1000`}
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
