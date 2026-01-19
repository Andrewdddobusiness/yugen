import { formatMinutesToHHmm, getDayOfWeekFromIsoDate, isIsoDateString } from "@/lib/ai/itinerary/intelligence/time";
import { getOpenIntervalsForDay, isOpenForWindow, type OpenHoursRow, type OpenInterval } from "@/lib/ai/itinerary/intelligence/openHours";

export type ScheduleCoordinates = { lat: number; lng: number };

export type ScheduleFixedBlock = {
  date: string;
  startMin: number;
  endMin: number;
  coords: ScheduleCoordinates | null;
};

export type ScheduleItem = {
  itineraryActivityId: string;
  name: string;
  coords: ScheduleCoordinates | null;
  durationMin: number;
  preferredDate: string | null;
  openHours: OpenHoursRow[] | null;
};

export type AutoSchedulePlacement = {
  itineraryActivityId: string;
  date: string;
  startMin: number;
  endMin: number;
  startTime: string;
  endTime: string;
  reasons: string[];
};

export type AutoScheduleResult = {
  placements: AutoSchedulePlacement[];
  unplaced: Array<{ itineraryActivityId: string; reason: string }>;
};

const normalizeId = (value: unknown) => String(value ?? "").trim();

const clampMinute = (value: number) => Math.max(0, Math.min(24 * 60, Math.floor(value)));

const roundUpToStep = (value: number, step: number) => {
  const safeStep = Math.max(1, Math.floor(step));
  return Math.ceil(value / safeStep) * safeStep;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const distanceMetersBetween = (a: ScheduleCoordinates, b: ScheduleCoordinates): number => {
  const phi1 = toRadians(a.lat);
  const phi2 = toRadians(b.lat);
  const deltaPhi = toRadians(b.lat - a.lat);
  const deltaLambda = toRadians(b.lng - a.lng);

  const sinDeltaPhi = Math.sin(deltaPhi / 2);
  const sinDeltaLambda = Math.sin(deltaLambda / 2);

  const aHarv =
    sinDeltaPhi * sinDeltaPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda * sinDeltaLambda;

  const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
  const earthRadiusMeters = 6_371_000;
  return earthRadiusMeters * c;
};

const estimateTravelMinutes = (
  from: ScheduleCoordinates | null,
  to: ScheduleCoordinates | null,
  metersPerMinute: number
): number => {
  if (!from || !to) return 10;
  const meters = distanceMetersBetween(from, to);
  if (!Number.isFinite(meters) || meters <= 0) return 5;
  return Math.max(0, Math.min(90, Math.ceil(meters / Math.max(1, metersPerMinute))));
};

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart;

const nextOpenWindowStart = (args: {
  intervals: OpenInterval[] | null;
  desiredStartMin: number;
  durationMin: number;
  dayEndMin: number;
}): number | null => {
  const desired = clampMinute(args.desiredStartMin);
  const duration = Math.max(1, Math.floor(args.durationMin));
  const dayEnd = clampMinute(args.dayEndMin);

  if (!args.intervals || args.intervals.length === 0) {
    return desired + duration <= dayEnd ? desired : null;
  }

  for (const interval of args.intervals) {
    const start = Math.max(desired, interval.startMin);
    if (start + duration > interval.endMin) continue;
    if (start + duration > dayEnd) continue;
    return start;
  }

  return null;
};

const findNextAvailableStart = (args: {
  desiredStartMin: number;
  durationMin: number;
  reserved: Array<{ startMin: number; endMin: number }>;
  openIntervals: OpenInterval[] | null;
  dayEndMin: number;
  stepMin: number;
}): number | null => {
  const step = Math.max(1, Math.floor(args.stepMin));
  const duration = Math.max(1, Math.floor(args.durationMin));
  const dayEnd = clampMinute(args.dayEndMin);

  let cursor = roundUpToStep(clampMinute(args.desiredStartMin), step);

  for (let safety = 0; safety < 600; safety += 1) {
    if (cursor + duration > dayEnd) return null;

    const openStart = nextOpenWindowStart({
      intervals: args.openIntervals,
      desiredStartMin: cursor,
      durationMin: duration,
      dayEndMin: dayEnd,
    });
    if (openStart == null) return null;

    cursor = roundUpToStep(openStart, step);
    if (cursor + duration > dayEnd) return null;

    const conflict = args.reserved.find((block) => overlaps(cursor, cursor + duration, block.startMin, block.endMin));
    if (!conflict) return cursor;

    cursor = roundUpToStep(conflict.endMin + step, step);
  }

  return null;
};

const pickStartCoord = (items: ScheduleItem[], fixed: ScheduleFixedBlock[]): ScheduleCoordinates | null => {
  const sortedFixed = fixed
    .filter((block) => block.coords)
    .slice()
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  if (sortedFixed.length > 0) return sortedFixed[0]!.coords ?? null;

  const coords = items.map((item) => item.coords).filter(Boolean) as ScheduleCoordinates[];
  if (coords.length === 0) return null;
  const sum = coords.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / coords.length, lng: sum.lng / coords.length };
};

