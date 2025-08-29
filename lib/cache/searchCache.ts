/**
 * Client-side caching utility for Google Places API responses
 * Reduces API calls and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
}

class SearchCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 15 * 60 * 1000; // 15 minutes

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const timeToLive = ttl || this.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + timeToLive
    };

    this.cache.set(key, entry);
    this.cleanup();
  }

  /**
   * Check if data exists in cache and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: Array<{ key: string; age: number; ttl: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.expires - now
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Generate cache key for search queries
   */
  static generateSearchKey(query: string, location?: { lat: number; lng: number }, radius?: number): string {
    const locationKey = location ? `${location.lat.toFixed(4)},${location.lng.toFixed(4)}` : 'no-location';
    const radiusKey = radius ? radius.toString() : 'no-radius';
    return `search:${query.toLowerCase().trim()}:${locationKey}:${radiusKey}`;
  }

  /**
   * Generate cache key for place details
   */
  static generatePlaceKey(placeId: string): string {
    return `place:${placeId}`;
  }

  /**
   * Generate cache key for nearby places
   */
  static generateNearbyKey(
    lat: number, 
    lng: number, 
    radius: number, 
    type?: string
  ): string {
    const locationKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const typeKey = type || 'all';
    return `nearby:${locationKey}:${radius}:${typeKey}`;
  }

  /**
   * Generate cache key for geocoding
   */
  static generateGeocodeKey(address: string): string {
    return `geocode:${address.toLowerCase().trim()}`;
  }

  /**
   * Generate cache key for reverse geocoding
   */
  static generateReverseGeocodeKey(lat: number, lng: number): string {
    return `reverse:${lat.toFixed(6)},${lng.toFixed(6)}`;
  }
}

// Global cache instance
export const searchCache = new SearchCache();

// Export the class for static method access
export { SearchCache };

/**
 * Cached wrapper for search functions
 */
export async function cachedSearch<T>(
  key: string,
  searchFunction: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = searchCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute search function
  const result = await searchFunction();
  
  // Cache the result
  searchCache.set(key, result, ttl);
  
  return result;
}

/**
 * Cache management utilities
 */
export const cacheUtils = {
  /**
   * Clear all search-related cache
   */
  clearSearchCache(): void {
    const stats = searchCache.getStats();
    stats.entries.forEach(({ key }) => {
      if (key.startsWith('search:') || key.startsWith('nearby:') || key.startsWith('autocomplete:')) {
        searchCache.delete(key);
      }
    });
  },

  /**
   * Clear all place details cache
   */
  clearPlaceCache(): void {
    const stats = searchCache.getStats();
    stats.entries.forEach(({ key }) => {
      if (key.startsWith('place:')) {
        searchCache.delete(key);
      }
    });
  },

  /**
   * Clear all geocoding cache
   */
  clearGeocodeCache(): void {
    const stats = searchCache.getStats();
    stats.entries.forEach(({ key }) => {
      if (key.startsWith('geocode:') || key.startsWith('reverse:')) {
        searchCache.delete(key);
      }
    });
  },

  /**
   * Get cache statistics
   */
  getStats() {
    return searchCache.getStats();
  },

  /**
   * Clear expired entries
   */
  cleanup(): void {
    (searchCache as any).cleanup();
  }
};

export default searchCache;