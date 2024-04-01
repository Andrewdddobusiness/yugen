import React, { ReactNode } from "react";
import Image from "next/image";
import ItineraryCards from "@/components/cards/itineraryCards";

import DashboardLayout from "@/components/layouts/dashboardLayout";

export default function Dashboard() {
  return (
    <div>
      <DashboardLayout title="Dashboard" activePage="home">
        <div className="m-4 border rounded-lg h-40">
          <Image
            src="/map2.jpg"
            alt="Image"
            width="1920"
            height="1080"
            className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale rounded-lg"
          />
          <div className="pt-8">
            <div className="text-lg font-bold">My Itineraries</div>
          </div>
          <div className="py-4">
            <ItineraryCards />
          </div>
        </div>
      </DashboardLayout>
    </div>
  );
}
