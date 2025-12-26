import React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import { format } from 'date-fns';
import { DndContext } from '@dnd-kit/core';

import { useCalendarDays } from '../hooks/useCalendarDays';
import { CalendarControls } from '../CalendarControls';
import { DayColumn } from '../DayColumn';

describe('Week calendar', () => {
  it('generates Monday-starting week days', () => {
    const selectedDate = new Date(2026, 1, 1); // Feb 1, 2026 (local)
    const { result } = renderHook(() => useCalendarDays(selectedDate, 'week'));

    expect(result.current).toHaveLength(7);
    expect(format(result.current[0], 'yyyy-MM-dd')).toBe('2026-01-26');
    expect(format(result.current[6], 'yyyy-MM-dd')).toBe('2026-02-01');
  });

  it('renders a week range that matches Monday-starting columns', () => {
    render(<CalendarControls selectedDate={new Date(2026, 1, 1)} viewMode="week" />);
    expect(screen.getByText('Jan 26 - Feb 1, 2026')).toBeInTheDocument();
  });

  it('shows date-only activities in the all-day row', () => {
    render(
      <DndContext>
        <DayColumn
          date={new Date(2026, 0, 26)}
          dayIndex={0}
          timeSlots={[
            { time: '06:00', hour: 6, minute: 0, label: '6:00 AM' },
          ]}
          activities={[]}
          allDayActivities={[
            { id: 'a1', name: 'Unscheduled Museum' },
            { id: 'a2', name: 'Walk Around' },
            { id: 'a3', name: 'Coffee Stop' },
          ]}
        />
      </DndContext>
    );

    expect(screen.getByText('Unscheduled Museum')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });
});

