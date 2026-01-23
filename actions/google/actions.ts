"use server";

import { IActivity, type IOpenHours, type IReview } from "@/store/activityStore";
import { foodTypes, shoppingTypes, historicalTypes, SearchType, includedTypes } from "@/lib/googleMaps/includedTypes";
import { headers } from "next/headers";

const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const normalizeBaseUrl = (value: string | undefined | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    const href = url.href;
    return href.endsWith("/") ? href : `${href}/`;
  } catch {
    return null;
  }
};

const GOOGLE_HTTP_REFERER =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
  normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
  normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  normalizeBaseUrl(process.env.NEXT_PUBLIC_VERCEL_URL) ||
  normalizeBaseUrl(process.env.VERCEL_URL);
const GOOGLE_HTTP_ORIGIN = (() => {
  if (!GOOGLE_HTTP_REFERER) return null;
  try {
    return new URL(GOOGLE_HTTP_REFERER).origin;
  } catch {
    return GOOGLE_HTTP_REFERER;
  }
})();

const getRequestReferrerFallback = () => {
  try {
    const requestHeaders = headers();
    const referer = requestHeaders.get("referer");
    if (referer) {
      try {
        return new URL(referer).href;
      } catch {
        // Ignore invalid header values.
      }
    }

    const origin = requestHeaders.get("origin");
    if (origin) {
      try {
        const url = new URL(origin);
        return `${url.origin}/`;
      } catch {
        // Ignore invalid header values.
      }
    }

    const proto = requestHeaders.get("x-forwarded-proto") || "https";
    const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
    if (host) return `${proto}://${host}/`;
  } catch {
    // headers() not available outside request context.
  }

  return null;
};

const resolveGoogleHttpReferer = () => GOOGLE_HTTP_REFERER || getRequestReferrerFallback();

const resolveGoogleHttpOrigin = (referer: string | null) => {
  if (GOOGLE_HTTP_ORIGIN) return GOOGLE_HTTP_ORIGIN;
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

const googleRequestHeaders = (baseHeaders: Record<string, string>) => {
  const referer = resolveGoogleHttpReferer();
  const origin = resolveGoogleHttpOrigin(referer);
  return {
    ...baseHeaders,
    ...(referer ? { Referer: referer } : {}),
    ...(origin ? { Origin: origin } : {}),
  };
};

const dayOfWeekToNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 0 && value <= 6) return value;
    if (value >= 1 && value <= 7) return value % 7;
    return null;
  }

  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  const map: Record<string, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };
  return Object.prototype.hasOwnProperty.call(map, normalized) ? map[normalized]! : null;
};

// Simple mapping function for Google Places to our activity format
function mapGooglePlaceToActivity(place: any): IActivity {
  const reviews: IReview[] = Array.isArray(place?.reviews)
    ? place.reviews
        .filter(Boolean)
        .slice(0, 20)
        .map((review: any) => {
          const text =
            review?.text?.text ??
            review?.originalText?.text ??
            review?.text ??
            "";
          return {
            description: String(text ?? ""),
            rating: Number(review?.rating ?? 0),
            author: String(review?.authorAttribution?.displayName ?? review?.authorAttribution?.name ?? ""),
            uri: String(review?.authorAttribution?.uri ?? review?.googleMapsUri ?? ""),
            publish_date_time: String(review?.publishTime ?? review?.relativePublishTimeDescription ?? ""),
          } satisfies IReview;
        })
    : [];

  const open_hours: IOpenHours[] = Array.isArray(place?.regularOpeningHours?.periods)
    ? place.regularOpeningHours.periods
        .filter(Boolean)
        .map((period: any) => {
          const open = period?.open ?? null;
          const close = period?.close ?? null;
          const day = dayOfWeekToNumber(open?.day ?? close?.day);
          if (day == null) return null;

          const openHour = Number(open?.hour ?? 0);
          const openMinute = Number(open?.minute ?? 0);
          const closeHour = Number(close?.hour ?? 23);
          const closeMinute = Number(close?.minute ?? 59);

          if (!Number.isFinite(openHour) || !Number.isFinite(openMinute) || !Number.isFinite(closeHour) || !Number.isFinite(closeMinute)) {
            return null;
          }

          return {
            day,
            open_hour: openHour,
            open_minute: openMinute,
            close_hour: closeHour,
            close_minute: closeMinute,
          } satisfies IOpenHours;
        })
        .filter(Boolean) as IOpenHours[]
    : [];

  return {
    place_id: place.id,
    name: place.displayName?.text || "",
    coordinates: [place.location.longitude, place.location.latitude], // Store as [lng, lat]
    types: place.types || [],
    price_level: place.priceLevel || "",
    address: place.formattedAddress || "",
    rating: place.rating || null,
    description: place.editorialSummary?.text || "",
    google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    website_url: place.websiteUri || "",
    photo_names: place.photos ? place.photos.map((photo: any) => photo.name) : [],
    duration: null,
    phone_number: place.nationalPhoneNumber || "",
    reviews,
    open_hours,
  };
}

