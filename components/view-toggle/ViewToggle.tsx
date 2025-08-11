"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar, Table, List, Map, X, Lightbulb, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { MobileViewSelector } from "./MobileViewSelector";

export type ViewMode = 'calendar' | 'table' | 'list';

interface ViewConfig {
  id: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  keyboardShortcut: string;
  recommendedFor: string[];
  color: string;
}

const viewConfigs: ViewConfig[] = [
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    description: 'Visual timeline with drag-and-drop scheduling',
    keyboardShortcut: 'Ctrl+1',
    recommendedFor: ['time-based-planning', 'visual-organization'],
    color: 'bg-blue-500'
  },
  {
    id: 'table',
    label: 'Table',
    icon: Table,
    description: 'Structured data view with sorting and filtering',
    keyboardShortcut: 'Ctrl+2',
    recommendedFor: ['detailed-planning', 'data-analysis'],
    color: 'bg-green-500'
  },
  {
    id: 'list',
    label: 'List',
    icon: List,
    description: 'Simple day-by-day itinerary view',
    keyboardShortcut: 'Ctrl+3',
    recommendedFor: ['quick-overview', 'mobile-viewing'],
    color: 'bg-purple-500'
  }
];

interface ViewToggleProps {
  className?: string;
  showMapToggle?: boolean;
  isTransitioning?: boolean;
  onViewChange?: (view: ViewMode, date?: Date | null) => void;
  onDateChange?: (date: Date | null) => void;
  currentDate?: Date | null;
  isMobile?: boolean;
}

export function ViewToggle({ 
  className, 
  showMapToggle = true, 
  isTransitioning = false,
  onViewChange,
  onDateChange,
  currentDate,
  isMobile = false
}: ViewToggleProps) {
  const { 
    currentView, 
    showMap, 
    viewHistory,
    defaultView,
    isTransitioningView,
    setCurrentView, 
    toggleMap,
    getViewRecommendation
  } = useItineraryLayoutStore();

  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState<ViewMode | null>(null);

  // Get current view config
  const currentConfig = viewConfigs.find(config => config.id === currentView);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            handleViewChange('calendar');
            break;
          case '2':
            event.preventDefault();
            handleViewChange('table');
            break;
          case '3':
            event.preventDefault();
            handleViewChange('list');
            break;
          case 'm':
            event.preventDefault();
            toggleMap();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMap]);

  // Handle view change with transition and error handling
  const handleViewChange = useCallback((view: ViewMode) => {
    if (view === currentView || isTransitioning || isTransitioningView) return;
    
    try {
      setCurrentView(view);
      onViewChange?.(view);

      // Show recommendation after view change
      setTimeout(() => {
        const rec = getViewRecommendation();
        if (rec && rec !== view) {
          setRecommendation(rec);
          setShowRecommendation(true);
          // Auto-hide recommendation after 5 seconds
          setTimeout(() => setShowRecommendation(false), 5000);
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to change view:', error);
      // Could add user-facing error notification here
    }
  }, [currentView, isTransitioning, isTransitioningView, setCurrentView, onViewChange, getViewRecommendation]);

  // Use mobile view selector on mobile devices
  if (isMobile) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1 max-w-xs">
          <MobileViewSelector onViewChange={onViewChange} />
        </div>
        
        {/* View Recommendation for Mobile */}
        <AnimatePresence>
          {showRecommendation && recommendation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-2 py-1"
            >
              <Lightbulb className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
              <button
                onClick={() => handleViewChange(recommendation)}
                className="text-xs font-medium text-yellow-800 dark:text-yellow-200 underline"
              >
                Try {viewConfigs.find(c => c.id === recommendation)?.label}
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecommendation(false)}
                className="h-auto p-0.5 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
              >
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Main View Toggle Buttons */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
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
                      "relative transition-all duration-200 hover:bg-white dark:hover:bg-gray-700",
                      isActive && "bg-white dark:bg-gray-700 shadow-sm"
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className={cn("absolute inset-0 rounded-md", config.color, "opacity-10")}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    {/* Loading spinner */}
                    {isTransitioning && isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      </motion.div>
                    )}
                    
                    <Icon className={cn(
                      "h-4 w-4 mr-2 transition-colors duration-200",
                      isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400",
                      isTransitioning && isActive && "opacity-0"
                    )} />
                    <span className={cn(
                      "transition-colors duration-200 font-medium",
                      isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400",
                      isTransitioning && isActive && "opacity-0"
                    )}>
                      {config.label}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{config.label}</p>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Shortcut: {config.keyboardShortcut}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* View Options Dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>View options and preferences</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>View Preferences</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Recent Views */}
            {viewHistory.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Recent Views
                </DropdownMenuLabel>
                {viewHistory.slice(0, 3).map((view, index) => {
                  const config = viewConfigs.find(c => c.id === view);
                  if (!config) return null;
                  const Icon = config.icon;
                  
                  return (
                    <DropdownMenuItem
                      key={`${view}-${index}`}
                      onClick={() => handleViewChange(view)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
              </>
            )}
            
            {/* Default View Setting */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Set as Default
            </DropdownMenuLabel>
            {viewConfigs.map((config) => {
              const Icon = config.icon;
              const isDefault = defaultView === config.id;
              
              return (
                <DropdownMenuItem
                  key={`default-${config.id}`}
                  onClick={() => useItineraryLayoutStore.getState().setDefaultView(config.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {config.label}
                  {isDefault && <Badge variant="secondary" className="ml-auto text-xs">Default</Badge>}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Map Toggle */}
        {showMapToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showMap ? 'default' : 'outline'}
                size="sm"
                onClick={toggleMap}
              >
                {showMap ? (
                  <X className="h-4 w-4 mr-2" />
                ) : (
                  <Map className="h-4 w-4 mr-2" />
                )}
                {showMap ? 'Hide Map' : 'Show Map'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showMap ? 'Hide' : 'Show'} map panel (Ctrl+M)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* View Recommendation */}
        <AnimatePresence>
          {showRecommendation && recommendation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2"
            >
              <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                Try{' '}
                <button
                  onClick={() => handleViewChange(recommendation)}
                  className="font-medium underline hover:no-underline"
                >
                  {viewConfigs.find(c => c.id === recommendation)?.label}
                </button>{' '}
                view for better planning
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecommendation(false)}
                className="h-auto p-1 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
              >
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}