import type { Operation } from "@/lib/ai/itinerary/schema";
import type { EffectivePreferences } from "@/lib/ai/itinerary/intelligence/preferences";
import { formatMinutesToHHmm, getDayOfWeekFromIsoDate, parseTimeToMinutes } from "@/lib/ai/itinerary/intelligence/time";
import { getOpenIntervalsForDay, type OpenHoursRow } from "@/lib/ai/itinerary/intelligence/openHours";
import { autoCorrectToNextOpenInterval } from "@/lib/ai/itinerary/intelligence/hoursAutoCorrect";
import { primaryThemeFromTypes, type DayThemeKey } from "@/lib/ai/itinerary/intelligence/themes";

export type CurationCandidate = {
  itineraryActivityId: string;
  name: string;
  activityId: number | null;
  coords: { lat: number; lng: number } | null;
  types: string[];
  durationMin: number;
  lockedDate: string | null;
};

export type CuratedDayPlan = {
  date: string;
  rationale: string;
  items: Array<{
    itineraryActivityId: string;
    title: string;
    startTime: string;
    endTime: string;
    theme: DayThemeKey | null;
  }>;
};

export const parseDurationToMinutes = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const minutes = Math.floor(value);
    return minutes > 0 ? minutes : null;
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const textMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)$/i);
  if (textMatch) {
    const minutes = Number(textMatch[1]);
    return Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : null;
  }

  const hhmmss = trimmed.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (hhmmss) {
    const hours = Number(hhmmss[1]);
    const minutes = Number(hhmmss[2]);
    const seconds = Number(hhmmss[3] ?? 0);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
    const total = hours * 60 + minutes + Math.round(seconds / 60);
    return total > 0 ? total : null;
  }

  const minutesMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (minutesMatch) {
    const minutes = Number(minutesMatch[1]);
    return Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : null;
  }

  return null;
};

export const buildIsoDateRange = (fromDate: string, toDate: string, maxDays = 14): string[] => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) return [];
  if (toDate < fromDate) return [];

  const out: string[] = [];
  let current = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime())) return [];

  while (current <= end && out.length < maxDays) {
    out.push(current.toISOString().slice(0, 10));
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  return out;
};

const haversineMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const clusterKeyForCoords = (coords: { lat: number; lng: number } | null, grid = 0.02): string => {
  if (!coords) return "no_coords";
  const latKey = Math.round(coords.lat / grid);
  const lngKey = Math.round(coords.lng / grid);
  return `${latKey},${lngKey}`;
};

const orderByNearestNeighbor = (items: CurationCandidate[]): CurationCandidate[] => {
  if (items.length <= 2) return [...items];

  const withCoords = items.filter((item) => item.coords);
  const withoutCoords = items.filter((item) => !item.coords);
  if (withCoords.length <= 1) return [...withCoords, ...withoutCoords];

  const remaining = new Map<string, CurationCandidate>();
  for (const item of withCoords) remaining.set(item.itineraryActivityId, item);

  // Stable start: smallest id.
  const start = [...withCoords].sort((a, b) => Number(a.itineraryActivityId) - Number(b.itineraryActivityId))[0];
  if (!start || !start.coords) return [...items];

  const ordered: CurationCandidate[] = [start];
  remaining.delete(start.itineraryActivityId);
  let current = start;

  while (remaining.size > 0) {
    let next: CurationCandidate | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (const candidate of remaining.values()) {
      if (!candidate.coords || !current.coords) continue;
      const dist = haversineMeters(current.coords, candidate.coords);
      if (dist < bestDist) {
        bestDist = dist;
        next = candidate;
      } else if (dist === bestDist && next) {
        if (Number(candidate.itineraryActivityId) < Number(next.itineraryActivityId)) {
          next = candidate;
        }
      }
    }

    if (!next) break;
    ordered.push(next);
    remaining.delete(next.itineraryActivityId);
    current = next;
  }

  // Append any remaining (should be none) and then no-coords items.
  const leftover = [...remaining.values()].sort(
    (a, b) => Number(a.itineraryActivityId) - Number(b.itineraryActivityId)
  );
  const noCoordsSorted = withoutCoords.sort((a, b) => Number(a.itineraryActivityId) - Number(b.itineraryActivityId));
  return [...ordered, ...leftover, ...noCoordsSorted];
};

const mergeIntervals = (intervals: Array<{ startMin: number; endMin: number }>) => {
  const sorted = [...intervals]
    .filter((i) => Number.isFinite(i.startMin) && Number.isFinite(i.endMin) && i.endMin > i.startMin)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const merged: Array<{ startMin: number; endMin: number }> = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...interval });
      continue;
    }
    if (interval.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, interval.endMin);
      continue;
    }
    merged.push({ ...interval });
  }
  return merged;
};