// 1. Text search - search for places using natural language queries
export const searchPlacesByText = async (
  textQuery: string,
  latitude?: number,
  longitude?: number,
  radiusInMeters: number = 25000
): Promise<IActivity[]> => {
  const apiKey = GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Places API key not configured");
  }

  if (!textQuery || textQuery.trim().length < 2) {
    throw new Error("Search query must be at least 2 characters");
  }

  const hasCoordinates = typeof latitude === "number" && Number.isFinite(latitude) && typeof longitude === "number" && Number.isFinite(longitude);
  const validRadius = hasCoordinates ? Math.max(0, Math.min(50000, radiusInMeters)) : 0;
  const { cachedSearch } = await import("@/lib/cache/searchCache");
  const cacheKey = hasCoordinates
    ? `textSearch:${textQuery.toLowerCase().trim()}:${latitude!.toFixed(4)},${longitude!.toFixed(4)}:${validRadius}`
    : `textSearch:${textQuery.toLowerCase().trim()}:global`;
  
  return await cachedSearch(
    cacheKey,
    async () => {
      const requestBody: any = {
        textQuery,
        maxResultCount: 20,
      };

      if (hasCoordinates && validRadius > 0) {
        requestBody.locationBias = {
          circle: {
            center: { latitude: latitude!, longitude: longitude! },
            radius: validRadius,
          },
        };
      }

      const shouldLog = process.env.DEBUG_GOOGLE_PLACES === "1";
      if (shouldLog) {
        console.log("Text Search API request:", {
          requestBody,
          apiKey: GOOGLE_MAPS_API_KEY ? "present" : "missing",
          coordinates: hasCoordinates ? { latitude, longitude } : null,
          validRadius,
        });
      }

      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: googleRequestHeaders({
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.priceLevel,places.photos,places.editorialSummary,places.websiteUri,places.nationalPhoneNumber",
        }),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Text Search API error:", response.status, response.statusText, errorBody);
        throw new Error(`Text search failed: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      if (shouldLog) {
        console.log("Text Search API response:", {
          placesCount: data.places?.length || 0,
          firstPlace: data.places?.[0]
            ? {
                id: data.places[0].id,
                displayName: data.places[0].displayName,
                location: data.places[0].location,
              }
            : null,
        });
      }
      return data.places?.map(mapGooglePlaceToActivity) || [];
    },
    5 * 60 * 1000
  );
};

// 2. Nearby search - find places in a wide area by type
export const fetchNearbyActivities = async (
  latitude: number,
  longitude: number,
  radiusInMeters: number = 25000,
  searchType: SearchType = "all"
): Promise<IActivity[]> => {
  const apiKey = GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Places API key not configured");
  }

  const validRadius = Math.max(0, Math.min(50000, radiusInMeters));
  const { cachedSearch } = await import("@/lib/cache/searchCache");
  const cacheKey = `nearby:${latitude.toFixed(4)},${longitude.toFixed(4)}:${validRadius}:${searchType}`;
  
  return await cachedSearch(
    cacheKey,
    async () => {
      // Select place types based on search type
      let includedTypesForSearch;
      switch (searchType) {
        case "food":
          includedTypesForSearch = foodTypes.slice(0, 10); // Limit to avoid API issues
          break;
        case "shopping":
          includedTypesForSearch = shoppingTypes.slice(0, 10);
          break;
        case "historical":
          includedTypesForSearch = historicalTypes.slice(0, 10);
          break;
        default:
          includedTypesForSearch = includedTypes.slice(0, 10);
      }

      const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: googleRequestHeaders({
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.priceLevel,places.photos,places.editorialSummary,places.websiteUri,places.nationalPhoneNumber",
        }),
        body: JSON.stringify({
          includedTypes: includedTypesForSearch,
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: validRadius,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Nearby search failed: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`
        );
      }

      const data = await response.json();
      return data.places?.map(mapGooglePlaceToActivity) || [];
    },
    15 * 60 * 1000
  );
};

