import { isOpenForWindow, type OpenInterval } from "@/lib/ai/itinerary/intelligence/openHours";

export type HoursAutoCorrection = {
  newStartMin: number;
  newEndMin: number;
};

/**
 * Conservative v1 correction:
 * - Only shifts forward to the next open interval start.
 * - Never shifts earlier or changes duration.
 */
export const autoCorrectToNextOpenInterval = (args: {
  intervals: OpenInterval[];
  startMin: number;
  endMin: number;
}): HoursAutoCorrection | null => {
  const intervals = Array.isArray(args.intervals) ? args.intervals : [];
  if (intervals.length === 0) return null;

  const startMin = Math.floor(args.startMin);
  const endMin = Math.floor(args.endMin);
  const durationMin = endMin - startMin;
  if (!Number.isFinite(durationMin) || durationMin <= 0) return null;

  if (isOpenForWindow(intervals, startMin, endMin)) return null;

  const sorted = [...intervals].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  for (const interval of sorted) {
    if (interval.startMin < startMin) continue;
    const candidateStart = interval.startMin;
    const candidateEnd = candidateStart + durationMin;
    if (candidateEnd <= interval.endMin) {
      return { newStartMin: candidateStart, newEndMin: candidateEnd };
    }
  }

  return null;
};

