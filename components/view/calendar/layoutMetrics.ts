import type { TimeGridConfig } from './TimeGrid';

export const CALENDAR_HEADER_HEIGHT_PX = 56;

export function getCalendarSlotHeightPx(
  interval: TimeGridConfig['interval'] | number
): number {
  switch (interval) {
    case 15:
      return 30;
    case 30:
      return 48;
    case 60:
      return 60;
    default:
      return 48;
  }
}

