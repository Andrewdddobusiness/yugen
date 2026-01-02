"use server";

import type { Coordinates, DatabaseResponse } from "@/types/database";

// Travel mode types supported by Google Routes API (computeRoutes)
export type TravelMode = 'driving' | 'walking' | 'transit' | 'bicycling';

export interface TravelTimeResult {
  mode: TravelMode;
  duration: {
    text: string;
    value: number; // seconds
  };
  distance: {
    text: string;
    value: number; // meters
  };
  status: string;
}

export interface TravelTimeRequest {
  origins: Coordinates[];
  destinations: Coordinates[];
  modes: TravelMode[];
  departureTime?: Date;
}

export interface TravelTimeResponse {
  results: {
    [mode in TravelMode]?: TravelTimeResult;
  };
  cacheKey: string;
}

/**
 * Cache for travel time results to avoid repeated API calls
 * In production, this should be replaced with Redis or similar
 */
const travelTimeCache = new Map<string, { data: TravelTimeResponse; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const ROUTES_DEBUG = process.env.GOOGLE_ROUTES_DEBUG === "1" || process.env.GOOGLE_ROUTES_DEBUG === "true";
const ROUTES_DEBUG_VERBOSE =
  process.env.GOOGLE_ROUTES_DEBUG_VERBOSE === "1" || process.env.GOOGLE_ROUTES_DEBUG_VERBOSE === "true";

function debugLog(message: string, details?: Record<string, unknown>) {
  if (!ROUTES_DEBUG) return;
  if (details) console.log(`[travel] ${message}`, details);
  else console.log(`[travel] ${message}`);
}

function roundCoord(value: number, decimals = 4): number {
  const pow = 10 ** decimals;
  return Math.round(value * pow) / pow;
}

/**
 * Generate a cache key for travel time requests
 */
function generateCacheKey(origin: Coordinates, destination: Coordinates, modes: TravelMode[], departureTime?: Date): string {
  const originKey = `${Math.round(origin.lat * 10000)},${Math.round(origin.lng * 10000)}`;
  const destinationKey = `${Math.round(destination.lat * 10000)},${Math.round(destination.lng * 10000)}`;
  const modesKey = modes.sort().join(',');
  const timeKey = departureTime ? Math.floor(departureTime.getTime() / (60 * 60 * 1000)) : 'now'; // Hour precision
  
  return `${originKey}|${destinationKey}|${modesKey}|${timeKey}`;
}

/**
 * Clean up expired cache entries
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of travelTimeCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      travelTimeCache.delete(key);
    }
  }
}

/**
 * Calculate travel time between two points using Google Routes API (computeRoutes)
 */
export async function calculateTravelTime(
  origin: Coordinates,
  destination: Coordinates,
  modes: TravelMode[] = ['driving', 'walking'],
  departureTime?: Date
): Promise<DatabaseResponse<TravelTimeResponse>> {
  try {
    const apiKey = process.env.GOOGLE_ROUTES_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const keySource = process.env.GOOGLE_ROUTES_API_KEY
      ? "GOOGLE_ROUTES_API_KEY"
      : process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
        : "none";
    
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      debugLog("missing api key", { keySource });
      return {
        success: false,
        error: { message: "Routes API key not configured", code: "API_KEY_NOT_CONFIGURED" }
      };
    }

    // Check cache first
    const cacheKey = generateCacheKey(origin, destination, modes, departureTime);
    const cached = travelTimeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      debugLog("cache hit", { cacheKey, modes: [...modes].sort(), keySource });
      return {
        success: true,
        data: cached.data
      };
    }

    // Clean up expired entries periodically
    if (Math.random() < 0.1) {
      cleanupCache();
    }

    // Validate coordinates
    if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) {
      debugLog("invalid coordinates", {
        origin: { lat: roundCoord(origin.lat), lng: roundCoord(origin.lng) },
        destination: { lat: roundCoord(destination.lat), lng: roundCoord(destination.lng) },
      });
      return {
        success: false,
        error: { message: "Invalid coordinates provided" }
      };
    }

    // Check if origin and destination are the same (within ~100m)
    const distance = getDistanceFromLatLonInMeters(
      origin.lat, origin.lng, 
      destination.lat, destination.lng
    );
    
    if (distance < 100) {
      // Same location, return zero travel time
      const sameLocationResult: TravelTimeResponse = {
        results: modes.reduce((acc, mode) => ({
          ...acc,
          [mode]: {
            mode,
            duration: { text: "0 mins", value: 0 },
            distance: { text: "0 m", value: 0 },
            status: "OK"
          }
        }), {}),
        cacheKey
      };

      // Cache the result
      travelTimeCache.set(cacheKey, {
        data: sameLocationResult,
        timestamp: Date.now()
      });

      debugLog("same location shortcut", { cacheKey, modes: [...modes].sort() });
      return {
        success: true,
        data: sameLocationResult
      };
    }

    const results: { [mode in TravelMode]?: TravelTimeResult } = {};
    debugLog("computeRoutes batch start", {
      cacheKey,
      keySource,
      modes: [...modes].sort(),
      origin: { lat: roundCoord(origin.lat), lng: roundCoord(origin.lng) },
      destination: { lat: roundCoord(destination.lat), lng: roundCoord(destination.lng) },
      ...(ROUTES_DEBUG_VERBOSE && departureTime ? { departureTime: departureTime.toISOString() } : null),
    });
    
    // Make requests for each travel mode
    const promises = modes.map(async (mode) => {
      try {
        const result = await fetchRoutesTravelTime(origin, destination, mode, departureTime);
        if (result.success && result.data) {
          results[mode] = result.data;
          debugLog("computeRoutes mode ok", {
            cacheKey,
            mode,
            durationSeconds: result.data.duration.value,
            distanceMeters: result.data.distance.value,
          });
        } else {
          debugLog("computeRoutes mode failed", {
            cacheKey,
            mode,
            code: result.error?.code,
            message: result.error?.message,
          });
        }
      } catch (error) {
        console.error(`Error fetching travel time for mode ${mode}:`, error);
      }
    });

    await Promise.allSettled(promises);

    // If no results were successful, return an error
    if (Object.keys(results).length === 0) {
      debugLog("computeRoutes batch failed (no results)", { cacheKey, modes: [...modes].sort() });
      return {
        success: false,
        error: { message: "Unable to calculate travel time for any transport mode" }
      };
    }

    const response: TravelTimeResponse = {
      results,
      cacheKey
    };

    // Cache the result
    travelTimeCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    debugLog("computeRoutes batch ok", { cacheKey, modes: Object.keys(results) });
    return {
      success: true,
      data: response
    };

  } catch (error: any) {
    console.error("Error calculating travel time:", error);
    return {
      success: false,
      error: { 
        message: error.message || "Failed to calculate travel time",
        details: error
      }
    };
  }
}

