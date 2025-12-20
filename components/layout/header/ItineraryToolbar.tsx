"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Download, Share, Users } from "lucide-react";

interface ItineraryToolbarProps {
  itineraryId?: string;
  currentView: "table" | "calendar" | "list";
  onViewChange: (view: "table" | "calendar" | "list") => void;
  showMap: boolean;
  onToggleMap: () => void;
  timeRange: "day" | "week";
  onTimeRangeChange: (range: "day" | "week") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: any;
  onFilterChange: (filters: any) => void;
  onAddActivity: () => void;
}

const ShareExportDialog = dynamic(
  () => import("@/components/dialog/export/ShareExportDialog").then((mod) => mod.ShareExportDialog),
  { ssr: false }
);

export default function ItineraryToolbar({
  itineraryId,
  currentView,
  onViewChange,
  showMap,
  onToggleMap,
  onAddActivity,
}: ItineraryToolbarProps) {
  const [showExportDialog, setShowExportDialog] = React.useState(false);

  return (
    <div className="h-12 border-b bg-white px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant={currentView === "list" ? "default" : "ghost"} onClick={() => onViewChange("list")}>
          List
        </Button>
        <Button variant={currentView === "table" ? "default" : "ghost"} onClick={() => onViewChange("table")}>
          Table
        </Button>
        <Button variant={currentView === "calendar" ? "default" : "ghost"} onClick={() => onViewChange("calendar")}>
          Calendar
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToggleMap}>
          {showMap ? "Hide Map" : "Show Map"}
        </Button>
        <Button size="sm" onClick={onAddActivity}>
          Add Activity
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShowExportDialog(true)}>
          <Share className="h-4 w-4" />
        </Button>
        <ShareExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} itineraryId={itineraryId} />
      </div>
    </div>
  );
}
