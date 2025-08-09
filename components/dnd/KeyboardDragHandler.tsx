"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { format, addDays, addWeeks, startOfWeek } from 'date-fns';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Enter, 
  Escape,
  Space,
  Calendar,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDragContext } from './DragProvider';

interface KeyboardDragState {
  isActive: boolean;
  currentItem: any | null;
  currentPosition: {
    date: Date;
    timeSlot: string;
  } | null;
  availableSlots: Array<{
    id: string;
    date: Date;
    timeSlot: string;
    isValid: boolean;
  }>;
  selectedSlotIndex: number;
}

interface KeyboardDragHandlerProps {
  onItemSelect?: (item: any) => void;
  onDrop?: (item: any, target: { date: Date; timeSlot: string }) => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * Keyboard accessibility handler for drag-and-drop operations
 * Provides full keyboard navigation for scheduling activities
 */
export function KeyboardDragHandler({
  onItemSelect,
  onDrop,
  onCancel,
  className
}: KeyboardDragHandlerProps) {
  const dragContext = useDragContext();
  const [keyboardState, setKeyboardState] = useState<KeyboardDragState>({
    isActive: false,
    currentItem: null,
    currentPosition: null,
    availableSlots: [],
    selectedSlotIndex: 0
  });

  const announcementRef = useRef<HTMLDivElement>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);

