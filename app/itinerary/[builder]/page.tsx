import React, { ReactNode } from "react";
import Image from "next/image";
import ItineraryCards from "@/components/cards/itineraryCards";

import BuilderLayout from "@/components/layouts/builderLayout";

export default function Builder() {
  return (
    <div>
      <BuilderLayout title="Overview" activePage="overview" itineraryNumber={1}>
        <div className="m-4 border rounded-lg h-40">
          <Image
            src="/map2.jpg"
            alt="Image"
            width="1920"
            height="1080"
            className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale rounded-lg"
          />
          <div className="pt-8">
            <div className="text-lg font-bold">Itinerary Builder</div>
          </div>
          <div className="py-4">
            <ItineraryCards />
          </div>
        </div>
      </BuilderLayout>
    </div>
  );
}
