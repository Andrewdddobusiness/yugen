"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarItinerary } from "@/components/sidebar/appSidebar/appSidebarItinerary";
import { AppSidebarItineraryActivity } from "@/components/sidebar/appSidebar/appSidebarItineraryActivity";
import { useSidebarStore } from "@/store/sidebarStore";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { setIsSidebarLeftOpen } = useSidebarStore();
  return (
    <div className="flex w-full">
      <SidebarProvider panelType={"left"}>
        <AppSidebarItinerary />

        <main className="flex flex-col flex-1 min-h-[calc(100vh_-_theme(spacing.16))] bg-muted relative">
          <SidebarTrigger className="mt-2 shadow-md rounded-l-none bg-white absolute top-0 left-0 z-10" />
          {children}
        </main>
      </SidebarProvider>
    </div>
  );
}
