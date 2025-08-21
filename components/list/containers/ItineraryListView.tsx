"use client";

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { format } from 'date-fns';
import { ItineraryListContainer } from './ItineraryListContainer';

interface ItineraryListViewProps {
  showMap?: boolean;
  onToggleMap?: () => void;
  className?: string;
  targetDate?: Date | null;
}

export interface ItineraryListViewRef {
  scrollToDate: (date: Date) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const ItineraryListView = forwardRef<ItineraryListViewRef, ItineraryListViewProps>(({ 
  className
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Expose scrollToDate function and containerRef via ref
  useImperativeHandle(ref, () => ({
    scrollToDate: (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayElement = dayRefs.current.get(dateStr);
      
      if (dayElement && containerRef.current) {
        // Expand the day if it's collapsed - this will be handled by the container
        const expandEvent = new CustomEvent('expandDay', { detail: { dateStr } });
        containerRef.current.dispatchEvent(expandEvent);
        
        // Scroll to the day element
        setTimeout(() => {
          dayElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }, 100); // Small delay to ensure expansion animation completes
      }
    },
    containerRef,
  }), []);

  return (
    <ItineraryListContainer
      containerRef={containerRef}
      className={className}
    />
  );
});

ItineraryListView.displayName = 'ItineraryListView';