import { foodTypes, historicalTypes, shoppingTypes } from "@/lib/googleMaps/includedTypes";
import { formatMinutesToHHmm, isIsoDateString, parseTimeToMinutes } from "@/lib/ai/itinerary/intelligence/time";

export type ItineraryPace = "relaxed" | "balanced" | "packed";

export type InferredPreferences = {
  pace: ItineraryPace;
  dayStart: string; // HH:MM
  dayEnd: string; // HH:MM
  interests: string[]; // ordered high → low
};

const median = (values: number[]) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const lo = sorted[mid - 1];
  const hi = sorted[mid];
  if (typeof lo !== "number" || typeof hi !== "number") return null;
  return Math.round((lo + hi) / 2);
};

const inferPace = (countsByDay: number[]): ItineraryPace => {
  if (countsByDay.length === 0) return "balanced";
  const avg = countsByDay.reduce((sum, value) => sum + value, 0) / countsByDay.length;
  if (avg >= 6) return "packed";
  if (avg <= 3) return "relaxed";
  return "balanced";
};

const scoreInterests = (rows: any[]) => {
  const scores = new Map<string, number>();
  const bump = (key: string) => scores.set(key, (scores.get(key) ?? 0) + 1);

  for (const row of rows) {
    const types: string[] = Array.isArray(row?.activity?.types)
      ? row.activity.types.map((t: any) => String(t)).filter(Boolean)
      : [];

    const hasFood = types.some((t) => foodTypes.includes(t));
    const hasShopping = types.some((t) => shoppingTypes.includes(t));
    const hasSights = types.some((t) => historicalTypes.includes(t));

    if (hasFood) bump("food");
    if (hasShopping) bump("shopping");
    if (hasSights) bump("sights");
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);
};

export const inferPreferencesFromActivities = (activities: any[]): InferredPreferences => {
  const rows = Array.isArray(activities) ? activities : [];

  const startMinutes: number[] = [];
  const endMinutes: number[] = [];
  const countByDate = new Map<string, number>();

  for (const row of rows) {
    const date = row?.date;
    if (!isIsoDateString(date)) continue;

    const startMin = parseTimeToMinutes(row?.start_time);
    const endMin = parseTimeToMinutes(row?.end_time);
    if (startMin != null) startMinutes.push(startMin);
    if (endMin != null) endMinutes.push(endMin);

    countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
  }

  const startMedian = median(startMinutes) ?? 9 * 60;
  const endMedian = median(endMinutes) ?? 18 * 60;

  const counts = Array.from(countByDate.values());
  const pace = inferPace(counts);
  const interests = scoreInterests(rows).slice(0, 3);

  return {
    pace,
    dayStart: formatMinutesToHHmm(startMedian),
    dayEnd: formatMinutesToHHmm(endMedian),
    interests,
  };
};

export const extractPreferenceHintsFromMessage = (message: string): Partial<InferredPreferences> => {
  const text = String(message ?? "").toLowerCase();
  const hints: Partial<InferredPreferences> = {};

  if (/\b(relaxed|chill|easy)\b/.test(text)) hints.pace = "relaxed";
  if (/\b(packed|busy|full|intense)\b/.test(text)) hints.pace = "packed";

  const interests: string[] = [];
  if (/\b(shopping|shops|mall)\b/.test(text)) interests.push("shopping");
  if (/\b(food|eat|restaurant|cafe|coffee|dinner|lunch)\b/.test(text)) interests.push("food");
  if (/\b(museum|gallery|sight|landmark|attraction|historic)\b/.test(text)) interests.push("sights");
  if (interests.length > 0) hints.interests = Array.from(new Set(interests));

  return hints;
};

export const buildPreferencesPromptLines = (args: {
  inferred: InferredPreferences;
  explicit?: Partial<InferredPreferences>;
}): string[] => {
  const pace = args.explicit?.pace ?? args.inferred.pace;
  const interests = args.explicit?.interests?.length ? args.explicit.interests : args.inferred.interests;

  const lines: string[] = [
    `Pace: ${pace}`,
    `Typical day window: ${args.inferred.dayStart}–${args.inferred.dayEnd}`,
  ];

  if (interests && interests.length > 0) {
    lines.push(`Interests: ${interests.join(", ")}`);
  }

  return lines;
};

