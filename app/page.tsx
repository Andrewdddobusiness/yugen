"use client";
import NavLayout from "@/components/layouts/navLayout";
import PageLayout from "@/components/layouts/pageLayout";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <NavLayout>
      <PageLayout>
        <div className="pt-12 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2">
            <div className="text-center md:text-left">
              <div className="text-4xl sm:text-6xl font-bold mb-4">
                Planning Vacations S*ck!
              </div>
              <div className="text-lg mb-4">
                Build, personalize, and optimize your itineraries with our AI
                trip planner.
              </div>
              <div className="mb-4">
                <Button size="sm" className="text-sm">
                  Create a travel itinerary
                </Button>
              </div>
            </div>
          </div>
          <div className="md:w-1/2 mt-8 flex justify-center">
            <div>
              <Image
                src="/Globalization.png"
                alt="globalization"
                width={500}
                height={500}
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      </PageLayout>
    </NavLayout>
  );
}
