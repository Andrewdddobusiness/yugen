"use client";

import React, { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Table, List, Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { MobileViewSelector } from "./MobileViewSelector";

export type ViewMode = "calendar" | "table" | "list";

interface ViewConfig {
  id: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  keyboardShortcut: string;
  recommendedFor: string[];
}

const viewConfigs: ViewConfig[] = [
  {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
    description: "Visual timeline with drag-and-drop scheduling",
    keyboardShortcut: "Ctrl+1",
    recommendedFor: ["time-based-planning", "visual-organization"],
  },
  {
    id: "table",
    label: "Table",
    icon: Table,
    description: "Structured data view with sorting and filtering",
    keyboardShortcut: "Ctrl+2",
    recommendedFor: ["detailed-planning", "data-analysis"],
  },
  {
    id: "list",
    label: "List",
    icon: List,
    description: "Simple day-by-day itinerary view",
    keyboardShortcut: "Ctrl+3",
    recommendedFor: ["quick-overview", "mobile-viewing"],
  },
];

interface ViewToggleProps {
  className?: string;
  showMapToggle?: boolean;
  isTransitioning?: boolean;
  onViewChange?: (view: ViewMode, date?: Date | null) => void | Promise<void>;
  onDateChange?: (date: Date | null, pushHistory?: boolean) => void;
  currentDate?: Date | null;
  isMobile?: boolean;
}

export function ViewToggle({
  className,
  showMapToggle = true,
  isTransitioning = false,
  onViewChange,
  isMobile = false,
}: ViewToggleProps) {
  const { currentView, showMap, isTransitioningView, toggleMap } = useItineraryLayoutStore();

  const handleViewChange = useCallback(
    (view: ViewMode) => {
      if (view === currentView || isTransitioning || isTransitioningView) return;
      onViewChange?.(view);
    },
    [currentView, isTransitioning, isTransitioningView, onViewChange]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      switch (event.key) {
        case "1":
          event.preventDefault();
          handleViewChange("calendar");
          break;
        case "2":
          event.preventDefault();
          handleViewChange("table");
          break;
        case "3":
          event.preventDefault();
          handleViewChange("list");
          break;
        case "m":
          event.preventDefault();
          toggleMap();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleViewChange, toggleMap]);

  if (isMobile) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1 max-w-xs">
          <MobileViewSelector onViewChange={onViewChange} />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center bg-bg-100 dark:bg-ink-900 rounded-xl p-1 border border-stroke-200/70 dark:border-white/10">
          {viewConfigs.map((config) => {
            const Icon = config.icon;
            const isActive = currentView === config.id;

            return (
              <Tooltip key={config.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isTransitioning || isTransitioningView}
                    onClick={() => handleViewChange(config.id)}
                    className={cn(
                      "relative transition-colors duration-200 bg-transparent hover:bg-transparent",
                      isActive
                        ? "text-brand-500"
                        : "text-ink-500 dark:text-white/60 hover:text-ink-900 dark:hover:text-white"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeView"
                        className="absolute inset-0 bg-bg-0 dark:bg-white/10 shadow-sm rounded-[inherit]"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    {isTransitioning && isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center z-20"
                      >
                        <div className="w-4 h-4 border-2 border-stroke-200 border-t-brand-500 rounded-full animate-spin" />
                      </motion.div>
                    )}

                    <div className="relative z-10 flex items-center">
                      <Icon
                        className={cn(
                          "h-4 w-4 mr-2 transition-colors duration-200",
                          isActive ? "text-brand-500" : "currentColor",
                          isTransitioning && isActive && "opacity-0"
                        )}
                      />
                      <span
                        className={cn(
                          "transition-colors duration-200 font-medium",
                          isActive ? "text-ink-900 dark:text-white/90" : "currentColor",
                          isTransitioning && isActive && "opacity-0"
                        )}
                      >
                        {config.label}
                      </span>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{config.label}</p>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                    <p className="text-xs text-muted-foreground">Shortcut: {config.keyboardShortcut}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {showMapToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={showMap ? "default" : "outline"} size="sm" onClick={toggleMap}>
                {showMap ? <X className="h-4 w-4 mr-2" /> : <Map className="h-4 w-4 mr-2" />}
                {showMap ? "Hide Map" : "Show Map"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showMap ? "Hide" : "Show"} map panel (Ctrl+M)</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
