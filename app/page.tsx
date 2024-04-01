"use client";
import NavLayout from "@/components/layouts/navLayout";
import PageLayout from "@/components/layouts/pageLayout";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <NavLayout>
      <PageLayout>
        <div className="grid md:grid-cols-2 pt-12 ">
          <div className="flex-1 pt-24 text-center md:text-left z-50">
            <div className="text-6xl font-bold mb-4">
              Planning Vacations S*ck!
            </div>
            <div className="text-xl mb-4 ">
              Build, personalize, and optimize your itineraries with our AI trip
              planner.
            </div>
            <div className="mb-4">
              <Button size="sm" className="ml-auto gap-1.5 text-sm">
                Create a travel itinerary
              </Button>
            </div>
          </div>
          <div className="flex justify-center z-50">
            <div>
              <Image
                src="/Globalization.png"
                alt="globalization"
                width={500}
                height={500}
                className="max-w-lg"
              />
            </div>
          </div>
        </div>
      </PageLayout>
    </NavLayout>
  );
}