const subtractBusy = (args: {
  dayStartMin: number;
  dayEndMin: number;
  busy: Array<{ startMin: number; endMin: number }>;
}): Array<{ startMin: number; endMin: number }> => {
  const start = Math.max(0, Math.min(24 * 60, Math.floor(args.dayStartMin)));
  const end = Math.max(0, Math.min(24 * 60, Math.floor(args.dayEndMin)));
  if (end <= start) return [];

  const mergedBusy = mergeIntervals(args.busy).map((interval) => ({
    startMin: Math.max(start, interval.startMin),
    endMin: Math.min(end, interval.endMin),
  }));

  const free: Array<{ startMin: number; endMin: number }> = [];
  let cursor = start;
  for (const interval of mergedBusy) {
    if (interval.endMin <= cursor) continue;
    if (interval.startMin > cursor) free.push({ startMin: cursor, endMin: interval.startMin });
    cursor = Math.max(cursor, interval.endMin);
  }
  if (cursor < end) free.push({ startMin: cursor, endMin: end });
  return free.filter((interval) => interval.endMin - interval.startMin >= 10);
};

const pickBufferMinutes = (mode: EffectivePreferences["travelMode"]): number => {
  if (mode === "driving") return 10;
  if (mode === "bicycling") return 10;
  if (mode === "transit") return 15;
  return 15;
};

const pickDailyItemCap = (pace: EffectivePreferences["pace"]): number => {
  if (pace === "relaxed") return 3;
  if (pace === "packed") return 6;
  return 4;
};

const pickStartEndMinutes = (prefs: EffectivePreferences): { dayStartMin: number; dayEndMin: number } => {
  const start = parseTimeToMinutes(prefs.dayStart) ?? 9 * 60;
  const end = parseTimeToMinutes(prefs.dayEnd) ?? 18 * 60;
  if (end <= start + 60) return { dayStartMin: 9 * 60, dayEndMin: 18 * 60 };
  return { dayStartMin: start, dayEndMin: end };
};

const tryScheduleCandidate = (args: {
  candidate: CurationCandidate;
  date: string;
  earliestStartMin: number;
  window: { startMin: number; endMin: number };
  openHoursByActivityId: Map<number, OpenHoursRow[]>;
}): { startMin: number; endMin: number } | null => {
  const duration = Math.max(15, Math.floor(args.candidate.durationMin));
  const baseStart = Math.max(args.window.startMin, Math.floor(args.earliestStartMin));
  const baseEnd = baseStart + duration;
  if (baseEnd > args.window.endMin) return null;

  const activityId = args.candidate.activityId;
  if (activityId == null) {
    return { startMin: baseStart, endMin: baseEnd };
  }

  const openRows = args.openHoursByActivityId.get(activityId) ?? [];
  if (openRows.length === 0) {
    return { startMin: baseStart, endMin: baseEnd };
  }

  const intervals = getOpenIntervalsForDay(openRows, getDayOfWeekFromIsoDate(args.date));
  if (intervals.length === 0) {
    return { startMin: baseStart, endMin: baseEnd };
  }

  const correction = autoCorrectToNextOpenInterval({ intervals, startMin: baseStart, endMin: baseEnd });
  if (!correction) return { startMin: baseStart, endMin: baseEnd };

  if (correction.newEndMin <= args.window.endMin) {
    return { startMin: correction.newStartMin, endMin: correction.newEndMin };
  }

  // Fallback: find an open interval start within the window.
  for (const interval of intervals) {
    const candidateStart = Math.max(baseStart, interval.startMin);
    const candidateEnd = candidateStart + duration;
    if (candidateEnd <= interval.endMin && candidateEnd <= args.window.endMin) {
      return { startMin: candidateStart, endMin: candidateEnd };
    }
  }

  return null;
};

