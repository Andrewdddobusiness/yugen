"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarItineraryActivityRight } from "@/components/sidebar/appSidebar/appSidebarItineraryActivityRight";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full">
      {/* Only show on mobile screens (below lg breakpoint) */}
      <div className="lg:hidden w-full">
        <SidebarProvider panelType={"right"} defaultOpen={false}>
          <main className="flex-1 flex flex-col w-full h-full bg-muted">
            <SidebarTrigger className="shadow-md rounded-r-none bg-white absolute top-16 right-0 z-20" />
            <div className="flex-1 h-full">{children}</div>
          </main>

          <AppSidebarItineraryActivityRight />
        </SidebarProvider>
      </div>

      {/* Show content without sidebar on desktop */}
      <div className="hidden lg:block w-full">
        <main className="flex-1 flex flex-col w-full h-full bg-muted">
          <div className="flex-1 h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
