"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebarItineraryActivityRight } from "@/components/sidebar/appSidebar/appSidebarItineraryActivityRight";
import { useMapStore } from "@/store/mapStore";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isMapView } = useMapStore();

  return (
    <div className="flex h-full w-full">
      {/* Desktop layout */}
      <div className="hidden lg:flex lg:flex-col w-full h-full">
        <main className="flex-1 flex flex-col w-full h-full bg-muted">
          <div className="flex-1 h-full overflow-auto">{children}</div>
        </main>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col w-full h-full">
        <SidebarProvider defaultOpen={false} className="flex w-full h-full">
          <main className="flex-1 flex flex-col w-full h-full overflow-hidden bg-muted">
            <div className="flex-1 h-full overflow-auto">{children}</div>
          </main>
          <div className="sm:hidden">{!isMapView && <AppSidebarItineraryActivityRight />}</div>
        </SidebarProvider>
      </div>
    </div>
  );
}
