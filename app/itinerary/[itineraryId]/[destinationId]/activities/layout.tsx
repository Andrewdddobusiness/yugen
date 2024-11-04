"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarItinerary } from "@/components/sidebar/appSidebar/appSidebarItinerary";
import { AppSidebarItineraryActivity } from "@/components/sidebar/appSidebar/appSidebarItineraryActivity";
import { useActivitiesStore } from "@/store/activityStore";
import { useSidebarStore } from "@/store/sidebarStore";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full">
      <SidebarProvider panelType={"right"} defaultOpen={false}>
        <main className="flex flex-col flex-1 h-screen bg-muted relative">
          <SidebarTrigger className="mt-2 shadow-md rounded-r-none bg-white absolute top-0 right-0 z-10" />
          <div className="Ww-full h-full">{children}</div>
        </main>

        <AppSidebarItineraryActivity />
      </SidebarProvider>
    </div>
  );
}
