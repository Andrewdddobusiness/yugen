"use server";

import type { Coordinates, DatabaseResponse } from "@/types/database";

// Travel mode types supported by Google Maps Distance Matrix API
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
 * Calculate travel time between two points using Google Maps Distance Matrix API
 */
export async function calculateTravelTime(
  origin: Coordinates,
  destination: Coordinates,
  modes: TravelMode[] = ['driving', 'walking'],
  departureTime?: Date
): Promise<DatabaseResponse<TravelTimeResponse>> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      return {
        success: false,
        error: { message: "Google Maps API key not configured" }
      };
    }

    // Check cache first
    const cacheKey = generateCacheKey(origin, destination, modes, departureTime);
    const cached = travelTimeCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
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

      return {
        success: true,
        data: sameLocationResult
      };
    }

    const results: { [mode in TravelMode]?: TravelTimeResult } = {};
    
    // Make requests for each travel mode
    const promises = modes.map(async (mode) => {
      try {
        const result = await fetchDistanceMatrix(origin, destination, mode, departureTime);
        if (result.success && result.data) {
          results[mode] = result.data;
        }
      } catch (error) {
        console.error(`Error fetching travel time for mode ${mode}:`, error);
      }
    });

    await Promise.allSettled(promises);

    // If no results were successful, return an error
    if (Object.keys(results).length === 0) {
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
 * Fetch travel time for a specific mode using Distance Matrix API
 */
async function fetchDistanceMatrix(
  origin: Coordinates,
  destination: Coordinates,
  mode: TravelMode,
  departureTime?: Date
): Promise<DatabaseResponse<TravelTimeResult>> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    const originStr = `${origin.lat},${origin.lng}`;
    const destinationStr = `${destination.lat},${destination.lng}`;
    
    let url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
      `origins=${encodeURIComponent(originStr)}` +
      `&destinations=${encodeURIComponent(destinationStr)}` +
      `&mode=${mode}` +
      `&units=metric` +
      `&key=${apiKey}`;

    // Add departure time for driving and transit modes
    if ((mode === 'driving' || mode === 'transit') && departureTime) {
      const departureTimestamp = Math.floor(departureTime.getTime() / 1000);
      url += `&departure_time=${departureTimestamp}`;
    }

    // Add traffic model for driving
    if (mode === 'driving') {
      url += '&traffic_model=best_guess';
    }

    const response = await fetch(url, {
      headers: {
        'Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      }
    });

    if (!response.ok) {
      return {
        success: false,
        error: { 
          message: "Distance Matrix API request failed",
          code: response.status.toString()
        }
      };
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      return {
        success: false,
        error: { 
          message: `Distance Matrix API error: ${data.status}`,
          details: data
        }
      };
    }

    const element = data.rows[0]?.elements[0];
    if (!element || element.status !== 'OK') {
      return {
        success: false,
        error: { 
          message: `No route found for ${mode} mode`,
          details: element
        }
      };
    }

    return {
      success: true,
      data: {
        mode,
        duration: element.duration,
        distance: element.distance,
        status: element.status
      }
    };

  } catch (error: any) {
    console.error(`Error fetching distance matrix for ${mode}:`, error);
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