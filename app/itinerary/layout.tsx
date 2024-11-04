"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarItineraryActivityLeft } from "@/components/sidebar/appSidebar/appSidebarItineraryActivityLeft";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full">
      <SidebarProvider panelType={"left"}>
        <AppSidebarItineraryActivityLeft />

        <main className="flex flex-col flex-1 min-h-[calc(100vh_-_theme(spacing.16))] bg-muted relative">
          <SidebarTrigger className="mt-2 shadow-md rounded-l-none bg-white absolute top-0 left-0 z-10" />
          {children}
        </main>
      </SidebarProvider>
    </div>
  );
}
