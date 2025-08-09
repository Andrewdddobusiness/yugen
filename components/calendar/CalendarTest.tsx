"use client";

import { useState } from 'react';
import { CalendarGridEnhanced } from './CalendarGridEnhanced';

/**
 * Test component to verify calendar navigation works
 */
export function CalendarTest() {
  const [selectedDate] = useState(new Date());

  return (
    <div className="h-screen">
      <CalendarGridEnhanced 
        selectedDate={selectedDate}
        defaultViewMode="week"
        className="h-full"
      />
    </div>
  );
}