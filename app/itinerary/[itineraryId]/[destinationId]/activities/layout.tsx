"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarItineraryActivityRight } from "@/components/sidebar/appSidebar/appSidebarItineraryActivityRight";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full">
      {/* Desktop layout */}
      <div className="hidden lg:flex lg:flex-col w-full h-full">
        <main className="flex-1 flex flex-col w-full h-full bg-muted">
          <div className="flex-1 h-full overflow-auto">{children}</div>
        </main>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col w-full h-full">
        <SidebarProvider defaultOpen={false}>
          <main className="flex-1 flex flex-col w-full h-full overflow-hidden bg-muted">
            <SidebarTrigger className="shadow-md rounded-r-none bg-white fixed top-16 right-0 z-20" />
            <div className="flex-1 h-full overflow-auto">{children}</div>
          </main>
          <AppSidebarItineraryActivityRight />
        </SidebarProvider>
      </div>
    </div>
  );
}