// 3. Autocomplete - get place suggestions as user types
export const getGoogleMapsAutocomplete = async (
  input: string,
  latitude: number | undefined,
  longitude: number | undefined,
  radiusInMeters: number = 25000
) => {
  const apiKey = GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Places API key not configured");
  }

  if (!input || input.trim().length < 2) {
    return [];
  }

  const { cachedSearch } = await import("@/lib/cache/searchCache");
  const cacheKey = `autocomplete:${input.trim().toLowerCase()}:${latitude || 'no-lat'}:${longitude || 'no-lng'}:${radiusInMeters}`;
  
  return await cachedSearch(
    cacheKey,
    async () => {
      const requestBody: any = {
        input: input.trim(),
      };

      // Add location bias if coordinates are provided
      if (latitude && longitude) {
        requestBody.locationBias = {
          circle: {
            center: { latitude, longitude },
            radius: radiusInMeters,
          },
        };
      }

      const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: googleRequestHeaders({
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.place,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types",
        }),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Autocomplete failed: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`
        );
      }

      const data = await response.json();
      
      if (!data.suggestions) {
        return [];
      }

      return data.suggestions.map((suggestion: any) => ({
        placeId: suggestion.placePrediction.place,
        mainText: suggestion.placePrediction.structuredFormat.mainText.text,
        secondaryText: suggestion.placePrediction.structuredFormat.secondaryText.text,
        types: suggestion.placePrediction.types,
      }));
    },
    5 * 60 * 1000
  );
};

// 4. Place details - get detailed information about a specific place
export const fetchPlaceDetails = async (placeId: string): Promise<IActivity> => {
  const apiKey = GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Places API key not configured");
  }

  if (!placeId || placeId.trim().length < 3) {
    throw new Error("Invalid place id");
  }

  const normalized = placeId.trim();
  const { cachedSearch } = await import("@/lib/cache/searchCache");
  const cacheKey = `place:${normalized}`;

  return await cachedSearch(
    cacheKey,
    async () => {
      const response = await fetch(`https://places.googleapis.com/v1/places/${normalized}`, {
        headers: googleRequestHeaders({
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,types,priceLevel,rating,editorialSummary,websiteUri,nationalPhoneNumber,photos,regularOpeningHours,reviews",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Failed to fetch place details: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`
        );
      }

      const place = await response.json();
      return mapGooglePlaceToActivity(place);
    },
    24 * 60 * 60 * 1000
  );
};

// 5. Simple geocoding - get coordinates for a city
export const fetchCityCoordinates = async (cityName: string, countryName: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_GEOCODING_API_KEY || GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Geocoding API key not configured");
  }
  const searchQuery = `${String(cityName ?? "").trim()}, ${String(countryName ?? "").trim()}`.trim();
  if (!searchQuery || searchQuery.length < 2) {
    throw new Error("Invalid location query");
  }

  const { cachedSearch } = await import("@/lib/cache/searchCache");
  const cacheKey = `geocode:${searchQuery.toLowerCase().slice(0, 120)}`;

  return await cachedSearch(
    cacheKey,
    async () => {
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        searchQuery
      )}&key=${encodeURIComponent(apiKey)}`;

      const geocodingResponse = await fetch(geocodingUrl, {
        headers: googleRequestHeaders({}),
      });
      const geocodingData = await geocodingResponse.json();

      const status = typeof geocodingData?.status === "string" ? geocodingData.status : "UNKNOWN";
      if (status !== "OK") {
        const errorMessage = typeof geocodingData?.error_message === "string" ? geocodingData.error_message : "";
        throw new Error(`Geocoding failed (${status})${errorMessage ? `: ${errorMessage}` : ""}`);
      }

      if (!geocodingData.results || geocodingData.results.length === 0) {
        throw new Error(`Geocoding returned no results for: ${searchQuery}`);
      }

      const { lng: longitude, lat: latitude } = geocodingData.results[0].geometry.location;
      return { longitude, latitude };
    },
    24 * 60 * 60 * 1000
  );
};

// 6. Photo fetching - get place photos from Google Places API
export const getPlacePhotoAction = async (photoName: string, maxWidth?: number, maxHeight?: number) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("Google Maps API key not configured");
    }

    // Handle new Places API v1 photo references
    if (photoName.startsWith("places/")) {
      const params = new URLSearchParams({
        maxHeightPx: (maxHeight || 1000).toString(),
        maxWidthPx: (maxWidth || 1000).toString(),
      });

      const response = await fetch(`https://places.googleapis.com/v1/${photoName}/media?${params}`, {
        headers: googleRequestHeaders({
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch photo: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/jpeg";

      return {
        success: true,
        data: `data:${contentType};base64,${base64}`,
      };
    } else {
      // Handle legacy photo references
      const params = new URLSearchParams({
        photoreference: photoName,
        maxwidth: (maxWidth || 1000).toString(),
        key: GOOGLE_MAPS_API_KEY,
      });

      const response = await fetch(`https://maps.googleapis.com/maps/api/place/photo?${params}`, {
        headers: googleRequestHeaders({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch legacy photo: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/jpeg";

      return {
        success: true,
        data: `data:${contentType};base64,${base64}`,
      };
    }
  } catch (error) {
    console.error("Error fetching place photo:", error);
    return {
      success: false,
      error: "Failed to fetch photo",
    };
  }
};
