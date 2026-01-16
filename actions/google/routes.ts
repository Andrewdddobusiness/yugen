"use server";

import type { Coordinates, DatabaseResponse } from "@/types/database";
import { toJsonSafe } from "@/lib/security/toJsonSafe";

export type RouteTravelMode = "driving" | "walking" | "transit" | "bicycling";

export interface RoutePolylineResponse {
  encodedPolyline: string;
  distanceMeters?: number;
  durationSeconds?: number;
  cacheKey: string;
}

const routeCache = new Map<string, { data: RoutePolylineResponse; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const ROUTES_DEBUG = process.env.GOOGLE_ROUTES_DEBUG === "1" || process.env.GOOGLE_ROUTES_DEBUG === "true";
const ROUTES_DEBUG_VERBOSE =
  process.env.GOOGLE_ROUTES_DEBUG_VERBOSE === "1" || process.env.GOOGLE_ROUTES_DEBUG_VERBOSE === "true";

const GOOGLE_HTTP_REFERER = (() => {
  const value = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return null;
  return value.endsWith("/") ? value : `${value}/`;
})();

const GOOGLE_HTTP_ORIGIN = (() => {
  if (!GOOGLE_HTTP_REFERER) return null;
  try {
    return new URL(GOOGLE_HTTP_REFERER).origin;
  } catch {
    return GOOGLE_HTTP_REFERER;
  }
})();

function googleRequestHeaders(headers: Record<string, string>) {
  return {
    ...headers,
    ...(GOOGLE_HTTP_REFERER ? { Referer: GOOGLE_HTTP_REFERER } : {}),
    ...(GOOGLE_HTTP_ORIGIN ? { Origin: GOOGLE_HTTP_ORIGIN } : {}),
  };
}

function debugLog(message: string, details?: Record<string, unknown>) {
  if (!ROUTES_DEBUG) return;
  if (details) console.log(`[routes] ${message}`, details);
  else console.log(`[routes] ${message}`);
}

function roundCoord(value: number, decimals = 4): number {
  const pow = 10 ** decimals;
  return Math.round(value * pow) / pow;
}

function summarizePoints(points: Coordinates[]): Array<{ lat: number; lng: number }> {
  return points.map((p) => ({ lat: roundCoord(p.lat), lng: roundCoord(p.lng) }));
}

function toSeconds(duration: unknown): number | undefined {
  if (typeof duration === "number" && Number.isFinite(duration)) return duration;
  if (typeof duration !== "string") return undefined;

  const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return undefined;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? seconds : undefined;
}

function generateCacheKey(points: Coordinates[], mode: RouteTravelMode, departureTime?: Date): string {
  const rounded = points
    .map((p) => `${Math.round(p.lat * 1e5)},${Math.round(p.lng * 1e5)}`)
    .join("|");

  // Transit routes depend on schedules, so bucket the cache by hour.
  if (mode === "transit") {
    const timeKey = departureTime ? Math.floor(departureTime.getTime() / (60 * 60 * 1000)) : "now";
    return `${mode}:${rounded}|${timeKey}`;
  }

  return `${mode}:${rounded}`;
}

function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of routeCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      routeCache.delete(key);
    }
  }
}

function mapMode(mode: RouteTravelMode): "DRIVE" | "WALK" | "TRANSIT" | "BICYCLE" {
  switch (mode) {
    case "walking":
      return "WALK";
    case "transit":
      return "TRANSIT";
    case "bicycling":
      return "BICYCLE";
    case "driving":
    default:
      return "DRIVE";
  }
}

