"use client";

import React, { useState, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, MapPin, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduledActivity {
  id: string;
  activityId: string;
  placeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  position: { day: number; startSlot: number; span: number };
  activity?: {
    name: string;
    address?: string;
    coordinates?: [number, number];
  };
}

interface ActivityBlockProps {
  activity: ScheduledActivity;
  isOverlay?: boolean;
  className?: string;
  onResize?: (activityId: string, newDuration: number, resizeDirection: 'top' | 'bottom') => void;
}

export function ActivityBlock({
  activity,
  isOverlay = false,
  className,
  onResize
}: ActivityBlockProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'top' | 'bottom' | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: activity.id,
    disabled: isOverlay || isResizing
  });

  const handleResizeStart = useCallback((direction: 'top' | 'bottom') => {
    setIsResizing(true);
    setResizeDirection(direction);
    
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new duration based on mouse movement
      // This is a simplified version - in a real implementation you'd need to:
      // 1. Calculate the mouse position relative to the calendar grid
      // 2. Convert to time slots
      // 3. Update the activity duration accordingly
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleResizeTopMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleResizeStart('top');
  }, [handleResizeStart]);

  const handleResizeBottomMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleResizeStart('bottom');
  }, [handleResizeStart]);

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const minute = minutes;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const getDurationText = (duration: number) => {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  // Generate color based on activity type or use a default palette
  const getActivityColor = (activityId: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-teal-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    
    // Simple hash to get consistent color for same activity
    const hash = activityId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const activityColor = getActivityColor(activity.activityId || activity.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "relative rounded-lg shadow-sm border-l-4 overflow-hidden transition-all group",
        !isResizing && "cursor-move",
        isResizing && "cursor-ns-resize",
        "hover:shadow-md active:shadow-lg",
        isDragging && "opacity-50 rotate-1 shadow-xl",
        isResizing && "shadow-lg ring-2 ring-blue-300",
        isOverlay && "shadow-2xl border-2 border-white",
        activityColor.replace('bg-', 'border-l-'),
        "bg-white",
        className
      )}
      role="button"
      tabIndex={0}
      aria-label={`Move ${activity.activity?.name || 'activity'} scheduled for ${formatTime(activity.startTime)}`}
    >
      {/* Drag Handle */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-3 w-3 text-gray-400" />
      </div>

      {/* Activity Content */}
      <div className="p-2 pr-6">
        {/* Activity Name */}
        <div className="font-medium text-sm text-gray-900 leading-tight mb-1 truncate">
          {activity.activity?.name || 'Untitled Activity'}
        </div>

        {/* Time and Duration */}
        <div className="flex items-center text-xs text-gray-600 mb-1">
          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">
            {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
          </span>
        </div>

        {/* Duration Badge */}
        <div className="flex items-center justify-between">
          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
            activityColor.replace('bg-', 'bg-').replace('500', '100'),
            activityColor.replace('bg-', 'text-').replace('500', '700')
          )}>
            {getDurationText(activity.duration)}
          </span>

          {/* Location indicator */}
          {activity.activity?.address && (
            <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
          )}
        </div>

        {/* Address (if space allows) */}
        {activity.activity?.address && activity.position.span >= 2 && (
          <div className="mt-1 text-xs text-gray-500 truncate">
            {activity.activity.address}
          </div>
        )}
      </div>

      {/* Resize Handles */}
      {!isOverlay && onResize && (
        <>
          <div 
            className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-blue-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onMouseDown={handleResizeTopMouseDown}
            title="Resize start time"
          />
          <div 
            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-blue-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onMouseDown={handleResizeBottomMouseDown}
            title="Resize end time"
          />
        </>
      )}

      {/* Status indicators */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
          <div className="text-blue-700 text-xs font-medium">Moving...</div>
        </div>
      )}
      
      {isResizing && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
          <div className="text-blue-700 text-xs font-medium">
            Resizing {resizeDirection === 'top' ? 'start time' : 'end time'}...
          </div>
        </div>
      )}
    </div>
  );
}