/**
 * Fetch travel time for a specific mode using Routes API (computeRoutes)
 */
async function fetchRoutesTravelTime(
  origin: Coordinates,
  destination: Coordinates,
  mode: TravelMode,
  departureTime?: Date
): Promise<DatabaseResponse<TravelTimeResult>> {
  try {
    const apiKey = process.env.GOOGLE_ROUTES_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const keySource = process.env.GOOGLE_ROUTES_API_KEY
      ? "GOOGLE_ROUTES_API_KEY"
      : process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
        : "none";

    if (!apiKey || apiKey === "your-google-maps-api-key-here") {
      return {
        success: false,
        error: { message: "Routes API key not configured", code: "API_KEY_NOT_CONFIGURED" },
      };
    }
    
    const body: any = {
      origin: {
        location: {
          latLng: { latitude: origin.lat, longitude: origin.lng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: destination.lat, longitude: destination.lng },
        },
      },
      travelMode: mapMode(mode),
    };

    // If provided, pass departure time through (helps for transit and optionally traffic-aware drive).
    if (departureTime && (mode === "driving" || mode === "transit")) {
      body.departureTime = departureTime.toISOString();
    }

    // Optional: traffic-aware routing for driving when a departure time is known.
    if (mode === "driving" && departureTime) {
      body.routingPreference = "TRAFFIC_AWARE";
    }

    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMessage =
        errorBody?.error?.message ||
        errorBody?.message ||
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
        mode,
        keySource,
        status: response.status,
        code,
        message: errorMessage,
      });
      return {
        success: false,
        error: { 
          message: errorMessage,
          code,
          details: errorBody,
        }
      };
    }

    const data = await response.json().catch(() => null);

    const route = Array.isArray(data?.routes) ? data.routes[0] : null;
    const distanceMeters = typeof route?.distanceMeters === "number" ? route.distanceMeters : null;
    const durationSeconds = toSeconds(route?.duration);

    if (distanceMeters == null || durationSeconds == null) {
      return {
        success: false,
        error: {
          message: `No route found for ${mode} mode`,
          details: data,
        },
      };
    }

    return {
      success: true,
      data: {
        mode,
        duration: {
          value: durationSeconds,
          text: formatDurationText(durationSeconds),
        },
        distance: {
          value: distanceMeters,
          text: formatDistanceText(distanceMeters),
        },
        status: "OK",
      }
    };

  } catch (error: any) {
    console.error(`Error fetching Routes API travel time for ${mode}:`, error);
    return {
      success: false,
      error: { 
        message: error.message || `Failed to fetch travel time for ${mode}`,
        details: error
      }
    };
  }
}

