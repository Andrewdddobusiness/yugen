"use client";

import { Button } from "@/components/ui/button";
import { Map, List } from "lucide-react";
import { cn } from "@/components/lib/utils";

interface ViewToggleButtonProps {
  isMapView: boolean;
  onToggle: () => void;
}

export function ViewToggleButton({ isMapView, onToggle }: ViewToggleButtonProps) {
  return (
    <Button
      onClick={onToggle}
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-full shadow-lg sm:hidden",
        "bg-[#3A86FF] hover:bg-[#3A86FF]/90 text-white"
      )}
      size="icon"
    >
      {isMapView ? <List className="h-5 w-5" /> : <Map className="h-5 w-5" />}
    </Button>
  );
}