const orderByNearestNeighbor = (items: ScheduleItem[], start: ScheduleCoordinates | null): ScheduleItem[] => {
  const withCoords = items.filter((item) => item.coords) as Array<ScheduleItem & { coords: ScheduleCoordinates }>;
  const withoutCoords = items.filter((item) => !item.coords);

  if (withCoords.length <= 1) {
    return [...withCoords, ...withoutCoords.sort((a, b) => a.name.localeCompare(b.name) || a.itineraryActivityId.localeCompare(b.itineraryActivityId))];
  }

  const remaining = new Map<string, ScheduleItem & { coords: ScheduleCoordinates }>(
    withCoords.map((item) => [item.itineraryActivityId, item])
  );

  const seed = (() => {
    if (!start) {
      const sorted = [...withCoords].sort((a, b) => a.coords.lng - b.coords.lng || a.coords.lat - b.coords.lat || a.itineraryActivityId.localeCompare(b.itineraryActivityId));
      return sorted[0]!;
    }
    let best: { item: ScheduleItem & { coords: ScheduleCoordinates }; dist: number } | null = null;
    for (const item of withCoords) {
      const dist = distanceMetersBetween(start, item.coords);
      if (!best || dist < best.dist || (dist === best.dist && item.itineraryActivityId < best.item.itineraryActivityId)) {
        best = { item, dist };
      }
    }
    return best!.item;
  })();

  const ordered: ScheduleItem[] = [];
  let current = seed;
  remaining.delete(current.itineraryActivityId);
  ordered.push(current);

  while (remaining.size > 0) {
    let best: { item: ScheduleItem & { coords: ScheduleCoordinates }; dist: number } | null = null;
    for (const item of remaining.values()) {
      const dist = distanceMetersBetween(current.coords, item.coords);
      if (!best || dist < best.dist || (dist === best.dist && item.itineraryActivityId < best.item.itineraryActivityId)) {
        best = { item, dist };
      }
    }
    current = best!.item;
    remaining.delete(current.itineraryActivityId);
    ordered.push(current);
  }

  return [...ordered, ...withoutCoords.sort((a, b) => a.name.localeCompare(b.name) || a.itineraryActivityId.localeCompare(b.itineraryActivityId))];
};

const pickInitialCentroids = (points: Array<{ id: string; coords: ScheduleCoordinates }>, k: number) => {
  const sorted = points
    .slice()
    .sort((a, b) => a.coords.lat - b.coords.lat || a.coords.lng - b.coords.lng || a.id.localeCompare(b.id));
  const first = sorted[0]!;
  const centroids: Array<{ lat: number; lng: number }> = [{ lat: first.coords.lat, lng: first.coords.lng }];

  while (centroids.length < k) {
    let best: { point: typeof points[number]; score: number } | null = null;

    for (const point of sorted) {
      const minDist = Math.min(
        ...centroids.map((c) => distanceMetersBetween(point.coords, { lat: c.lat, lng: c.lng }))
      );
      if (!best || minDist > best.score || (minDist === best.score && point.id < best.point.id)) {
        best = { point, score: minDist };
      }
    }

    if (!best) break;
    centroids.push({ lat: best.point.coords.lat, lng: best.point.coords.lng });
  }

  return centroids;
};