export const buildCuratedDayPlan = (args: {
  dateRange: string[];
  candidates: CurationCandidate[];
  fixedByDate: Map<string, Array<{ startMin: number; endMin: number }>>;
  openHoursByActivityId: Map<number, OpenHoursRow[]>;
  preferences: EffectivePreferences;
  requestedTheme: DayThemeKey | null;
  maxOperations: number;
}): { operations: Operation[]; dayPlans: CuratedDayPlan[]; scheduledIds: Set<string> } => {
  const { dayStartMin, dayEndMin } = pickStartEndMinutes(args.preferences);
  const bufferMin = pickBufferMinutes(args.preferences.travelMode);
  const dailyCap = pickDailyItemCap(args.preferences.pace);

  const unscheduled = args.candidates
    .map((candidate) => ({
      ...candidate,
      theme: primaryThemeFromTypes(candidate.types),
    }))
    .sort((a, b) => Number(a.itineraryActivityId) - Number(b.itineraryActivityId));

  const lockedByDate = new Map<string, CurationCandidate[]>();
  const unlocked: CurationCandidate[] = [];

  for (const candidate of unscheduled) {
    if (candidate.lockedDate) {
      const list = lockedByDate.get(candidate.lockedDate) ?? [];
      list.push(candidate);
      lockedByDate.set(candidate.lockedDate, list);
      continue;
    }
    unlocked.push(candidate);
  }

  const clusters = new Map<string, CurationCandidate[]>();
  for (const candidate of unlocked) {
    const key = clusterKeyForCoords(candidate.coords);
    const list = clusters.get(key) ?? [];
    list.push(candidate);
    clusters.set(key, list);
  }

  const interests = args.preferences.interests;
  const scoreCluster = (list: CurationCandidate[]): number => {
    let score = list.length;
    const requested = args.requestedTheme && args.requestedTheme !== "mixed" ? args.requestedTheme : null;
    for (const candidate of list) {
      const theme = primaryThemeFromTypes(candidate.types);
      if (requested && theme === requested) score += 10;
      if (interests.includes(theme as any)) score += 3;
    }
    return score;
  };

  const orderedClusters = Array.from(clusters.entries())
    .map(([key, list]) => ({ key, list: orderByNearestNeighbor(list), score: scoreCluster(list) }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const dayPlans: CuratedDayPlan[] = [];
  const operations: Operation[] = [];
  const scheduledIds = new Set<string>();

  const remainingUnlocked = () => orderedClusters.some((cluster) => cluster.list.length > 0);

  for (const date of args.dateRange) {
    if (operations.length >= args.maxOperations) break;

    const busy = args.fixedByDate.get(date) ?? [];
    const freeWindows = subtractBusy({ dayStartMin, dayEndMin, busy });
    if (freeWindows.length === 0) continue;

    const planItems: CuratedDayPlan["items"] = [];

    const scheduleList = (list: CurationCandidate[]) => {
      const queue = [...list];
      let windowIdx = 0;
      let cursor = freeWindows[0]?.startMin ?? dayStartMin;

      while (queue.length > 0 && windowIdx < freeWindows.length) {
        if (operations.length >= args.maxOperations) break;
        if (planItems.length >= dailyCap) break;

        const window = freeWindows[windowIdx];
        if (!window) break;

        const candidate = queue[0];
        if (!candidate) break;

        const scheduled = tryScheduleCandidate({
          candidate,
          date,
          earliestStartMin: cursor,
          window,
          openHoursByActivityId: args.openHoursByActivityId,
        });

        if (!scheduled) {
          // Move to next window.
          windowIdx += 1;
          cursor = freeWindows[windowIdx]?.startMin ?? dayStartMin;
          continue;
        }

        operations.push({
          op: "update_activity",
          itineraryActivityId: candidate.itineraryActivityId,
          date,
          startTime: formatMinutesToHHmm(scheduled.startMin),
          endTime: formatMinutesToHHmm(scheduled.endMin),
        });
        scheduledIds.add(candidate.itineraryActivityId);
        planItems.push({
          itineraryActivityId: candidate.itineraryActivityId,
          title: candidate.name,
          startTime: formatMinutesToHHmm(scheduled.startMin),
          endTime: formatMinutesToHHmm(scheduled.endMin),
          theme: primaryThemeFromTypes(candidate.types),
        });

        queue.shift();
        cursor = scheduled.endMin + bufferMin;
        if (cursor >= window.endMin) {
          windowIdx += 1;
          cursor = freeWindows[windowIdx]?.startMin ?? dayStartMin;
        }
      }

      return queue;
    };

    const locked = lockedByDate.get(date) ?? [];
    let lockedRemainder: CurationCandidate[] = [];
    if (locked.length > 0) {
      lockedRemainder = scheduleList(orderByNearestNeighbor(locked));
    }

    if (planItems.length < dailyCap && remainingUnlocked()) {
      // Consume from top clusters.
      for (const cluster of orderedClusters) {
        if (operations.length >= args.maxOperations) break;
        if (planItems.length >= dailyCap) break;
        if (cluster.list.length === 0) continue;

        const remainder = scheduleList(cluster.list);
        cluster.list = remainder;
      }
    }

    if (planItems.length === 0) continue;

    const theme = args.requestedTheme && args.requestedTheme !== "mixed" ? args.requestedTheme : null;
    const rationale = theme
      ? `Focused on ${theme} and kept things close together when possible.`
      : `Planned a ${args.preferences.pace} day within your ${args.preferences.dayStart}–${args.preferences.dayEnd} window.`;

    dayPlans.push({
      date,
      rationale: lockedRemainder.length > 0 ? `${rationale} Some items couldn't fit into this day.` : rationale,
      items: planItems,
    });
  }

  return { operations, dayPlans, scheduledIds };
};

