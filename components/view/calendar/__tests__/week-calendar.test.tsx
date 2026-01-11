import React from 'react';
import { render, screen, renderHook, within } from '@testing-library/react';
import { format } from 'date-fns';
import { DndContext } from '@dnd-kit/core';

import { useCalendarDays } from '../hooks/useCalendarDays';
import { CalendarControls } from '../CalendarControls';
import { DayColumn } from '../DayColumn';

describe('Week calendar', () => {
  it('generates Sunday-starting week days', () => {
    const selectedDate = new Date(2026, 0, 26); // Jan 26, 2026 (local)
    const { result } = renderHook(() => useCalendarDays(selectedDate, 'week'));

    expect(result.current).toHaveLength(7);
    expect(format(result.current[0], 'yyyy-MM-dd')).toBe('2026-01-25');
    expect(format(result.current[6], 'yyyy-MM-dd')).toBe('2026-01-31');
  });

  it('renders a week range that matches Sunday-starting columns', () => {
    render(<CalendarControls selectedDate={new Date(2026, 0, 26)} viewMode="week" />);
    expect(screen.getByText('Jan 25 - 31, 2026')).toBeInTheDocument();
  });

  it('disables travel times toggle in month view', () => {
    render(<CalendarControls selectedDate={new Date(2026, 0, 26)} viewMode="month" />);
    const container = screen.getByTitle(/Travel times are available/i);
    const travelSwitch = within(container).getByRole('switch');
    expect(travelSwitch).toBeDisabled();
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

    expect(screen.getByText('+3')).toBeInTheDocument();
  });
});