const kmeansAssign = (points: Array<{ id: string; coords: ScheduleCoordinates }>, k: number) => {
  const clusterCount = Math.max(1, Math.min(k, points.length));
  const centroids = pickInitialCentroids(points, clusterCount);
  const assignment = new Map<string, number>();

  for (let iter = 0; iter < 8; iter += 1) {
    let changed = false;

    for (const point of points) {
      let bestIndex = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < centroids.length; i += 1) {
        const centroid = centroids[i]!;
        const dist = distanceMetersBetween(point.coords, { lat: centroid.lat, lng: centroid.lng });
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      }
      const prev = assignment.get(point.id);
      if (prev !== bestIndex) {
        assignment.set(point.id, bestIndex);
        changed = true;
      }
    }

    const sums = Array.from({ length: centroids.length }, () => ({ lat: 0, lng: 0, n: 0 }));
    for (const point of points) {
      const idx = assignment.get(point.id) ?? 0;
      const bucket = sums[idx]!;
      bucket.lat += point.coords.lat;
      bucket.lng += point.coords.lng;
      bucket.n += 1;
    }
    for (let i = 0; i < centroids.length; i += 1) {
      const bucket = sums[i]!;
      if (bucket.n === 0) continue;
      centroids[i] = { lat: bucket.lat / bucket.n, lng: bucket.lng / bucket.n };
    }

    if (!changed) break;
  }

  return { assignment, centroids };
};

export const listIsoDatesInRange = (fromDate: string, toDate: string): string[] => {
  if (!isIsoDateString(fromDate) || !isIsoDateString(toDate)) return [];
  if (toDate < fromDate) return [];

  const out: string[] = [];
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return [];

  for (let cursor = from; cursor.getTime() <= to.getTime(); cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
    const iso = cursor.toISOString().slice(0, 10);
    out.push(iso);
  }

  return out;
};

