"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { 
  Undo2, 
  Redo2, 
  History, 
  RotateCcw,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDragContext, DragOperation } from '@/components/provider/dnd/DragProvider';

interface UndoRedoControlsProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline';
  showHistory?: boolean;
  maxHistoryItems?: number;
  className?: string;
}

/**
 * Undo/Redo controls for drag-and-drop operations
 * Provides visual feedback and operation history
 */
export function UndoRedoControls({
  position = 'top-right',
  showHistory = true,
  maxHistoryItems = 10,
  className
}: UndoRedoControlsProps) {
  const dragContext = useDragContext();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  // Update counts when history changes
  useEffect(() => {
    const { operationHistory, currentHistoryIndex } = dragContext.state;
    setUndoCount(currentHistoryIndex + 1);
    setRedoCount(operationHistory.length - currentHistoryIndex - 1);
  }, [dragContext.state.operationHistory, dragContext.state.currentHistoryIndex]);

  const handleUndo = useCallback(async () => {
    const success = await dragContext.undo();
    if (success) {
      // Optional: Show toast notification
      console.log('Operation undone successfully');
    }
  }, [dragContext]);

  const handleRedo = useCallback(async () => {
    const success = await dragContext.redo();
    if (success) {
      // Optional: Show toast notification  
      console.log('Operation redone successfully');
    }
  }, [dragContext]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key === 'z') {
        event.preventDefault();
        handleUndo();
      } else if (
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') ||
        ((event.ctrlKey || event.metaKey) && event.key === 'y')
      ) {
        event.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'absolute top-4 left-4';
      case 'top-right':
        return 'absolute top-4 right-4';
      case 'bottom-left':
        return 'absolute bottom-4 left-4';
      case 'bottom-right':
        return 'absolute bottom-4 right-4';
      case 'inline':
      default:
        return '';
    }
  };

  const recentOperations = dragContext.state.operationHistory
    .slice(-maxHistoryItems)
    .reverse();

  return (
    <div className={cn(
      "flex items-center space-x-2",
      getPositionClasses(),
      className
    )}>
      {/* Undo Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!dragContext.canUndo() || dragContext.state.isProcessing}
            className="h-8 px-2"
          >
            <Undo2 className="h-4 w-4" />
            {undoCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1">
                {undoCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p>Undo last action</p>
            <p className="text-xs text-gray-400">Ctrl+Z</p>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Redo Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!dragContext.canRedo() || dragContext.state.isProcessing}
            className="h-8 px-2"
          >
            <Redo2 className="h-4 w-4" />
            {redoCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1">
                {redoCount}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p>Redo last undone action</p>
            <p className="text-xs text-gray-400">Ctrl+Shift+Z</p>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* History Button */}
      {showHistory && (
        <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2">
              <History className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <OperationHistory
              operations={recentOperations}
              currentIndex={dragContext.state.currentHistoryIndex}
              onSelectOperation={(index) => {
                // Navigate to specific operation in history
                const targetIndex = dragContext.state.operationHistory.length - 1 - index;
                const currentIndex = dragContext.state.currentHistoryIndex;
                
                if (targetIndex < currentIndex) {
                  // Undo to target
                  const steps = currentIndex - targetIndex;
                  for (let i = 0; i < steps; i++) {
                    dragContext.undo();
                  }
                } else if (targetIndex > currentIndex) {
                  // Redo to target
                  const steps = targetIndex - currentIndex;
                  for (let i = 0; i < steps; i++) {
                    dragContext.redo();
                  }
                }
                setIsHistoryOpen(false);
              }}
              onClose={() => setIsHistoryOpen(false)}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Processing Indicator */}
      {dragContext.state.isProcessing && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <RotateCcw className="h-3 w-3 animate-spin" />
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}

/**
 * Operation history component showing recent drag operations
 */
function OperationHistory({
  operations,
  currentIndex,
  onSelectOperation,
  onClose
}: {
  operations: DragOperation[];
  currentIndex: number;
  onSelectOperation: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="max-h-64 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Operation History</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Click on an operation to jump to that state
        </p>
      </div>

      {/* Operations List */}
      {operations.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          No operations in history
        </div>
      ) : (
        <div className="p-2">
          {operations.map((operation, index) => (
            <OperationHistoryItem
              key={operation.id}
              operation={operation}
              index={index}
              isCurrent={operations.length - 1 - index === currentIndex}
              onClick={() => onSelectOperation(index)}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="border-t px-3 py-2 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          {operations.length} operation{operations.length !== 1 ? 's' : ''} in history
        </p>
      </div>
    </div>
  );
}

/**
 * Individual operation history item
 */
function OperationHistoryItem({
  operation,
  index,
  isCurrent,
  onClick
}: {
  operation: DragOperation;
  index: number;
  isCurrent: boolean;
  onClick: () => void;
}) {
  const getOperationIcon = (op: string) => {
    switch (op) {
      case 'schedule':
        return <Calendar className="h-4 w-4 text-green-600" />;
      case 'move':
        return <MapPin className="h-4 w-4 text-blue-600" />;
      case 'remove':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getOperationText = (operation: DragOperation) => {
    const itemName = operation.item.data?.activity?.name || operation.item.data?.name || 'Item';
    
    switch (operation.operation) {
      case 'schedule':
        return `Scheduled ${itemName}`;
      case 'move':
        return `Moved ${itemName}`;
      case 'remove':
        return `Removed ${itemName}`;
      default:
        return `Modified ${itemName}`;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="text-xs">Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-2 rounded hover:bg-gray-50 transition-colors duration-150",
        "border-l-2",
        isCurrent ? "border-l-blue-500 bg-blue-50" : "border-l-transparent"
      )}
    >
      <div className="flex items-start space-x-2">
        <div className="flex-shrink-0">
          {getOperationIcon(operation.operation)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate">
              {getOperationText(operation)}
            </p>
            {getResultBadge(operation.result)}
          </div>
          
          {operation.target && (
            <p className="text-xs text-gray-500">
              {format(new Date(operation.target.date), 'MMM d')} at {formatTime(operation.target.timeSlot)}
            </p>
          )}
          
          <p className="text-xs text-gray-400">
            {format(operation.timestamp, 'h:mm:ss a')}
          </p>
        </div>
      </div>
    </button>
  );
}

/**
 * Compact undo/redo controls for toolbar use
 */
export function CompactUndoRedoControls({
  className
}: {
  className?: string;
}) {
  const dragContext = useDragContext();

  return (
    <div className={cn("flex items-center", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={dragContext.undo}
        disabled={!dragContext.canUndo()}
        className="h-7 w-7 p-0"
      >
        <Undo2 className="h-3 w-3" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={dragContext.redo}
        disabled={!dragContext.canRedo()}
        className="h-7 w-7 p-0"
      >
        <Redo2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

// Utility function
function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  
  if (minutes === 0) {
    return `${displayHour} ${period}`;
  }
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}