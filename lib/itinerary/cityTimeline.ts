import { addDays, format as formatDate, isValid, parseISO } from "date-fns";
import type { ItineraryDestinationSummary } from "@/actions/supabase/destinations";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateKey = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const key = value.trim().slice(0, 10);
  if (!ISO_DATE_RE.test(key)) return null;
  return key;
};

const parseIsoDate = (value: string): Date | null => {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

const normalizeDestinations = (destinations: ItineraryDestinationSummary[]) => {
  const normalized = destinations
    .map((destination) => {
      const from = normalizeDateKey(destination.from_date);
      const to = normalizeDateKey(destination.to_date);
      const city = typeof destination.city === "string" ? destination.city.trim() : "";

      if (!from || !to || !city) return null;

      return {
        itinerary_destination_id: destination.itinerary_destination_id,
        city,
        country: destination.country,
        from_date: from,
        to_date: to,
        order_number: destination.order_number ?? 0,
      };
    })
    .filter((destination): destination is NonNullable<typeof destination> => Boolean(destination));

  normalized.sort((a, b) => {
    if (a.order_number !== b.order_number) return a.order_number - b.order_number;
    return a.from_date.localeCompare(b.from_date);
  });

  return normalized;
};

export function getCityLabelForDateKey(
  dateKey: string,
  destinations: ItineraryDestinationSummary[]
): string | null {
  const key = normalizeDateKey(dateKey);
  if (!key) return null;

  const normalizedDestinations = normalizeDestinations(destinations);

  for (let index = 0; index < normalizedDestinations.length; index += 1) {
    const destination = normalizedDestinations[index];
    if (key < destination.from_date || key > destination.to_date) continue;

    const previous = normalizedDestinations[index - 1] ?? null;
    if (key === destination.from_date && previous && previous.city !== destination.city) {
      return `${previous.city} → ${destination.city}`;
    }

    return destination.city;
  }

  // If the day is between destinations (gap), treat the first gap day as travel.
  for (let index = 0; index < normalizedDestinations.length - 1; index += 1) {
    const previous = normalizedDestinations[index];
    const next = normalizedDestinations[index + 1];

    if (key <= previous.to_date) continue;
    if (key >= next.from_date) continue;
    if (previous.city === next.city) return previous.city;

    const previousEnd = parseIsoDate(previous.to_date);
    if (!previousEnd) return null;

    const travelDay = formatDate(addDays(previousEnd, 1), "yyyy-MM-dd");
    if (travelDay === key) {
      return `${previous.city} → ${next.city}`;
    }
  }

  return null;
}

