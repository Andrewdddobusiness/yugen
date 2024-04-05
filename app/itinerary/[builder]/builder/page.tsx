"use client";
import React from "react";
import BuilderLayout from "@/components/layouts/builderLayout";
import DragDropCalendar from "@/components/calendar/calendar";
import MapBox from "@/components/map/mapbox";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function Builder() {
  return (
    <div>
      <BuilderLayout title="Builder" activePage="builder" itineraryNumber={1}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel className="p-4 border-b">
            <DragDropCalendar />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel maxSize={50} minSize={20} className="hidden sm:block">
            <MapBox />
          </ResizablePanel>
        </ResizablePanelGroup>
      </BuilderLayout>
    </div>
  );
}