function isValidCoordinates(point: Coordinates): boolean {
  return (
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

export async function computeRoutePolyline(
  points: Coordinates[],
  mode: RouteTravelMode = "driving"
): Promise<DatabaseResponse<RoutePolylineResponse>> {
  try {
    const apiKey = process.env.GOOGLE_ROUTES_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const keySource = process.env.GOOGLE_ROUTES_API_KEY
      ? "GOOGLE_ROUTES_API_KEY"
      : process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
        : "none";

    if (!apiKey || apiKey === "your-google-maps-api-key-here") {
      debugLog("missing api key", { mode, points: points?.length ?? 0, keySource });
      return {
        success: false,
        error: { message: "Routes API key not configured", code: "API_KEY_NOT_CONFIGURED" },
      };
    }

    if (!Array.isArray(points) || points.length < 2) {
      debugLog("not enough points", { mode, points: points?.length ?? 0 });
      return {
        success: false,
        error: { message: "At least 2 points are required to compute a route", code: "NOT_ENOUGH_POINTS" },
      };
    }

    if (!points.every(isValidCoordinates)) {
      debugLog("invalid coordinates", {
        mode,
        points: points.length,
        ...(ROUTES_DEBUG_VERBOSE ? { pointsPreview: summarizePoints(points) } : {}),
      });
      return {
        success: false,
        error: { message: "Invalid coordinates provided", code: "INVALID_COORDINATES" },
      };
    }

    // Directions API supports 25 locations; keep the same limit here.
    if (points.length > 25) {
      debugLog("too many waypoints", { mode, points: points.length });
      return {
        success: false,
        error: { message: "Too many waypoints for a single route", code: "MAX_WAYPOINTS_EXCEEDED" },
      };
    }

    const departureTime = mode === "transit" ? new Date() : undefined;
    const cacheKey = generateCacheKey(points, mode, departureTime);
    const cached = routeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      debugLog("cache hit", { cacheKey, mode, points: points.length });
      return { success: true, data: cached.data };
    }

    if (Math.random() < 0.1) cleanupCache();

    const origin = points[0];
    const destination = points[points.length - 1];
    const intermediates =
      points.length > 2
        ? points.slice(1, -1).map((p) => ({
            location: { latLng: { latitude: p.lat, longitude: p.lng } },
          }))
        : [];

    const body: any = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      intermediates,
      travelMode: mapMode(mode),
      polylineQuality: "HIGH_QUALITY",
      polylineEncoding: "ENCODED_POLYLINE",
    };

    if (departureTime) {
      body.departureTime = departureTime.toISOString();
    }

    debugLog("computeRoutes request", {
      cacheKey,
      mode,
      keySource,
      origin: { lat: roundCoord(origin.lat), lng: roundCoord(origin.lng) },
      destination: { lat: roundCoord(destination.lat), lng: roundCoord(destination.lng) },
      intermediates: intermediates.length,
      ...(ROUTES_DEBUG_VERBOSE ? { points: summarizePoints(points) } : {}),
    });

    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: googleRequestHeaders({
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      }),
      body: JSON.stringify(body),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        json?.error?.message ||
        json?.message ||
        `${response.status} ${response.statusText}`.trim() ||
        "Routes API request failed";

      const lowered = String(errorMessage).toLowerCase();
      const code =
        response.status === 403 &&
        (lowered.includes("disabled") ||
          lowered.includes("not enabled") ||
          lowered.includes("is not enabled") ||
          lowered.includes("has not been used"))
          ? "ROUTES_API_DISABLED"
          : response.status === 429
            ? "RATE_LIMITED"
            : response.status === 400
              ? "INVALID_ARGUMENT"
              : "ROUTES_API_ERROR";

      debugLog("computeRoutes response error", {
        cacheKey,
        mode,
        status: response.status,
        code,
        message: errorMessage,
      });
      return {
        success: false,
        error: {
          message: errorMessage,
          code,
          details: json,
        },
      };
    }

    const route = Array.isArray(json?.routes) ? json.routes[0] : null;
    const encodedPolyline = route?.polyline?.encodedPolyline;
    if (!encodedPolyline || typeof encodedPolyline !== "string") {
      debugLog("computeRoutes response missing polyline", { cacheKey, mode });
      return {
        success: false,
        error: { message: "No route polyline returned from Routes API", code: "NO_ROUTE" },
      };
    }

    const data: RoutePolylineResponse = {
      encodedPolyline,
      distanceMeters: typeof route?.distanceMeters === "number" ? route.distanceMeters : undefined,
      durationSeconds: toSeconds(route?.duration),
      cacheKey,
    };

    debugLog("computeRoutes response ok", {
      cacheKey,
      mode,
      distanceMeters: data.distanceMeters,
      durationSeconds: data.durationSeconds,
      encodedPolylineLength: data.encodedPolyline.length,
    });
    routeCache.set(cacheKey, { data, timestamp: Date.now() });
    return { success: true, data };
  } catch (error: any) {
    console.error("Error computing route polyline");
    return {
      success: false,
      error: {
        message: error?.message || "Failed to compute route polyline",
        code: "ROUTES_API_ERROR",
        details: toJsonSafe(error),
      },
    };
  }
}
