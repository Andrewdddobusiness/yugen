"use server";

import type { Coordinates, DatabaseResponse } from "@/types/database";
import { cachedSearch } from "@/lib/cache/searchCache";
import { fetchPlaceDetails, searchPlacesByText } from "@/actions/google/actions";

export type DestinationInsights = {
  description?: string;
  currency?: string;
  languages?: string;
  timeZone?: {
    id: string;
    name?: string;
    utcOffset?: string;
  };
  highlights?: string[];
  heroPhotoPath?: string;
};

type GetDestinationInsightsInput = {
  placeId?: string;
  name: string;
  country: string;
  coordinates: Coordinates;
};

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const formatUtcOffset = (offsetSeconds: number): string => {
  const totalMinutes = Math.round(offsetSeconds / 60);
  const sign = totalMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
};

const fetchTimeZone = async (coordinates: Coordinates) => {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) return null;

  const lat = Number(coordinates.lat);
  const lng = Number(coordinates.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const cacheKey = `timezone:${lat.toFixed(3)},${lng.toFixed(3)}`;

  return cachedSearch(
    cacheKey,
    async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${encodeURIComponent(
        `${lat},${lng}`
      )}&timestamp=${timestamp}&key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      if (data?.status !== "OK") return null;

      const rawOffset = Number(data.rawOffset ?? 0);
      const dstOffset = Number(data.dstOffset ?? 0);
      const offsetSeconds = (Number.isFinite(rawOffset) ? rawOffset : 0) + (Number.isFinite(dstOffset) ? dstOffset : 0);

      const timeZoneId = typeof data.timeZoneId === "string" ? data.timeZoneId : "";
      if (!timeZoneId) return null;

      return {
        id: timeZoneId,
        name: typeof data.timeZoneName === "string" ? data.timeZoneName : undefined,
        utcOffset: formatUtcOffset(offsetSeconds),
      };
    },
    24 * 60 * 60 * 1000
  );
};

const fetchCountryInfo = async (country: string) => {
  const normalizedCountry = normalize(country);
  if (!normalizedCountry) return null;

  const cacheKey = `country:${normalizedCountry.slice(0, 80)}`;

  return cachedSearch(
    cacheKey,
    async () => {
      const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(
        country.trim()
      )}?fields=name,currencies,languages`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return null;

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const exact = data.find((entry: any) => normalize(entry?.name?.common ?? "") === normalizedCountry) ?? data[0];

      const currencies = exact?.currencies && typeof exact.currencies === "object" ? exact.currencies : null;
      const currencyEntry = currencies ? (Object.entries(currencies)[0] as [string, any] | undefined) : undefined;
      const currencyCode = currencyEntry?.[0];
      const currencyName = currencyEntry?.[1]?.name;
      const currency = currencyCode
        ? currencyName
          ? `${String(currencyName)} (${String(currencyCode)})`
          : String(currencyCode)
        : undefined;

      const languagesObj = exact?.languages && typeof exact.languages === "object" ? exact.languages : null;
      const languages = languagesObj ? Object.values(languagesObj).filter(Boolean).join(", ") : undefined;

      return { currency, languages };
    },
    30 * 24 * 60 * 60 * 1000
  );
};

const fetchWikipediaSummary = async (query: string) => {
  const normalized = normalize(query);
  if (normalized.length < 2) return null;

  const cacheKey = `wiki:${normalized.slice(0, 120)}`;

  return cachedSearch(
    cacheKey,
    async () => {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
        query
      )}&limit=1&namespace=0&format=json`;

      const searchResponse = await fetch(searchUrl, {
        headers: { Accept: "application/json" },
      });
      if (!searchResponse.ok) return null;

      const searchData = await searchResponse.json();
      const title = Array.isArray(searchData?.[1]) ? String(searchData[1][0] ?? "").trim() : "";
      if (!title) return null;

      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const summaryResponse = await fetch(summaryUrl, { headers: { Accept: "application/json" } });
      if (!summaryResponse.ok) return null;

      const summaryData = await summaryResponse.json();
      const extract = typeof summaryData?.extract === "string" ? summaryData.extract.trim() : "";
      if (!extract) return null;

      return extract;
    },
    30 * 24 * 60 * 60 * 1000
  );
};

const fetchHighlights = async (name: string, country: string, coordinates: Coordinates) => {
  const city = name.trim();
  const nation = country.trim();
  if (city.length < 2 || nation.length < 2) return [];

  const lat = Number(coordinates.lat);
  const lng = Number(coordinates.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  const cacheKey = `highlights:${normalize(city).slice(0, 60)}:${normalize(nation).slice(0, 60)}:${lat.toFixed(
    3
  )},${lng.toFixed(3)}`;

  return cachedSearch(
    cacheKey,
    async () => {
      try {
        const results = await searchPlacesByText(`top attractions in ${city}`, lat, lng, 35000);
        return (results ?? [])
          .map((place) => String(place?.name ?? "").trim())
          .filter(Boolean)
          .slice(0, 6);
      } catch {
        return [];
      }
    },
    12 * 60 * 60 * 1000
  );
};

export async function getDestinationInsights(
  input: GetDestinationInsightsInput
): Promise<DatabaseResponse<DestinationInsights>> {
  try {
    const name = String(input.name ?? "").trim();
    const country = String(input.country ?? "").trim();
    const placeId = String(input.placeId ?? "").trim();
    const coordinates = input.coordinates;

    if (!name || !country) {
      return { success: false, error: { message: "Invalid destination" } };
    }

    const lat = Number(coordinates?.lat);
    const lng = Number(coordinates?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { success: false, error: { message: "Invalid destination coordinates" } };
    }

    const [placeDetails, countryInfo, timeZone, wikiExtract, highlights] = await Promise.all([
      placeId
        ? (async () => {
            try {
              return await fetchPlaceDetails(placeId);
            } catch {
              return null;
            }
          })()
        : Promise.resolve(null),
      fetchCountryInfo(country).catch(() => null),
      fetchTimeZone({ lat, lng }).catch(() => null),
      fetchWikipediaSummary(`${name} ${country}`).catch(() => null),
      fetchHighlights(name, country, { lat, lng }).catch(() => [] as string[]),
    ]);

    const description =
      wikiExtract ||
      (placeDetails?.description ? String(placeDetails.description).trim() : "") ||
      undefined;

    const heroPhotoPath =
      Array.isArray(placeDetails?.photo_names) && placeDetails.photo_names.length > 0
        ? String(placeDetails.photo_names[0] ?? "")
        : undefined;

    return {
      success: true,
      data: {
        description,
        currency: countryInfo?.currency,
        languages: countryInfo?.languages,
        timeZone: timeZone ?? undefined,
        highlights: highlights.length > 0 ? highlights : undefined,
        heroPhotoPath: heroPhotoPath || undefined,
      },
    };
  } catch (error: any) {
    console.error("Error in getDestinationInsights:", error);
    return {
      success: false,
      error: { message: "Failed to load destination details" },
    };
  }
}

