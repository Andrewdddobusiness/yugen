import { foodTypes, historicalTypes, shoppingTypes } from "@/lib/googleMaps/includedTypes";
import { formatMinutesToHHmm, isIsoDateString, parseTimeToMinutes } from "@/lib/ai/itinerary/intelligence/time";
import { z } from "zod";

export type ItineraryPace = "relaxed" | "balanced" | "packed";

export type ItineraryInterest = "shopping" | "sights" | "museums" | "food" | "nightlife" | "nature";

export type ItineraryTravelMode = "walking" | "driving" | "transit" | "bicycling";

export type AiItineraryPreferencesV1 = {
  version: 1;
  pace?: ItineraryPace;
  day_start?: string;
  day_end?: string;
  interests?: ItineraryInterest[];
  travel_mode?: ItineraryTravelMode;
};

export const AiItineraryPreferencesV1Schema = z.object({
  version: z.literal(1),
  pace: z.enum(["relaxed", "balanced", "packed"]).optional(),
  day_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  day_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  interests: z
    .array(z.enum(["shopping", "sights", "museums", "food", "nightlife", "nature"]))
    .max(10)
    .optional(),
  travel_mode: z.enum(["walking", "driving", "transit", "bicycling"]).optional(),
});

export type InferredPreferences = {
  pace: ItineraryPace;
  dayStart: string; // HH:MM
  dayEnd: string; // HH:MM
  interests: ItineraryInterest[]; // ordered high → low
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
  const scores = new Map<ItineraryInterest, number>();
  const bump = (key: ItineraryInterest) => scores.set(key, (scores.get(key) ?? 0) + 1);

  for (const row of rows) {
    const types: string[] = Array.isArray(row?.activity?.types)
      ? row.activity.types.map((t: any) => String(t)).filter(Boolean)
      : [];

    const hasFood = types.some((t) => foodTypes.includes(t));
    const hasShopping = types.some((t) => shoppingTypes.includes(t));
    const hasMuseums = types.some((t) => t === "museum" || t === "art_gallery");
    const hasSights = types.some((t) => historicalTypes.includes(t) && t !== "museum" && t !== "art_gallery");
    const hasNature = types.some((t) => t === "national_park" || t === "park" || t === "hiking_area" || t === "beach");
    const hasNightlife = types.some((t) => t === "night_club" || t === "casino" || t === "bar");

    if (hasFood) bump("food");
    if (hasShopping) bump("shopping");
    if (hasSights) bump("sights");
    if (hasMuseums) bump("museums");
    if (hasNature) bump("nature");
    if (hasNightlife) bump("nightlife");
  }

  const priority: ItineraryInterest[] = ["sights", "museums", "food", "shopping", "nature", "nightlife"];

  return Array.from(scores.entries())
    .sort((a, b) => {
      const score = b[1] - a[1];
      if (score !== 0) return score;
      return priority.indexOf(a[0]) - priority.indexOf(b[0]);
    })
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

export const parseAiItineraryPreferences = (value: unknown): AiItineraryPreferencesV1 | null => {
  const parsed = AiItineraryPreferencesV1Schema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const getAiItineraryPreferencesFromProfile = (profilePreferences: unknown): AiItineraryPreferencesV1 | null => {
  if (!profilePreferences || typeof profilePreferences !== "object") return null;
  const raw = (profilePreferences as any).ai_itinerary;
  return parseAiItineraryPreferences(raw);
};

export const extractPreferenceHintsFromMessage = (message: string): Partial<InferredPreferences> => {
  const text = String(message ?? "").toLowerCase();
  const hints: Partial<InferredPreferences> = {};

  if (/\b(relaxed|chill|easy)\b/.test(text)) hints.pace = "relaxed";
  if (/\b(packed|busy|full|intense)\b/.test(text)) hints.pace = "packed";

  const interests: ItineraryInterest[] = [];
  if (/\b(shopping|shops|mall)\b/.test(text)) interests.push("shopping");
  if (/\b(food|eat|restaurant|cafe|coffee|dinner|lunch)\b/.test(text)) interests.push("food");
  if (/\b(museum|gallery|exhibit)\b/.test(text)) interests.push("museums");
  if (/\b(sight|landmark|attraction|historic|tour)\b/.test(text)) interests.push("sights");
  if (/\b(nightlife|bar|club|party|drinks?)\b/.test(text)) interests.push("nightlife");
  if (/\b(nature|hike|hiking|park|beach|outdoors?)\b/.test(text)) interests.push("nature");
  if (interests.length > 0) hints.interests = Array.from(new Set(interests));

  return hints;
};

export type PreferencesSource = "explicit" | "inferred" | "default";

export type EffectivePreferences = {
  pace: ItineraryPace;
  dayStart: string; // HH:MM
  dayEnd: string; // HH:MM
  interests: ItineraryInterest[];
  travelMode: ItineraryTravelMode;
};

const DEFAULT_PREFERENCES: EffectivePreferences = {
  pace: "balanced",
  dayStart: "09:00",
  dayEnd: "18:00",
  interests: [],
  travelMode: "walking",
};

export const mergeEffectivePreferences = (args: {
  explicitProfile: AiItineraryPreferencesV1 | null;
  inferred: InferredPreferences;
  messageHints?: Partial<InferredPreferences>;
}): { preferences: EffectivePreferences; source: PreferencesSource } => {
  const explicit = args.explicitProfile;

  const hasExplicit =
    !!explicit &&
    (explicit.pace != null ||
      explicit.day_start != null ||
      explicit.day_end != null ||
      (Array.isArray(explicit.interests) && explicit.interests.length > 0) ||
      explicit.travel_mode != null);

  const base: EffectivePreferences = {
    ...DEFAULT_PREFERENCES,
    pace: args.inferred.pace,
    dayStart: args.inferred.dayStart,
    dayEnd: args.inferred.dayEnd,
    interests: Array.isArray(args.inferred.interests) ? args.inferred.interests : [],
  };

  const fromExplicit: Partial<EffectivePreferences> = hasExplicit
    ? {
        ...(explicit?.pace ? { pace: explicit.pace } : {}),
        ...(explicit?.day_start ? { dayStart: explicit.day_start } : {}),
        ...(explicit?.day_end ? { dayEnd: explicit.day_end } : {}),
        ...(Array.isArray(explicit?.interests) ? { interests: explicit!.interests! } : {}),
        ...(explicit?.travel_mode ? { travelMode: explicit.travel_mode } : {}),
      }
    : {};

  const merged = {
    ...base,
    ...fromExplicit,
  };

  if (args.messageHints?.pace) merged.pace = args.messageHints.pace;
  if (args.messageHints?.interests && args.messageHints.interests.length > 0) {
    merged.interests = args.messageHints.interests as ItineraryInterest[];
  }

  return { preferences: merged, source: hasExplicit ? "explicit" : "inferred" };
};

export const buildPreferencesPromptLines = (args: {
  preferences: EffectivePreferences;
  source: PreferencesSource;
}): string[] => {
  const lines: string[] = [
    `Preferences source: ${args.source}`,
    `Pace: ${args.preferences.pace}`,
    `Typical day window: ${args.preferences.dayStart}–${args.preferences.dayEnd}`,
    `Travel mode: ${args.preferences.travelMode}`,
  ];

  if (args.preferences.interests.length > 0) {
    lines.push(`Interests: ${args.preferences.interests.join(", ")}`);
  }

  return lines;
};