  // Generate available time slots for navigation
  const generateAvailableSlots = useCallback((baseDate: Date = new Date()) => {
    const slots: Array<{
      id: string;
      date: Date;
      timeSlot: string;
      isValid: boolean;
    }> = [];

    // Generate slots for current week
    const weekStart = startOfWeek(baseDate);
    
    for (let day = 0; day < 7; day++) {
      const currentDate = addDays(weekStart, day);
      
      for (let hour = 8; hour <= 20; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotId = `${format(currentDate, 'yyyy-MM-dd')}-${timeSlot}`;
          
          // Validate slot (simplified validation)
          const isValid = hour >= 9 && hour <= 18; // Business hours
          
          slots.push({
            id: slotId,
            date: currentDate,
            timeSlot,
            isValid
          });
        }
      }
    }

    return slots;
  }, []);

  // Announce changes for screen readers
  const announce = useCallback((message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
    }
  }, []);

  // Start keyboard drag mode
  const startKeyboardDrag = useCallback((item: any) => {
    const availableSlots = generateAvailableSlots();
    
    setKeyboardState({
      isActive: true,
      currentItem: item,
      currentPosition: null,
      availableSlots,
      selectedSlotIndex: 0
    });

    announce(`Started dragging ${item.activity?.name || item.name}. Use arrow keys to navigate time slots.`);
    onItemSelect?.(item);
  }, [generateAvailableSlots, announce, onItemSelect]);

  // End keyboard drag mode
  const endKeyboardDrag = useCallback((dropped: boolean = false) => {
    const { currentItem, availableSlots, selectedSlotIndex } = keyboardState;
    
    if (dropped && currentItem && availableSlots[selectedSlotIndex]) {
      const targetSlot = availableSlots[selectedSlotIndex];
      onDrop?.(currentItem, {
        date: targetSlot.date,
        timeSlot: targetSlot.timeSlot
      });
      
      announce(`Dropped ${currentItem.activity?.name || currentItem.name} at ${formatSlotForScreenReader(targetSlot)}`);
    } else {
      announce(`Cancelled dragging ${currentItem?.activity?.name || currentItem?.name || 'item'}`);
      onCancel?.();
    }

    setKeyboardState({
      isActive: false,
      currentItem: null,
      currentPosition: null,
      availableSlots: [],
      selectedSlotIndex: 0
    });
  }, [keyboardState, onDrop, onCancel, announce]);

  // Navigate through available slots
  const navigateSlots = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const { availableSlots, selectedSlotIndex } = keyboardState;
    
    if (availableSlots.length === 0) return;

    let newIndex = selectedSlotIndex;
    const slotsPerDay = 26; // 8am-8pm with 30min intervals = 26 slots
    const currentSlot = availableSlots[selectedSlotIndex];
    
    switch (direction) {
      case 'up':
        // Move to previous time slot (30 min earlier)
        newIndex = Math.max(0, selectedSlotIndex - 1);
        break;
      case 'down':
        // Move to next time slot (30 min later)
        newIndex = Math.min(availableSlots.length - 1, selectedSlotIndex + 1);
        break;
      case 'left':
        // Move to previous day, same time
        newIndex = Math.max(0, selectedSlotIndex - slotsPerDay);
        break;
      case 'right':
        // Move to next day, same time
        newIndex = Math.min(availableSlots.length - 1, selectedSlotIndex + slotsPerDay);
        break;
    }

    if (newIndex !== selectedSlotIndex) {
      setKeyboardState(prev => ({
        ...prev,
        selectedSlotIndex: newIndex,
        currentPosition: {
          date: availableSlots[newIndex].date,
          timeSlot: availableSlots[newIndex].timeSlot
        }
      }));

      const newSlot = availableSlots[newIndex];
      const validityText = newSlot.isValid ? "available" : "unavailable";
      announce(`${formatSlotForScreenReader(newSlot)}, ${validityText}`);
    }
  }, [keyboardState, announce]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!keyboardState.isActive) return;

    event.preventDefault();
    
    switch (event.key) {
      case 'ArrowUp':
        navigateSlots('up');
        break;
      case 'ArrowDown':
        navigateSlots('down');
        break;
      case 'ArrowLeft':
        navigateSlots('left');
        break;
      case 'ArrowRight':
        navigateSlots('right');
        break;
      case 'Enter':
      case ' ':
        endKeyboardDrag(true);
        break;
      case 'Escape':
        endKeyboardDrag(false);
        break;
      case 'Home':
        // Jump to first slot of current day
        const slotsPerDay = 26;
        const currentDayStart = Math.floor(keyboardState.selectedSlotIndex / slotsPerDay) * slotsPerDay;
        setKeyboardState(prev => ({
          ...prev,
          selectedSlotIndex: currentDayStart
        }));
        break;
      case 'End':
        // Jump to last slot of current day  
        const currentDayEnd = Math.floor(keyboardState.selectedSlotIndex / slotsPerDay) * slotsPerDay + slotsPerDay - 1;
        setKeyboardState(prev => ({
          ...prev,
          selectedSlotIndex: Math.min(currentDayEnd, prev.availableSlots.length - 1)
        }));
        break;
    }
  }, [keyboardState, navigateSlots, endKeyboardDrag]);

  // Set up global keyboard listeners
  useEffect(() => {
    if (keyboardState.isActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [keyboardState.isActive, handleKeyDown]);

  // Focus management
  useEffect(() => {
    if (keyboardState.isActive && instructionsRef.current) {
      instructionsRef.current.focus();
    }
  }, [keyboardState.isActive]);

  if (!keyboardState.isActive) {
    return (
      <div className="sr-only" ref={announcementRef} aria-live="polite" aria-atomic="true" />
    );
  }

  const currentSlot = keyboardState.availableSlots[keyboardState.selectedSlotIndex];
  const currentItem = keyboardState.currentItem;

  return (
    <div className={cn("fixed inset-0 bg-black bg-opacity-50 z-50", className)}>
      {/* Screen reader announcements */}
      <div className="sr-only" ref={announcementRef} aria-live="polite" aria-atomic="true" />
      
      {/* Keyboard instructions modal */}
      <div
        ref={instructionsRef}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        role="dialog"
        aria-labelledby="keyboard-drag-title"
        aria-describedby="keyboard-drag-description"
        tabIndex={-1}
      >
        <h2 id="keyboard-drag-title" className="text-lg font-semibold text-gray-900 mb-2">
          Keyboard Scheduling Mode
        </h2>
        
        <div id="keyboard-drag-description" className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Scheduling: <strong>{currentItem?.activity?.name || currentItem?.name}</strong>
          </p>
          
          {currentSlot && (
            <div className="bg-blue-50 rounded p-3 mb-3">
              <div className="text-sm">
                <div className="font-medium text-blue-900">
                  Selected Time Slot
                </div>
                <div className="text-blue-800">
                  {formatSlotForDisplay(currentSlot)}
                </div>
                <Badge 
                  variant={currentSlot.isValid ? "default" : "destructive"}
                  className="mt-1 text-xs"
                >
                  {currentSlot.isValid ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Keyboard instructions */}
        <div className="space-y-3 mb-4">
          <h3 className="font-medium text-gray-900">Keyboard Controls:</h3>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <ArrowUp className="h-4 w-4" />
              <span>Earlier time</span>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowDown className="h-4 w-4" />
              <span>Later time</span>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Previous day</span>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowRight className="h-4 w-4" />
              <span>Next day</span>
            </div>
            <div className="flex items-center space-x-2">
              <Enter className="h-4 w-4" />
              <span>Schedule here</span>
            </div>
            <div className="flex items-center space-x-2">
              <Escape className="h-4 w-4" />
              <span>Cancel</span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            Use Home/End to jump to start/end of day
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={() => endKeyboardDrag(true)}
            disabled={!currentSlot?.isValid}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            Schedule Here
          </Button>
          
          <Button
            variant="outline"
            onClick={() => endKeyboardDrag(false)}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
        
        {/* Additional help text */}
        <div className="mt-3 text-xs text-gray-500 text-center">
          This modal will close when you complete or cancel the scheduling
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to provide keyboard drag functionality to components
 */
export function useKeyboardDrag() {
  const [handler, setHandler] = useState<KeyboardDragHandler | null>(null);
  
  const startDrag = useCallback((item: any) => {
    // This would integrate with the KeyboardDragHandler
    console.log('Starting keyboard drag for:', item);
  }, []);
  
  return {
    startKeyboardDrag: startDrag,
    isKeyboardDragActive: false // Would be managed by the handler
  };
}

/**
 * Instructions component that can be shown in the UI
 */
export function KeyboardDragInstructions({
  isVisible,
  className
}: {
  isVisible: boolean;
  className?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm",
      "animate-in slide-in-from-top-2 duration-300",
      className
    )}>
      <div className="flex items-center space-x-2 mb-2">
        <Calendar className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-blue-800">Keyboard Scheduling</span>
      </div>
      
      <p className="text-blue-700 mb-2">
        Press <kbd className="px-1 py-0.5 bg-white border rounded text-xs">Space</kbd> or{' '}
        <kbd className="px-1 py-0.5 bg-white border rounded text-xs">Enter</kbd> on a wishlist item to start keyboard scheduling mode.
      </p>
      
      <div className="grid grid-cols-2 gap-1 text-xs text-blue-600">
        <div>↑↓ Change time</div>
        <div>←→ Change day</div>
        <div>Enter Schedule</div>
        <div>Esc Cancel</div>
      </div>
    </div>
  );
}

// Utility functions
function formatSlotForScreenReader(slot: {
  date: Date;
  timeSlot: string;
}): string {
  const dayName = format(slot.date, 'EEEE');
  const dateStr = format(slot.date, 'MMMM d');
  const timeStr = formatTime(slot.timeSlot);
  
  return `${dayName}, ${dateStr} at ${timeStr}`;
}

function formatSlotForDisplay(slot: {
  date: Date;
  timeSlot: string;
}): string {
  const dayStr = format(slot.date, 'EEE, MMM d');
  const timeStr = formatTime(slot.timeSlot);
  
  return `${dayStr} at ${timeStr}`;
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  
  if (minutes === 0) {
    return `${displayHour} ${period}`;
  }
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}