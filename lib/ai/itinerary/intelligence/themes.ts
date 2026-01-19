import { foodTypes, historicalTypes, shoppingTypes } from "@/lib/googleMaps/includedTypes";

export type DayThemeKey = "shopping" | "sights" | "museums" | "food" | "nightlife" | "nature" | "mixed";

const uniqTypes = (types: unknown): string[] => {
  if (!Array.isArray(types)) return [];
  return Array.from(
    new Set(
      types
        .map((t) => String(t ?? "").trim())
        .filter(Boolean)
        .map((t) => t.toLowerCase())
    )
  );
};

const museumTypes = new Set(["museum", "art_gallery"]);
const nightlifeTypes = new Set(["night_club", "casino", "bar"]);
const natureTypes = new Set([
  "national_park",
  "park",
  "hiking_area",
  "beach",
  "natural_feature",
  "campground",
  "zoo",
  "aquarium",
]);

const sightsTypes = new Set(
  historicalTypes
    .map((t) => t.toLowerCase())
    .filter((t) => !museumTypes.has(t) && !natureTypes.has(t))
);

export const classifyThemesFromTypes = (types: unknown): DayThemeKey[] => {
  const list = uniqTypes(types);
  if (list.length === 0) return [];

  const hasFood = list.some((t) => foodTypes.includes(t));
  const hasShopping = list.some((t) => shoppingTypes.includes(t));
  const hasMuseums = list.some((t) => museumTypes.has(t));
  const hasNightlife = list.some((t) => nightlifeTypes.has(t));
  const hasNature = list.some((t) => natureTypes.has(t));
  const hasSights = list.some((t) => sightsTypes.has(t));

  const themes: DayThemeKey[] = [];
  if (hasShopping) themes.push("shopping");
  if (hasMuseums) themes.push("museums");
  if (hasSights) themes.push("sights");
  if (hasFood) themes.push("food");
  if (hasNightlife) themes.push("nightlife");
  if (hasNature) themes.push("nature");

  return themes;
};

export const primaryThemeFromTypes = (types: unknown): DayThemeKey | null => {
  const themes = classifyThemesFromTypes(types);
  if (themes.length === 0) return null;
  if (themes.length === 1) return themes[0];

  const priority: DayThemeKey[] = ["shopping", "museums", "sights", "food", "nightlife", "nature"];
  for (const key of priority) {
    if (themes.includes(key)) return key;
  }
  return themes[0];
};

export const inferDayThemeFromMessage = (message: string): DayThemeKey | null => {
  const text = String(message ?? "").toLowerCase();
  if (!text.trim()) return null;

  const wantsShopping = /\b(shopping|shops?|malls?|boutiques?|markets?)\b/.test(text);
  const wantsFood = /\b(food|eat|restaurant|restaurants|cafe|cafes|coffee|dinner|lunch|breakfast)\b/.test(text);
  const wantsMuseums = /\b(museum|museums|gallery|galleries|exhibit|exhibits)\b/.test(text);
  const wantsSights = /\b(sight|sights|landmark|landmarks|attraction|attractions|historic|tour|tours)\b/.test(text);
  const wantsNightlife = /\b(nightlife|bar|bars|club|clubs|party|drinks?)\b/.test(text);
  const wantsNature = /\b(nature|hike|hiking|park|parks|beach|beaches|outdoors?)\b/.test(text);

  const hits: DayThemeKey[] = [];
  if (wantsShopping) hits.push("shopping");
  if (wantsMuseums) hits.push("museums");
  if (wantsSights) hits.push("sights");
  if (wantsFood) hits.push("food");
  if (wantsNightlife) hits.push("nightlife");
  if (wantsNature) hits.push("nature");

  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0];

  return "mixed";
};
