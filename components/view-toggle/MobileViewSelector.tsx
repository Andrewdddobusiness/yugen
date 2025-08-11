"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar, Table, List, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";

export type ViewMode = 'calendar' | 'table' | 'list';

interface ViewConfig {
  id: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const viewConfigs: ViewConfig[] = [
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    description: 'Timeline view with drag & drop',
    color: 'bg-blue-500'
  },
  {
    id: 'table',
    label: 'Table',
    icon: Table,
    description: 'Detailed data view',
    color: 'bg-green-500'
  },
  {
    id: 'list',
    label: 'List',
    icon: List,
    description: 'Simple day-by-day view',
    color: 'bg-purple-500'
  }
];

interface MobileViewSelectorProps {
  className?: string;
  onViewChange?: (view: ViewMode) => void;
}

export function MobileViewSelector({ 
  className, 
  onViewChange 
}: MobileViewSelectorProps) {
  const { currentView, setCurrentView, isTransitioningView } = useItineraryLayoutStore();
  const [isOpen, setIsOpen] = useState(false);

  const currentConfig = viewConfigs.find(config => config.id === currentView);
  const CurrentIcon = currentConfig?.icon || Calendar;

  const handleViewChange = (view: ViewMode) => {
    if (view === currentView || isTransitioningView) return;
    
    setCurrentView(view);
    onViewChange?.(view);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Current View Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTransitioningView}
        className={cn(
          "w-full justify-between h-12 px-4 text-left",
          "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
          "hover:bg-gray-50 dark:hover:bg-gray-700",
          "transition-all duration-200"
        )}
      >
        <div className="flex items-center space-x-3">
          {isTransitioningView ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <CurrentIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          )}
          <div className="flex flex-col items-start">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {currentConfig?.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {currentConfig?.description}
            </span>
          </div>
        </div>
        
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </Button>

      {/* Dropdown Options */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Options Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                duration: 0.3, 
                bounce: 0.1 
              }}
              className={cn(
                "absolute top-full left-0 right-0 mt-2 z-50",
                "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700",
                "shadow-xl shadow-black/10 dark:shadow-black/30"
              )}
            >
              <div className="p-2 space-y-1">
                {viewConfigs.map((config) => {
                  const Icon = config.icon;
                  const isActive = currentView === config.id;
                  
                  return (
                    <motion.button
                      key={config.id}
                      onClick={() => handleViewChange(config.id)}
                      disabled={isTransitioningView}
                      className={cn(
                        "w-full flex items-center space-x-3 p-3 rounded-lg",
                        "text-left transition-all duration-200",
                        "hover:bg-gray-50 dark:hover:bg-gray-700",
                        isActive && "bg-gray-50 dark:bg-gray-700",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Icon with color indicator */}
                      <div className="relative">
                        <Icon 
                          className={cn(
                            "h-5 w-5 transition-colors duration-200",
                            isActive 
                              ? "text-gray-900 dark:text-gray-100" 
                              : "text-gray-600 dark:text-gray-300"
                          )} 
                        />
                        {isActive && (
                          <motion.div
                            layoutId="mobileActiveIndicator"
                            className={cn("absolute -inset-1 rounded-full opacity-20", config.color)}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "font-medium transition-colors duration-200",
                            isActive 
                              ? "text-gray-900 dark:text-gray-100" 
                              : "text-gray-700 dark:text-gray-200"
                          )}>
                            {config.label}
                          </span>
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="ml-2"
                            >
                              <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </motion.div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {config.description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              
              {/* Close hint */}
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  Tap outside to close
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}