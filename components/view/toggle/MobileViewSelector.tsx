"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar, Table, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";

export type ViewMode = 'calendar' | 'table' | 'list';

interface ViewConfig {
  id: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const viewConfigs: ViewConfig[] = [
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    description: 'Timeline view with drag & drop'
  },
  {
    id: 'table',
    label: 'Table',
    icon: Table,
    description: 'Detailed data view'
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

  const safeCurrentView = currentView === 'list' ? 'table' : currentView;
  const currentConfig = viewConfigs.find(config => config.id === safeCurrentView);
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
          "bg-bg-0/90 backdrop-blur-sm border-stroke-200 shadow-sm",
          "hover:bg-bg-50",
          "dark:bg-ink-900/40 dark:border-white/10 dark:hover:bg-white/5",
          "transition-all duration-200"
        )}
      >
        <div className="flex items-center space-x-3">
          {isTransitioningView ? (
            <div className="w-5 h-5 border-2 border-stroke-200 border-t-brand-500 rounded-full animate-spin" />
          ) : (
            <CurrentIcon className="h-5 w-5 text-brand-500" />
          )}
          <div className="flex flex-col items-start">
            <span className="font-medium text-ink-900 dark:text-white/90">
              {currentConfig?.label}
            </span>
            <span className="text-xs text-ink-500 dark:text-white/60">
              {currentConfig?.description}
            </span>
          </div>
        </div>
        
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-ink-500 transition-transform duration-200 dark:text-white/60",
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
                "glass rounded-xl"
              )}
            >
              <div className="p-2 space-y-1">
                {viewConfigs.map((config) => {
                  const Icon = config.icon;
                  const isActive = safeCurrentView === config.id;
                  
                  return (
                    <motion.button
                      key={config.id}
                      onClick={() => handleViewChange(config.id)}
                      disabled={isTransitioningView}
                      className={cn(
                        "w-full flex items-center space-x-3 p-3 rounded-lg",
                        "text-left transition-all duration-200",
                        "hover:bg-bg-50 dark:hover:bg-white/5",
                        isActive && "bg-brand-500/10",
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
                              ? "text-brand-500" 
                              : "text-ink-500 dark:text-white/70"
                          )} 
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "font-medium transition-colors duration-200",
                            isActive 
                              ? "text-ink-900 dark:text-white/90" 
                              : "text-ink-700 dark:text-white/80"
                          )}>
                            {config.label}
                          </span>
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="ml-2"
                            >
                              <Check className="h-4 w-4 text-brand-500" />
                            </motion.div>
                          )}
                        </div>
                        <p className="text-sm text-ink-500 dark:text-white/60 truncate">
                          {config.description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              
              {/* Close hint */}
              <div className="px-4 py-2 border-t border-stroke-200/60 dark:border-white/10">
                <p className="text-xs text-ink-500 dark:text-white/50 text-center">
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