export const autoScheduleActivities = (args: {
  datePool: string[];
  items: ScheduleItem[];
  fixed: ScheduleFixedBlock[];
  dayStartMin?: number;
  dayEndMin?: number;
  stepMin?: number;
  bufferMin?: number;
  metersPerMinute?: number;
}): AutoScheduleResult => {
  const datePool = (args.datePool ?? []).filter((date) => isIsoDateString(date)).sort();
  if (datePool.length === 0) return { placements: [], unplaced: [] };

  const dayStartMin = clampMinute(args.dayStartMin ?? 10 * 60);
  const dayEndMin = clampMinute(args.dayEndMin ?? 18 * 60);
  const stepMin = Math.max(1, Math.floor(args.stepMin ?? 5));
  const bufferMin = Math.max(0, Math.floor(args.bufferMin ?? 10));
  const metersPerMinute = Math.max(1, Math.floor(args.metersPerMinute ?? 75)); // ~4.5 km/h

  const items = (args.items ?? [])
    .map((item) => ({
      ...item,
      itineraryActivityId: normalizeId(item.itineraryActivityId),
      name: String(item.name ?? "").trim() || `Activity ${normalizeId(item.itineraryActivityId) || "unknown"}`,
      durationMin: Math.max(15, Math.min(8 * 60, Math.floor(item.durationMin || 60))),
      preferredDate: item.preferredDate && isIsoDateString(item.preferredDate) ? item.preferredDate : null,
      openHours: Array.isArray(item.openHours) ? item.openHours : null,
    }))
    .filter((item) => item.itineraryActivityId);

  const fixedByDate = new Map<string, Array<{ startMin: number; endMin: number; coords: ScheduleCoordinates | null }>>();
  for (const block of args.fixed ?? []) {
    if (!isIsoDateString(block.date)) continue;
    const startMin = clampMinute(block.startMin);
    const endMin = clampMinute(block.endMin);
    if (endMin <= startMin) continue;
    const list = fixedByDate.get(block.date) ?? [];
    list.push({ startMin, endMin, coords: block.coords ?? null });
    fixedByDate.set(block.date, list);
  }
  for (const list of fixedByDate.values()) {
    list.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  }

  const assignedById = new Map<string, string>();
  const remaining: ScheduleItem[] = [];

  for (const item of items) {
    if (item.preferredDate && datePool.includes(item.preferredDate)) {
      assignedById.set(item.itineraryActivityId, item.preferredDate);
    } else {
      remaining.push(item);
    }
  }

  if (remaining.length > 0) {
    const points = remaining
      .filter((item) => item.coords)
      .map((item) => ({ id: item.itineraryActivityId, coords: item.coords! }));

    const kTarget = Math.min(datePool.length, Math.max(1, Math.ceil(remaining.length / 4)));
    const k = points.length > 0 ? Math.min(kTarget, points.length) : 0;

    if (k > 0) {
      const { assignment } = kmeansAssign(points, k);
      const clusters = new Map<number, ScheduleItem[]>();
      for (const item of remaining) {
        const idx = item.coords ? (assignment.get(item.itineraryActivityId) ?? 0) : null;
        if (idx == null) continue;
        const list = clusters.get(idx) ?? [];
        list.push(item);
        clusters.set(idx, list);
      }

      const loadByDate = new Map<string, number>();
      for (const date of datePool) {
        const reserved = fixedByDate.get(date) ?? [];
        const reservedMinutes = reserved.reduce((sum, block) => sum + (block.endMin - block.startMin), 0);
        loadByDate.set(date, reservedMinutes);
      }

      const clusterEntries = Array.from(clusters.entries()).sort((a, b) => b[1].length - a[1].length || a[0] - b[0]);

      const usedDates: string[] = [];
      for (const [, list] of clusterEntries) {
        const clusterDuration = list.reduce((sum, item) => sum + item.durationMin + bufferMin, 0);
        const date = datePool
          .slice()
          .sort((a, b) => (loadByDate.get(a) ?? 0) - (loadByDate.get(b) ?? 0) || a.localeCompare(b))[0]!;
        usedDates.push(date);
        loadByDate.set(date, (loadByDate.get(date) ?? 0) + clusterDuration);
        for (const item of list) {
          assignedById.set(item.itineraryActivityId, date);
        }
      }
    }

    // Any remaining without coordinates (or if no coords at all): fill least-loaded dates.
    for (const item of remaining) {
      if (assignedById.has(item.itineraryActivityId)) continue;
      const date = datePool
        .slice()
        .sort((a, b) => (fixedByDate.get(a)?.length ?? 0) - (fixedByDate.get(b)?.length ?? 0) || a.localeCompare(b))[0]!;
      assignedById.set(item.itineraryActivityId, date);
    }
  }

  const itemsByDate = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const date = assignedById.get(item.itineraryActivityId);
    if (!date) continue;
    const list = itemsByDate.get(date) ?? [];
    list.push(item);
    itemsByDate.set(date, list);
  }

  const spillover: ScheduleItem[] = [];
  const placements: AutoSchedulePlacement[] = [];
  const unplaced: Array<{ itineraryActivityId: string; reason: string }> = [];

  for (const date of datePool) {
    const list = [...(itemsByDate.get(date) ?? []), ...spillover.splice(0, spillover.length)];
    if (list.length === 0) continue;

    const fixed = fixedByDate.get(date) ?? [];
    const reserved = fixed.map((block) => ({ startMin: block.startMin, endMin: block.endMin }));

    const startCoord = pickStartCoord(list, fixed.map((block) => ({ ...block, date })));
    const ordered = orderByNearestNeighbor(list, startCoord);

    let cursorMin = dayStartMin;
    let cursorCoord: ScheduleCoordinates | null = startCoord;

    for (const item of ordered) {
      const travelMin = estimateTravelMinutes(cursorCoord, item.coords, metersPerMinute);
      const desiredStart = cursorMin + travelMin + bufferMin;

      const openIntervals =
        item.openHours && item.openHours.length > 0
          ? getOpenIntervalsForDay(item.openHours, getDayOfWeekFromIsoDate(date))
          : null;

      const startMin = findNextAvailableStart({
        desiredStartMin: Math.max(dayStartMin, desiredStart),
        durationMin: item.durationMin,
        reserved,
        openIntervals,
        dayEndMin,
        stepMin,
      });

      if (startMin == null) {
        spillover.push({ ...item, preferredDate: null });
        continue;
      }

      const endMin = startMin + item.durationMin;
      reserved.push({ startMin, endMin });
      reserved.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

      const reasons: string[] = [];
      if (item.coords) reasons.push("Grouped nearby stops");
      if (openIntervals && openIntervals.length > 0) {
        const openOk = isOpenForWindow(openIntervals, startMin, endMin);
        if (openOk) reasons.push("Fits opening hours");
      }

      placements.push({
        itineraryActivityId: item.itineraryActivityId,
        date,
        startMin,
        endMin,
        startTime: formatMinutesToHHmm(startMin),
        endTime: formatMinutesToHHmm(endMin),
        reasons,
      });

      cursorMin = endMin;
      cursorCoord = item.coords ?? cursorCoord;
    }
  }

  for (const item of spillover) {
    unplaced.push({
      itineraryActivityId: item.itineraryActivityId,
      reason: "Not enough time in the available day range.",
    });
  }

  return { placements, unplaced };
};
