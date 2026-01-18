import { parseTimeToMinutes } from "@/lib/ai/itinerary/intelligence/time";

export type ScheduledRow = {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type AdjacentSegment = {
  date: string;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  fromEndMin: number;
  toStartMin: number;
  gapMinutes: number;
};

export const buildAdjacentSegmentsForDate = (args: { date: string; rows: ScheduledRow[] }): AdjacentSegment[] => {
  const date = String(args.date ?? "").trim();
  if (!date) return [];

  const scheduled = (args.rows ?? [])
    .map((row) => {
      const startMin = parseTimeToMinutes(row.startTime);
      const endMin = parseTimeToMinutes(row.endTime);
      if (startMin == null || endMin == null) return null;
      if (endMin <= startMin) return null;
      return {
        id: String(row.id ?? "").trim(),
        name: String(row.name ?? "").trim() || `Activity ${String(row.id ?? "").trim() || "unknown"}`,
        startMin,
        endMin,
      };
    })
    .filter(Boolean) as Array<{ id: string; name: string; startMin: number; endMin: number }>;

  scheduled.sort((a, b) => a.startMin - b.startMin || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const segments: AdjacentSegment[] = [];
  for (let i = 0; i < scheduled.length - 1; i += 1) {
    const from = scheduled[i]!;
    const to = scheduled[i + 1]!;
    const gapMinutes = to.startMin - from.endMin;
    segments.push({
      date,
      fromId: from.id,
      toId: to.id,
      fromName: from.name,
      toName: to.name,
      fromEndMin: from.endMin,
      toStartMin: to.startMin,
      gapMinutes,
    });
  }

  return segments;
};

