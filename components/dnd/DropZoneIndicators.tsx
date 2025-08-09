"use client";

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Zap, 
  Calendar,
  ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useDragContext } from './DragProvider';

interface DropZoneIndicatorProps {
  isValidDrop: boolean;
  isActive: boolean;
  reason?: string;
  timeSlot: string;
  date: Date;
  conflictingActivities?: Array<{
    id: string;
    name: string;
    time: string;
  }>;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Visual indicator for drop zones that shows validation state
 */
export function DropZoneIndicator({
  isValidDrop,
  isActive,
  reason,
  timeSlot,
  date,
  conflictingActivities,
  className,
  children
}: DropZoneIndicatorProps) {
  const dragContext = useDragContext();
  
  // Don't render if no drag is active
  if (!dragContext.state.isDragging) {
    return <>{children}</>;
  }

  return (
    <div className={cn(
      "relative transition-all duration-200",
      isActive && "ring-2 ring-offset-2",
      isValidDrop 
        ? "ring-green-400 bg-green-50" 
        : "ring-red-400 bg-red-50",
      className
    )}>
      {children}
      
      {/* Drop zone overlay */}
      <div className={cn(
        "absolute inset-0 pointer-events-none z-10",
        "flex items-center justify-center",
        "transition-all duration-200",
        isActive ? "opacity-100" : "opacity-0",
      )}>
        {/* Valid drop indicator */}
        {isValidDrop ? (
          <div className="bg-green-100 border border-green-300 rounded-lg p-2 shadow-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="text-xs">
                <div className="font-medium text-green-800">
                  {formatTime(timeSlot)}
                </div>
                <div className="text-green-600">
                  {format(date, 'MMM d')}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Invalid drop indicator */
          <div className="bg-red-100 border border-red-300 rounded-lg p-2 shadow-sm max-w-[200px]">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <div className="text-xs">
                <div className="font-medium text-red-800">Cannot drop</div>
                {reason && (
                  <div className="text-red-600 line-clamp-2">
                    {reason}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Conflict indicators */}
      {!isValidDrop && conflictingActivities && conflictingActivities.length > 0 && (
        <div className="absolute top-1 right-1 z-20">
          <Badge variant="destructive" className="text-xs">
            {conflictingActivities.length} conflict{conflictingActivities.length > 1 ? 's' : ''}
          </Badge>
        </div>
      )}
      
      {/* Animation pulse for valid zones */}
      {isValidDrop && isActive && (
        <div className="absolute inset-0 bg-green-200 opacity-30 rounded animate-pulse pointer-events-none" />
      )}
    </div>
  );
}

/**
 * Snap preview that shows exactly where an item will be placed
 */
export function SnapPreview({
  targetSlot,
  draggedItem,
  isVisible,
  className
}: {
  targetSlot: { date: Date; timeSlot: string };
  draggedItem: any;
  isVisible: boolean;
  className?: string;
}) {
  if (!isVisible) return null;

  const activity = draggedItem?.data?.activity || draggedItem?.data;
  const duration = draggedItem?.data?.estimatedDuration || 60;

  return (
    <div className={cn(
      "absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-200",
      "border-2 border-blue-400 border-dashed rounded-lg",
      "flex flex-col items-center justify-center pointer-events-none z-20",
      "animate-in fade-in-0 zoom-in-95 duration-300",
      className
    )}>
      {/* Drop arrow */}
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
        <ArrowDown className="h-4 w-4 text-blue-600 animate-bounce" />
      </div>
      
      {/* Activity preview */}
      <div className="bg-white rounded-lg p-2 shadow-sm border border-blue-300 max-w-[140px]">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Clock className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-800">
              {formatTime(targetSlot.timeSlot)}
            </span>
          </div>
          
          <div className="text-xs text-blue-700 font-medium truncate mb-1">
            {activity?.name || 'New Activity'}
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-xs text-blue-600">
            <Badge variant="outline" className="text-xs px-1 py-0">
              {formatDuration(duration)}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Grid overlay that highlights all valid/invalid drop zones
 */
export function DropZoneOverlay({
  validZones,
  invalidZones,
  activeZone,
  className
}: {
  validZones: Set<string>;
  invalidZones: Set<string>;
  activeZone?: string;
  className?: string;
}) {
  const dragContext = useDragContext();
  
  if (!dragContext.state.isDragging) return null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none z-5", className)}>
      {/* Valid zones highlight */}
      {Array.from(validZones).map((zoneId) => (
        <div
          key={`valid-${zoneId}`}
          data-zone-id={zoneId}
          className={cn(
            "absolute bg-green-100 bg-opacity-50 border border-green-300 rounded",
            "transition-all duration-200",
            activeZone === zoneId && "bg-opacity-70 ring-2 ring-green-400"
          )}
        />
      ))}
      
      {/* Invalid zones highlight */}
      {Array.from(invalidZones).map((zoneId) => (
        <div
          key={`invalid-${zoneId}`}
          data-zone-id={zoneId}
          className={cn(
            "absolute bg-red-100 bg-opacity-30 border border-red-300 rounded",
            "transition-all duration-200",
            activeZone === zoneId && "bg-opacity-50 ring-2 ring-red-400"
          )}
        />
      ))}
    </div>
  );
}

/**
 * Activity block ghost that shows the original position during drag
 */
export function DragGhost({
  isVisible,
  position,
  size,
  className
}: {
  isVisible: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  className?: string;
}) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "absolute bg-gray-200 bg-opacity-60 border-2 border-gray-300 border-dashed rounded",
        "pointer-events-none z-5 transition-opacity duration-200",
        className
      )}
      style={{
        left: position?.x,
        top: position?.y,
        width: size?.width,
        height: size?.height
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
          Original position
        </div>
      </div>
    </div>
  );
}

/**
 * Suggested time slots indicator
 */
export function SuggestedTimesIndicator({
  suggestedTimes,
  onSelectTime,
  className
}: {
  suggestedTimes: Array<{
    timeSlot: string;
    date: Date;
    score: number;
  }>;
  onSelectTime?: (time: { timeSlot: string; date: Date }) => void;
  className?: string;
}) {
  const dragContext = useDragContext();
  
  if (!dragContext.state.isDragging || suggestedTimes.length === 0) return null;

  return (
    <div className={cn(
      "absolute top-2 right-2 bg-blue-50 border border-blue-200 rounded-lg p-2 shadow-sm z-30",
      "animate-in slide-in-from-right-2 duration-300",
      className
    )}>
      <div className="flex items-center space-x-1 mb-2">
        <Zap className="h-3 w-3 text-blue-600" />
        <span className="text-xs font-medium text-blue-800">
          Suggested times
        </span>
      </div>
      
      <div className="space-y-1">
        {suggestedTimes.slice(0, 3).map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelectTime?.(suggestion)}
            className={cn(
              "w-full text-left px-2 py-1 text-xs rounded hover:bg-blue-100",
              "transition-colors duration-150"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-800">
                {formatTime(suggestion.timeSlot)}
              </span>
              <div className="flex items-center space-x-1">
                <div 
                  className="w-2 h-2 bg-green-400 rounded-full"
                  style={{ opacity: suggestion.score / 100 }}
                />
                <span className="text-blue-600">
                  {Math.round(suggestion.score)}%
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Real-time conflict indicator that appears during drag
 */
export function ConflictIndicator({
  conflicts,
  position,
  className
}: {
  conflicts: Array<{
    id: string;
    name: string;
    time: string;
    severity: 'warning' | 'error';
  }>;
  position?: { x: number; y: number };
  className?: string;
}) {
  if (conflicts.length === 0) return null;

  return (
    <div 
      className={cn(
        "absolute bg-amber-50 border border-amber-300 rounded-lg p-2 shadow-lg z-40",
        "animate-in fade-in-0 zoom-in-95 duration-200 min-w-[200px]",
        className
      )}
      style={{
        left: position?.x,
        top: position?.y
      }}
    >
      <div className="flex items-center space-x-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800">
          Scheduling Conflicts
        </span>
      </div>
      
      <div className="space-y-1">
        {conflicts.map((conflict, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center space-x-2 p-1 rounded",
              conflict.severity === 'error' 
                ? "bg-red-100 text-red-800" 
                : "bg-amber-100 text-amber-800"
            )}
          >
            <Calendar className="h-3 w-3" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">
                {conflict.name}
              </div>
              <div className="text-xs opacity-75">
                {conflict.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Utility functions
function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  
  if (minutes === 0) {
    return `${displayHour} ${period}`;
  }
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}