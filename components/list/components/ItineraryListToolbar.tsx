"use client";

import React, { memo } from 'react';
import { CheckSquare2, Square, Grid3x3, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TravelTimeSettings } from '@/components/travel/TravelTimeSettings';
import type { TravelMode } from '@/actions/google/travelTime';

interface BulkSelectionActions {
  selectionMode: boolean;
  toggleSelectionMode: () => void;
}

interface ItineraryListToolbarProps {
  // Activity counts
  filteredCount: number;
  totalCount: number;
  dayCount: number;
  
  // View controls
  useTimeSlotView: boolean;
  onToggleTimeSlotView: () => void;
  onExpandAllDays: () => void;
  onCollapseAllDays: () => void;
  
  // Selection
  bulkSelectionActions: BulkSelectionActions;
  
  // Travel times
  travelModes: TravelMode[];
  onTravelModesChange: (modes: TravelMode[]) => void;
  onRefreshTravelTimes: () => void;
  
  // Mobile responsive
  isMobile?: boolean;
}

/**
 * ItineraryListToolbar - Controls and actions for the itinerary list view
 * 
 * Features:
 * - Activity count display with filtering status
 * - Bulk selection mode toggle
 * - Expand/collapse all controls
 * - Travel time settings
 * - Time slot view toggle
 * - Keyboard shortcuts reminder
 * - Mobile-optimized layout
 */
export const ItineraryListToolbar = memo<ItineraryListToolbarProps>(({
  filteredCount,
  totalCount,
  dayCount,
  useTimeSlotView,
  onToggleTimeSlotView,
  onExpandAllDays,
  onCollapseAllDays,
  bulkSelectionActions,
  travelModes,
  onTravelModesChange,
  onRefreshTravelTimes,
  isMobile = false,
}) => {
  const isFiltered = filteredCount !== totalCount;

  return (
    <div className="flex items-center justify-between" role="region" aria-label="Activity list controls">
      <div className="text-sm text-muted-foreground">
        {isFiltered 
          ? `Showing ${filteredCount} of ${totalCount} activities in ${dayCount} ${dayCount === 1 ? 'day' : 'days'}`
          : `${dayCount} ${dayCount === 1 ? 'day' : 'days'} with activities`
        }
      </div>
      
      <div className="flex items-center gap-2">
        {/* Selection Mode Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={bulkSelectionActions.toggleSelectionMode}
          className={cn(
            "text-xs flex items-center gap-1",
            bulkSelectionActions.selectionMode ? "bg-blue-100 text-blue-700" : "text-gray-600"
          )}
          title="Toggle selection mode (or select activities to auto-enable)"
        >
          {bulkSelectionActions.selectionMode ? (
            <CheckSquare2 className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          Select
        </Button>

        {/* Expand/Collapse Controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onExpandAllDays}
          className="text-xs"
          title="Expand all day sections (Ctrl+Shift+E)"
        >
          Expand All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCollapseAllDays}
          className="text-xs"
          title="Collapse all day sections (Ctrl+Shift+C)"
        >
          Collapse All
        </Button>

        {/* Travel Time Settings */}
        <TravelTimeSettings
          defaultModes={travelModes}
          onModesChange={onTravelModesChange}
          onRefresh={onRefreshTravelTimes}
        />

        {/* Time Slot View Toggle */}
        <Button
          variant={useTimeSlotView ? "default" : "outline"}
          size="sm"
          onClick={onToggleTimeSlotView}
          className="text-xs"
          title={useTimeSlotView ? "Switch to simple list view" : "Switch to time slot view"}
        >
          <Grid3x3 className="h-3 w-3 mr-1" />
          {useTimeSlotView ? "Time Slots" : "Time View"}
        </Button>

        {/* Keyboard Shortcuts Reminder */}
        <div className="text-xs text-muted-foreground pl-2 border-l" aria-label="Keyboard shortcuts">
          <span className="hidden sm:inline">Drag </span>
          <GripVertical className="inline h-3 w-3" aria-hidden="true" />
          <span className="hidden sm:inline"> or Alt+↑↓ to reorder</span>
          <span className="sm:hidden">Alt+↑↓ reorder</span>
        </div>
      </div>
    </div>
  );
});

ItineraryListToolbar.displayName = 'ItineraryListToolbar';