export type OpenHoursRow = {
  day: number;
  open_hour: number | null;
  open_minute: number | null;
  close_hour: number | null;
  close_minute: number | null;
};

export type OpenInterval = {
  startMin: number;
  endMin: number;
};

const clampMinute = (value: number) => Math.max(0, Math.min(24 * 60, Math.floor(value)));

const toMinutes = (hh: number | null, mm: number | null) => {
  if (hh == null || mm == null) return null;
  const hours = Number(hh);
  const minutes = Number(mm);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export const getOpenIntervalsForDay = (rows: OpenHoursRow[], dayOfWeek: number): OpenInterval[] => {
  const day = Number(dayOfWeek);
  if (!Number.isFinite(day) || day < 0 || day > 6) return [];
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const intervals: OpenInterval[] = [];

  for (const row of rows) {
    if (!row) continue;
    if (Number(row.day) !== day) continue;

    const openMin = toMinutes(row.open_hour, row.open_minute);
    const closeMin = toMinutes(row.close_hour, row.close_minute);
    if (openMin == null || closeMin == null) continue;

    if (openMin === closeMin) continue;

    // Overnight hours: split into [open, 24h) and [0, close)
    if (closeMin < openMin) {
      intervals.push({ startMin: clampMinute(openMin), endMin: 24 * 60 });
      intervals.push({ startMin: 0, endMin: clampMinute(closeMin) });
      continue;
    }

    intervals.push({ startMin: clampMinute(openMin), endMin: clampMinute(closeMin) });
  }

  // Merge overlaps for simpler checks.
  intervals.sort((a, b) => a.startMin - b.startMin);
  const merged: OpenInterval[] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(interval);
      continue;
    }
    if (interval.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, interval.endMin);
      continue;
    }
    merged.push(interval);
  }

  return merged;
};

export const isOpenForWindow = (intervals: OpenInterval[], startMin: number, endMin: number): boolean => {
  const start = clampMinute(startMin);
  const end = clampMinute(endMin);
  if (end <= start) return false;
  if (!Array.isArray(intervals) || intervals.length === 0) return false;

  return intervals.some((interval) => start >= interval.startMin && end <= interval.endMin);
};

export const suggestNextOpenStart = (
  intervals: OpenInterval[],
  desiredStartMin: number,
  durationMin: number
): number | null => {
  if (!Array.isArray(intervals) || intervals.length === 0) return null;
  const duration = Math.max(1, Math.floor(durationMin));
  const desired = clampMinute(desiredStartMin);

  let best: { startMin: number; delta: number } | null = null;

  for (const interval of intervals) {
    const latestStart = interval.endMin - duration;
    if (latestStart < interval.startMin) continue;

    const candidateStart = desired <= interval.startMin ? interval.startMin : Math.min(desired, latestStart);
    const delta = Math.abs(candidateStart - desired);
    if (!best || delta < best.delta) {
      best = { startMin: candidateStart, delta };
    }
  }

  return best ? clampMinute(best.startMin) : null;
};