/**
 * Batch calculate travel times for multiple activity pairs
 */
export async function calculateBatchTravelTimes(
  activityPairs: Array<{
    from: Coordinates;
    to: Coordinates;
    fromId: string;
    toId: string;
  }>,
  modes: TravelMode[] = ['driving', 'walking'],
  departureTime?: Date
): Promise<DatabaseResponse<Array<{
  fromId: string;
  toId: string;
  travelTimes: TravelTimeResponse;
}>>> {
  try {
    const results = await Promise.allSettled(
      activityPairs.map(async (pair) => {
        const travelTimeResult = await calculateTravelTime(
          pair.from,
          pair.to,
          modes,
          departureTime
        );
        
        if (travelTimeResult.success && travelTimeResult.data) {
          return {
            fromId: pair.fromId,
            toId: pair.toId,
            travelTimes: travelTimeResult.data
          };
        }
        
        throw new Error(`Failed to calculate travel time for ${pair.fromId} to ${pair.toId}`);
      })
    );

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    return {
      success: true,
      data: successfulResults
    };

  } catch (error: any) {
    console.error("Error calculating batch travel times:", error);
    return {
      success: false,
      error: { 
        message: error.message || "Failed to calculate batch travel times",
        details: error
      }
    };
  }
}

/**
 * Helper functions
 */
function isValidCoordinates(coords: Coordinates): boolean {
  return (
    typeof coords.lat === 'number' &&
    typeof coords.lng === 'number' &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lng >= -180 &&
    coords.lng <= 180
  );
}

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function mapMode(mode: TravelMode): "DRIVE" | "WALK" | "TRANSIT" | "BICYCLE" {
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

function toSeconds(duration: unknown): number | null {
  if (typeof duration === "number" && Number.isFinite(duration)) return duration;
  if (typeof duration !== "string") return null;
  const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? Math.round(seconds) : null;
}

function formatDurationText(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours} hr`;
  return `${hours} hr ${remaining} mins`;
}

function formatDistanceText(meters: number): string {
  const m = Math.max(0, Math.round(meters));
  if (m < 1000) return `${m} m`;
  const km = m / 1000;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/**
 * Get cache stats for debugging
 */
export async function getTravelTimeCacheStats(): Promise<{
  size: number;
  keys: string[];
  oldestEntry: number;
  newestEntry: number;
}> {
  const now = Date.now();
  const entries = Array.from(travelTimeCache.entries());
  
  return {
    size: travelTimeCache.size,
    keys: entries.map(([key]) => key),
    oldestEntry: entries.length > 0 ? Math.min(...entries.map(([, entry]) => now - entry.timestamp)) : 0,
    newestEntry: entries.length > 0 ? Math.max(...entries.map(([, entry]) => now - entry.timestamp)) : 0
  };
}

/**
 * Clear travel time cache
 */
export async function clearTravelTimeCache(): Promise<void> {
  travelTimeCache.clear();
}
