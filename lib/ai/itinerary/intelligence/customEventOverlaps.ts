import { formatMinutesToHHmm, parseTimeToMinutes } from "@/lib/ai/itinerary/intelligence/time";
import { getCustomEventKindLabel, type ItineraryCustomEventKind } from "@/lib/customEvents/kinds";

export type CustomEventOverlapPlannedItem = {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type CustomEventOverlapBlock = {
  id: string;
  title: string;
  kind?: ItineraryCustomEventKind | null;
  date: string;
  startTime: string;
  endTime: string;
};

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart;

export function buildCustomEventOverlapWarnings(args: {
  planned: CustomEventOverlapPlannedItem[];
  blocks: CustomEventOverlapBlock[];
  maxWarnings?: number;
}): string[] {
  const maxWarnings = Math.max(1, Math.min(25, Math.floor(args.maxWarnings ?? 8)));

  const blocksByDate = new Map<
    string,
    Array<{
      title: string;
      kind?: ItineraryCustomEventKind | null;
      startMin: number;
      endMin: number;
    }>
  >();

  for (const block of args.blocks) {
    const date = String(block.date ?? "").trim();
    if (!date) continue;
    const startMin = parseTimeToMinutes(block.startTime);
    const endMin = parseTimeToMinutes(block.endTime);
    if (startMin == null || endMin == null) continue;
    if (endMin <= startMin) continue;

    const list = blocksByDate.get(date) ?? [];
    list.push({ title: String(block.title ?? "").trim() || "Custom event", kind: block.kind, startMin, endMin });
    blocksByDate.set(date, list);
  }

  for (const list of blocksByDate.values()) {
    list.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin || a.title.localeCompare(b.title));
  }

  const warnings: string[] = [];
  let suppressed = 0;

  for (const item of args.planned) {
    const date = String(item.date ?? "").trim();
    if (!date) continue;

    const blocksForDate = blocksByDate.get(date);
    if (!blocksForDate || blocksForDate.length === 0) continue;

    const startMin = parseTimeToMinutes(item.startTime);
    const endMin = parseTimeToMinutes(item.endTime);
    if (startMin == null || endMin == null) continue;
    if (endMin <= startMin) continue;

    for (const block of blocksForDate) {
      if (!overlaps(startMin, endMin, block.startMin, block.endMin)) continue;

      if (warnings.length >= maxWarnings) {
        suppressed += 1;
        continue;
      }

      const label = getCustomEventKindLabel(block.kind ?? "custom");
      warnings.push(
        `Overlap on ${date}: "${item.name}" (${formatMinutesToHHmm(startMin)}-${formatMinutesToHHmm(
          endMin
        )}) overlaps ${label} "${block.title}" (${formatMinutesToHHmm(block.startMin)}-${formatMinutesToHHmm(
          block.endMin
        )}).`
      );
    }
  }

  if (suppressed > 0) {
    warnings.push(`Overlap warnings omitted for ${suppressed} other item(s).`);
  }

  return warnings;
}

