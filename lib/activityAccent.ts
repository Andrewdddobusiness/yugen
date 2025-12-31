export type ActivityAccent = "brand" | "teal" | "amber" | "coral" | "lime" | "tan";

export type ActivityCategory =
  | "food"
  | "sights"
  | "shopping"
  | "nature"
  | "entertainment"
  | "lodging"
  | "transport"
  | "other";

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  food: "Food & drink",
  sights: "Sights",
  shopping: "Shopping",
  nature: "Nature",
  entertainment: "Entertainment",
  lodging: "Lodging",
  transport: "Transport",
  other: "Other",
};

export const DEFAULT_ACTIVITY_CATEGORY_ACCENTS: Record<ActivityCategory, ActivityAccent> = {
  food: "amber",
  sights: "brand",
  shopping: "teal",
  nature: "lime",
  entertainment: "coral",
  lodging: "tan",
  transport: "amber",
  other: "brand",
};

const containsAny = (values: string[], needles: string[]) =>
  needles.some((needle) => values.some((value) => value.includes(needle)));

export function getActivityCategory(types?: string[]): ActivityCategory {
  const normalized = (types ?? []).map((type) => type.toLowerCase());
  if (normalized.length === 0) return "other";

  if (
    containsAny(normalized, [
      "restaurant",
      "food",
      "meal",
      "cafe",
      "bar",
      "bakery",
      "meal_takeaway",
      "meal_delivery",
      "ice_cream",
    ])
  ) {
    return "food";
  }

  if (
    containsAny(normalized, [
      "tourist_attraction",
      "museum",
      "landmark",
      "art_gallery",
      "aquarium",
      "zoo",
      "church",
      "synagogue",
      "mosque",
      "place_of_worship",
      "point_of_interest",
    ])
  ) {
    return "sights";
  }

  if (
    containsAny(normalized, [
      "shopping",
      "store",
      "mall",
      "shopping_mall",
      "department_store",
      "clothing_store",
      "supermarket",
      "convenience_store",
      "grocery",
    ])
  ) {
    return "shopping";
  }

  if (
    containsAny(normalized, [
      "park",
      "natural_feature",
      "beach",
      "campground",
      "hiking",
      "outdoor",
      "garden",
    ])
  ) {
    return "nature";
  }

  if (
    containsAny(normalized, [
      "entertainment",
      "night_club",
      "amusement",
      "amusement_park",
      "movie_theater",
      "bowling",
      "casino",
      "stadium",
      "tour",
    ])
  ) {
    return "entertainment";
  }

  if (containsAny(normalized, ["lodging", "hotel", "motel", "accommodation", "hostel"])) {
    return "lodging";
  }

  if (
    containsAny(normalized, [
      "transit",
      "transport",
      "airport",
      "train_station",
      "subway_station",
      "bus_station",
      "taxi_stand",
      "car_rental",
      "parking",
    ])
  ) {
    return "transport";
  }

  return "other";
}

const hashToAccent = (activityId: unknown): ActivityAccent => {
  const accents: ActivityAccent[] = ["brand", "teal", "amber", "tan", "lime", "coral"];
  const activityIdString = activityId == null ? "" : String(activityId);
  const hash = activityIdString.split("").reduce((accumulator, character) => {
    // eslint-disable-next-line no-param-reassign
    accumulator = (accumulator << 5) - accumulator + character.charCodeAt(0);
    // eslint-disable-next-line no-param-reassign
    return accumulator & accumulator;
  }, 0);

  return accents[Math.abs(hash) % accents.length];
};

export function getActivityAccentForTypes(
  types: string[] | undefined,
  activityId: unknown,
  categoryAccents?: Partial<Record<ActivityCategory, ActivityAccent>>
): ActivityAccent {
  const category = getActivityCategory(types);
  if (category !== "other") {
    return (categoryAccents?.[category] ?? DEFAULT_ACTIVITY_CATEGORY_ACCENTS[category]) as ActivityAccent;
  }

  return hashToAccent(activityId);
}

export const ACTIVITY_ACCENT_DOT_CLASSES: Record<ActivityAccent, string> = {
  brand: "bg-brand-500",
  teal: "bg-teal-500",
  amber: "bg-amber-500",
  coral: "bg-coral-500",
  lime: "bg-lime-500",
  tan: "bg-tan-500",
};

export const ACTIVITY_ACCENT_BORDER_CLASSES: Record<ActivityAccent, string> = {
  brand: "border-l-brand-500",
  teal: "border-l-teal-500",
  amber: "border-l-amber-500",
  coral: "border-l-coral-500",
  lime: "border-l-lime-500",
  tan: "border-l-tan-500",
};

export const ACTIVITY_ACCENT_TINT_CLASSES: Record<ActivityAccent, string> = {
  brand: "bg-brand-500/10",
  teal: "bg-teal-500/10",
  amber: "bg-amber-500/10",
  coral: "bg-coral-500/10",
  lime: "bg-lime-500/10",
  tan: "bg-tan-500/10",
};

export type ActivityTheme = { accent: ActivityAccent; customHex?: string };

const normalizeHexColor = (hex: string): string | null => {
  let value = hex.trim();
  if (!value) return null;
  if (!value.startsWith("#")) value = `#${value}`;

  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
  return null;
};

export const hexToRgba = (hex: string, alpha: number): string | null => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  const a = Math.max(0, Math.min(1, alpha));

  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export function getActivityThemeForTypes(
  types: string[] | undefined,
  activityId: unknown,
  categoryAccents?: Partial<Record<ActivityCategory, ActivityAccent>>,
  categoryCustomColors?: Partial<Record<ActivityCategory, string>>
): ActivityTheme {
  const category = getActivityCategory(types);
  if (category !== "other") {
    const accent = (categoryAccents?.[category] ?? DEFAULT_ACTIVITY_CATEGORY_ACCENTS[category]) as ActivityAccent;
    const customHex = categoryCustomColors?.[category];
    const normalized = customHex ? normalizeHexColor(customHex) : null;
    return normalized ? { accent, customHex: normalized } : { accent };
  }

  // For uncategorized activities, keep a stable accent (no custom colors).
  return { accent: hashToAccent(activityId) };
}
