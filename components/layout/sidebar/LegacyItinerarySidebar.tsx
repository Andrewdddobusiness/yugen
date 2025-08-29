"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ItinerarySidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function ItinerarySidebar({
  isCollapsed = false,
  onToggleCollapse,
  className
}: ItinerarySidebarProps) {
  return (
    <div className={cn(
      "relative bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col",
      isCollapsed ? "w-12" : "w-80",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900">Itinerary</h2>
          </div>
        )}
        
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              <p className="text-sm text-gray-500 text-center">
                Simplified itinerary view coming soon
              </p>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Collapsed State */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center justify-start pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Itinerary"
            onClick={onToggleCollapse}
          >
            <Calendar className="h-4 w-4 text-blue-500" />
          </Button>
        </div>
      )}
    </div>
  );
}