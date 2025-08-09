"use client";

import React, { useState, useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface GridCellData {
  dayIndex: number;
  timeSlot: string; // "09:00"
  date: Date;
  isDropZone: boolean;
  isOccupied: boolean;
  hasConflict: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  isCurrentTime?: boolean;
  isBusinessHours?: boolean;
}

interface GridCellProps {
  cell: GridCellData;
  isOver?: boolean;
  isDragging?: boolean;
  onCellClick?: (cell: GridCellData) => void;
  onCellDoubleClick?: (cell: GridCellData) => void;
  onCellHover?: (cell: GridCellData) => void;
  onCellSelect?: (cell: GridCellData, isSelected: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Individual calendar grid cell with drop zone functionality
 */
export function GridCell({
  cell,
  isOver = false,
  isDragging = false,
  onCellClick,
  onCellDoubleClick,
  onCellHover,
  onCellSelect,
  className,
  children
}: GridCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const { setNodeRef } = useDroppable({
    id: `cell-${cell.dayIndex}-${cell.timeSlot}`,
    data: cell
  });

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.shiftKey && onCellSelect) {
      // Handle multi-select with shift key
      onCellSelect(cell, !cell.isSelected);
    } else if (onCellClick) {
      onCellClick(cell);
    }
  }, [cell, onCellClick, onCellSelect]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCellDoubleClick) {
      onCellDoubleClick(cell);
    }
  }, [cell, onCellDoubleClick]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (onCellHover) {
      onCellHover(cell);
    }
  }, [cell, onCellHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Determine cell styling based on state
  const getCellStyle = () => {
    let baseClasses = "relative border-b border-r border-gray-100 transition-all duration-150";
    
    // Background states
    if (cell.isOccupied) {
      baseClasses += " bg-gray-50";
    } else if (cell.isBusinessHours === false) {
      baseClasses += " bg-gray-100 opacity-50";
    }
    
    // Selection states
    if (cell.isSelected) {
      baseClasses += " bg-blue-50 border-blue-200";
    }
    
    // Hover states
    if (isHovered && !cell.isOccupied && cell.isDropZone) {
      baseClasses += " bg-gray-50 cursor-pointer";
    }
    
    // Drag over states
    if (isOver && isDragging) {
      if (cell.hasConflict) {
        baseClasses += " bg-red-100 border-red-300 border-2";
      } else {
        baseClasses += " bg-green-100 border-green-300 border-2";
      }
    }
    
    // Current time indicator
    if (cell.isCurrentTime) {
      baseClasses += " border-l-4 border-l-red-500";
    }
    
    // Highlighted state (for search/filter results)
    if (cell.isHighlighted) {
      baseClasses += " ring-2 ring-yellow-400 ring-opacity-50";
    }
    
    return baseClasses;
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(getCellStyle(), className)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="gridcell"
      aria-label={`${format(cell.date, 'EEEE, MMMM d')} at ${cell.timeSlot}`}
      aria-selected={cell.isSelected}
      tabIndex={0}
    >
      {/* Drop indicator overlay */}
      {isOver && isDragging && cell.isDropZone && (
        <div className={cn(
          "absolute inset-0 pointer-events-none",
          cell.hasConflict 
            ? "bg-red-500 bg-opacity-10" 
            : "bg-green-500 bg-opacity-10"
        )}>
          <div className={cn(
            "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-medium",
            cell.hasConflict ? "text-red-600" : "text-green-600"
          )}>
            {cell.hasConflict ? "Conflict" : "Drop here"}
          </div>
        </div>
      )}
      
      {/* Hover indicator */}
      {isHovered && !cell.isOccupied && !isOver && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-bl-full opacity-50" />
        </div>
      )}
      
      {/* Selection indicator */}
      {cell.isSelected && (
        <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500" />
      )}
      
      {/* Content */}
      {children}
    </div>
  );
}

/**
 * Grid cell group for multi-slot activities
 */
export function GridCellGroup({
  cells,
  className,
  children
}: {
  cells: GridCellData[];
  className?: string;
  children?: React.ReactNode;
}) {
  if (cells.length === 0) return null;
  
  const firstCell = cells[0];
  const lastCell = cells[cells.length - 1];
  
  return (
    <div
      className={cn(
        "absolute pointer-events-auto",
        className
      )}
      role="group"
      aria-label={`Activity from ${firstCell.timeSlot} to ${lastCell.timeSlot}`}
    >
      {children}
    </div>
  );
}

/**
 * Empty grid cell placeholder
 */
export function EmptyGridCell({
  timeSlot,
  className
}: {
  timeSlot: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "h-full w-full flex items-center justify-center text-xs text-gray-400",
      className
    )}>
      <span className="opacity-0 hover:opacity-100 transition-opacity">
        {timeSlot}
      </span>
    </div>
  );
}