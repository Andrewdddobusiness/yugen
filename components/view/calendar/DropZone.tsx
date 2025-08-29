"use client";

import React, { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Check, X, AlertCircle, Clock } from 'lucide-react';

export interface DropZoneData {
  dayIndex: number;
  timeSlot: string;
  date: Date;
  canDrop: boolean;
  conflicts?: Array<{
    type: 'overlap' | 'travel' | 'business_hours';
    message: string;
  }>;
}

interface DropZoneProps {
  data: DropZoneData;
  isDraggingOver?: boolean;
  isDraggingGlobal?: boolean;
  showIndicators?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface DropZoneIndicatorProps {
  type: 'valid' | 'invalid' | 'warning';
  message?: string;
  className?: string;
}

/**
 * Visual feedback for drop zones during drag operations
 */
export function DropZone({
  data,
  isDraggingOver = false,
  isDraggingGlobal = false,
  showIndicators = true,
  className,
  children
}: DropZoneProps) {
  const [dropState, setDropState] = useState<'idle' | 'valid' | 'invalid' | 'warning'>('idle');
  
  const { isOver, setNodeRef } = useDroppable({
    id: `dropzone-${data.dayIndex}-${data.timeSlot}`,
    data
  });

  useEffect(() => {
    if (!isDraggingGlobal) {
      setDropState('idle');
      return;
    }

    if (isOver || isDraggingOver) {
      if (!data.canDrop) {
        setDropState('invalid');
      } else if (data.conflicts && data.conflicts.length > 0) {
        setDropState('warning');
      } else {
        setDropState('valid');
      }
    } else {
      setDropState('idle');
    }
  }, [isOver, isDraggingOver, isDraggingGlobal, data.canDrop, data.conflicts]);

  const getDropZoneStyle = () => {
    const baseClasses = "relative transition-all duration-200";
    
    switch (dropState) {
      case 'valid':
        return cn(baseClasses, "bg-green-50 border-2 border-green-300 border-dashed");
      case 'invalid':
        return cn(baseClasses, "bg-red-50 border-2 border-red-300 border-dashed cursor-not-allowed");
      case 'warning':
        return cn(baseClasses, "bg-amber-50 border-2 border-amber-300 border-dashed");
      case 'idle':
      default:
        return cn(baseClasses, isDraggingGlobal ? "opacity-50" : "");
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(getDropZoneStyle(), className)}
      data-dropzone-state={dropState}
    >
      {/* Drop indicators */}
      {showIndicators && dropState !== 'idle' && (
        <DropZoneIndicator
          type={dropState}
          message={data.conflicts?.[0]?.message}
          className="absolute top-1 right-1 z-10"
        />
      )}
      
      {/* Overlay effect for active drop zones */}
      {dropState !== 'idle' && (
        <div className={cn(
          "absolute inset-0 pointer-events-none",
          dropState === 'valid' && "bg-green-500 bg-opacity-5",
          dropState === 'invalid' && "bg-red-500 bg-opacity-5",
          dropState === 'warning' && "bg-amber-500 bg-opacity-5"
        )} />
      )}
      
      {children}
    </div>
  );
}

/**
 * Drop zone indicator icons and messages
 */
export function DropZoneIndicator({
  type,
  message,
  className
}: DropZoneIndicatorProps) {
  const getIndicatorContent = () => {
    switch (type) {
      case 'valid':
        return {
          icon: <Check className="h-3 w-3" />,
          color: "text-green-600 bg-green-100",
          defaultMessage: "Drop here"
        };
      case 'invalid':
        return {
          icon: <X className="h-3 w-3" />,
          color: "text-red-600 bg-red-100",
          defaultMessage: "Cannot drop"
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          color: "text-amber-600 bg-amber-100",
          defaultMessage: "Conflicts detected"
        };
    }
  };

  const { icon, color, defaultMessage } = getIndicatorContent();

  return (
    <div className={cn(
      "flex items-center space-x-1 px-1.5 py-0.5 rounded text-xs font-medium",
      color,
      className
    )}>
      {icon}
      {message && (
        <span className="max-w-[120px] truncate">
          {message || defaultMessage}
        </span>
      )}
    </div>
  );
}

/**
 * Multi-slot drop zone for activities spanning multiple time slots
 */
export function MultiSlotDropZone({
  startData,
  endData,
  slots,
  isDraggingGlobal = false,
  className,
  children
}: {
  startData: DropZoneData;
  endData: DropZoneData;
  slots: number;
  isDraggingGlobal?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const canDropAll = startData.canDrop && endData.canDrop;
  const hasConflicts = (startData.conflicts?.length ?? 0) > 0 || (endData.conflicts?.length ?? 0) > 0;

  return (
    <div
      className={cn(
        "relative",
        isDraggingGlobal && "transition-all duration-200",
        isDraggingGlobal && canDropAll && !hasConflicts && "ring-2 ring-green-300",
        isDraggingGlobal && !canDropAll && "ring-2 ring-red-300 opacity-50",
        isDraggingGlobal && canDropAll && hasConflicts && "ring-2 ring-amber-300",
        className
      )}
      style={{ height: `${slots * 48}px` }} // 48px per slot
    >
      {/* Visual spanning indicator */}
      {isDraggingGlobal && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-0.5",
          canDropAll && !hasConflicts && "bg-green-400",
          !canDropAll && "bg-red-400",
          canDropAll && hasConflicts && "bg-amber-400"
        )} />
      )}
      
      {children}
    </div>
  );
}

/**
 * Drop zone preview showing where activity will be placed
 */
export function DropPreview({
  timeSlot,
  duration,
  activityName,
  className
}: {
  timeSlot: string;
  duration: number;
  activityName?: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "absolute pointer-events-none bg-blue-100 border-2 border-blue-300 border-dashed rounded p-2",
      "opacity-75 transition-opacity duration-150",
      className
    )}>
      <div className="flex items-center space-x-2 text-sm text-blue-700">
        <Clock className="h-3 w-3" />
        <span className="font-medium">{timeSlot}</span>
        <span className="text-xs">({duration}min)</span>
      </div>
      {activityName && (
        <div className="text-xs text-blue-600 mt-1 truncate">
          {activityName}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage drop zone states across the calendar
 */
export function useDropZoneManager() {
  const [activeDropZones, setActiveDropZones] = useState<Set<string>>(new Set());
  const [validDropZones, setValidDropZones] = useState<Set<string>>(new Set());
  
  const registerDropZone = (id: string, isValid: boolean) => {
    setActiveDropZones(prev => new Set(prev).add(id));
    if (isValid) {
      setValidDropZones(prev => new Set(prev).add(id));
    }
  };
  
  const unregisterDropZone = (id: string) => {
    setActiveDropZones(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setValidDropZones(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  
  const clearDropZones = () => {
    setActiveDropZones(new Set());
    setValidDropZones(new Set());
  };
  
  return {
    activeDropZones,
    validDropZones,
    registerDropZone,
    unregisterDropZone,
    clearDropZones
  };
}