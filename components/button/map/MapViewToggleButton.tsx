"use client";

import { Button } from "@/components/ui/button";
import { Map, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewToggleButtonProps {
  isMapView: boolean;
  onToggle: () => void;
}

export function ViewToggleButton({ isMapView, onToggle }: ViewToggleButtonProps) {
  return (
    <Button
      onClick={onToggle}
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-full shadow-lg sm:hidden border-2 border-white active:scale-95 transition-all duration-300 ease-in-out",
        "bg-[#3F5FA3] hover:bg-[#3F5FA3]/90 text-white overflow-hidden"
      )}
      size="icon"
    >
      <div className="relative w-5 h-5">
        <Map
          className={cn(
            "h-5 w-5 absolute top-0 left-0 transition-all duration-300",
            isMapView ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
          )}
        />
        <List
          className={cn(
            "h-5 w-5 absolute top-0 left-0 transition-all duration-300",
            isMapView ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
          )}
        />
      </div>
    </Button>
  );
}
