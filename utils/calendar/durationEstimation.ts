/**
 * Duration estimation utilities for activity scheduling
 */

interface ActivityType {
  name: string;
  category: string;
  defaultDuration: number; // minutes
  minDuration: number;
  maxDuration: number;
  factors: {
    popularity?: number; // multiplier for popular places
    size?: number; // multiplier for large venues
    meal?: number; // multiplier for meal times
  };
}

interface PlaceData {
  place_id: string;
  types: string[];
  name: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now?: boolean;
    periods?: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
}

interface DurationEstimate {
  duration: number; // minutes
  confidence: 'high' | 'medium' | 'low';
  source: 'google_places' | 'user_history' | 'category_default' | 'manual';
  reasoning: string[];
  range: {
    min: number;
    max: number;
  };
}

/**
 * Activity type definitions with duration estimates
 */
const ACTIVITY_TYPES: Record<string, ActivityType> = {
  restaurant: {
    name: 'Restaurant',
    category: 'dining',
    defaultDuration: 90,
    minDuration: 45,
    maxDuration: 180,
    factors: {
      meal: 1.5, // 50% longer during meal times
      popularity: 1.2 // 20% longer for popular places
    }
  },
  museum: {
    name: 'Museum',
    category: 'culture',
    defaultDuration: 120,
    minDuration: 60,
    maxDuration: 300,
    factors: {
      size: 1.5,
      popularity: 1.1
    }
  },
  shopping_mall: {
    name: 'Shopping Mall',
    category: 'shopping',
    defaultDuration: 120,
    minDuration: 60,
    maxDuration: 240,
    factors: {
      size: 1.3
    }
  },
  tourist_attraction: {
    name: 'Tourist Attraction',
    category: 'sightseeing',
    defaultDuration: 90,
    minDuration: 30,
    maxDuration: 180,
    factors: {
      popularity: 1.3,
      size: 1.2
    }
  },
  park: {
    name: 'Park',
    category: 'recreation',
    defaultDuration: 60,
    minDuration: 30,
    maxDuration: 180,
    factors: {
      size: 1.4
    }
  },
  cafe: {
    name: 'Cafe',
    category: 'dining',
    defaultDuration: 45,
    minDuration: 30,
    maxDuration: 90,
    factors: {}
  },
  bar: {
    name: 'Bar',
    category: 'nightlife',
    defaultDuration: 90,
    minDuration: 60,
    maxDuration: 180,
    factors: {}
  },
  church: {
    name: 'Church/Religious Site',
    category: 'culture',
    defaultDuration: 30,
    minDuration: 15,
    maxDuration: 60,
    factors: {}
  },
  amusement_park: {
    name: 'Amusement Park',
    category: 'recreation',
    defaultDuration: 300, // 5 hours
    minDuration: 180,
    maxDuration: 480,
    factors: {}
  },
  zoo: {
    name: 'Zoo',
    category: 'recreation',
    defaultDuration: 180,
    minDuration: 120,
    maxDuration: 300,
    factors: {
      size: 1.3
    }
  },
  spa: {
    name: 'Spa',
    category: 'wellness',
    defaultDuration: 90,
    minDuration: 60,
    maxDuration: 180,
    factors: {}
  },
  movie_theater: {
    name: 'Movie Theater',
    category: 'entertainment',
    defaultDuration: 150, // Includes previews and time to settle
    minDuration: 120,
    maxDuration: 180,
    factors: {}
  }
};

/**
 * Estimate duration for an activity based on place data
 */
export function estimateActivityDuration(
  placeData: PlaceData,
  context: {
    timeOfDay?: string;
    isWeekend?: boolean;
    userPreferences?: {
      quickVisits?: boolean;
      thoroughExploration?: boolean;
    };
  } = {}
): DurationEstimate {
  const reasoning: string[] = [];
  
  // Determine activity type from place types
  const activityType = determineActivityType(placeData.types);
  reasoning.push(`Classified as ${activityType.name}`);
  
  let baseDuration = activityType.defaultDuration;
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  // Apply factors based on place characteristics
  
  // Popularity factor (based on rating and review count)
  if (placeData.rating && placeData.user_ratings_total && activityType.factors.popularity) {
    if (placeData.rating > 4.3 && placeData.user_ratings_total > 500) {
      baseDuration *= activityType.factors.popularity;
      reasoning.push('Adjusted for high popularity (longer wait times expected)');
    }
  }
  
  // Meal time factor for restaurants
  if (activityType.category === 'dining' && context.timeOfDay && activityType.factors.meal) {
    const hour = parseInt(context.timeOfDay.split(':')[0]);
    const isMealTime = (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 21);
    if (isMealTime) {
      baseDuration *= activityType.factors.meal;
      reasoning.push('Adjusted for meal time (longer dining experience)');
    }
  }
  
  // Weekend factor
  if (context.isWeekend && ['museum', 'tourist_attraction', 'park'].includes(activityType.name.toLowerCase())) {
    baseDuration *= 1.1;
    reasoning.push('Adjusted for weekend crowds');
  }
  
  // User preferences
  if (context.userPreferences?.quickVisits) {
    baseDuration *= 0.7;
    confidence = 'low';
    reasoning.push('Reduced for quick visit preference');
  } else if (context.userPreferences?.thoroughExploration) {
    baseDuration *= 1.3;
    reasoning.push('Extended for thorough exploration preference');
  }
  
  // Ensure duration stays within bounds
  const finalDuration = Math.round(
    Math.max(
      activityType.minDuration,
      Math.min(activityType.maxDuration, baseDuration)
    )
  );
  
  // Snap to 15-minute intervals
  const snappedDuration = Math.round(finalDuration / 15) * 15;
  
  return {
    duration: snappedDuration,
    confidence,
    source: 'category_default',
    reasoning,
    range: {
      min: activityType.minDuration,
      max: activityType.maxDuration
    }
  };
}

/**
 * Determine activity type from Google Places types
 */
function determineActivityType(placeTypes: string[]): ActivityType {
  // Priority-ordered mapping of Google Places types to our activity types
  const typeMapping = {
    restaurant: ['restaurant', 'meal_takeaway', 'meal_delivery'],
    museum: ['museum'],
    shopping_mall: ['shopping_mall'],
    tourist_attraction: ['tourist_attraction', 'establishment'],
    park: ['park'],
    cafe: ['cafe'],
    bar: ['bar', 'night_club'],
    church: ['church', 'hindu_temple', 'mosque', 'synagogue', 'place_of_worship'],
    amusement_park: ['amusement_park'],
    zoo: ['zoo'],
    spa: ['spa', 'beauty_salon'],
    movie_theater: ['movie_theater']
  };
  
  // Find the first match
  for (const [activityKey, googleTypes] of Object.entries(typeMapping)) {
    if (googleTypes.some(type => placeTypes.includes(type))) {
      return ACTIVITY_TYPES[activityKey];
    }
  }
  
  // Default fallback
  return ACTIVITY_TYPES.tourist_attraction;
}

/**
 * Get suggested durations for activity type
 */
export function getSuggestedDurations(activityType: string): number[] {
  const type = ACTIVITY_TYPES[activityType] || ACTIVITY_TYPES.tourist_attraction;
  
  const suggestions: number[] = [];
  
  // Add minimum duration
  suggestions.push(type.minDuration);
  
  // Add default duration
  if (type.defaultDuration !== type.minDuration) {
    suggestions.push(type.defaultDuration);
  }
  
  // Add some middle values
  const quarter = Math.round((type.maxDuration - type.minDuration) * 0.25 + type.minDuration);
  const half = Math.round((type.maxDuration - type.minDuration) * 0.5 + type.minDuration);
  const threeQuarter = Math.round((type.maxDuration - type.minDuration) * 0.75 + type.minDuration);
  
  [quarter, half, threeQuarter].forEach(duration => {
    if (!suggestions.includes(duration) && duration < type.maxDuration) {
      suggestions.push(duration);
    }
  });
  
  // Add maximum duration
  if (!suggestions.includes(type.maxDuration)) {
    suggestions.push(type.maxDuration);
  }
  
  return suggestions.sort((a, b) => a - b);
}

/**
 * Estimate travel time between two places (simplified)
 */
export function estimateTravelTime(
  fromPlace: { coordinates?: [number, number]; address?: string },
  toPlace: { coordinates?: [number, number]; address?: string },
  mode: 'walking' | 'driving' | 'transit' = 'walking'
): number {
  // This is a simplified estimation - in production, use Google Maps Distance Matrix API
  
  if (!fromPlace.coordinates || !toPlace.coordinates) {
    // Fallback estimates without coordinates
    switch (mode) {
      case 'walking': return 15; // 15 minutes default
      case 'driving': return 10;
      case 'transit': return 20;
    }
  }
  
  // Calculate straight-line distance (rough approximation)
  const [fromLat, fromLng] = fromPlace.coordinates;
  const [toLat, toLng] = toPlace.coordinates;
  
  const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
  
  // Estimate travel time based on mode and distance
  switch (mode) {
    case 'walking':
      return Math.max(5, Math.round(distance * 12)); // ~5 km/h walking speed
    case 'driving':
      return Math.max(5, Math.round(distance * 2)); // ~30 km/h average city driving
    case 'transit':
      return Math.max(10, Math.round(distance * 4)); // ~15 km/h including wait times
    default:
      return Math.round(distance * 12);
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Smart duration adjustment based on schedule context
 */
export function adjustDurationForContext(
  baseDuration: number,
  context: {
    availableTime?: number; // available time slot in minutes
    hasNextActivity?: boolean;
    isLastActivity?: boolean;
    energyLevel?: 'high' | 'medium' | 'low';
  }
): number {
  let adjustedDuration = baseDuration;
  
  // If there's limited available time, constrain the duration
  if (context.availableTime && context.availableTime < baseDuration) {
    adjustedDuration = Math.max(30, context.availableTime - 15); // Leave 15min buffer
  }
  
  // Adjust based on energy level
  if (context.energyLevel === 'low') {
    adjustedDuration *= 0.8; // 20% shorter when tired
  } else if (context.energyLevel === 'high') {
    adjustedDuration *= 1.1; // 10% longer when energetic
  }
  
  // If it's the last activity, allow for flexibility
  if (context.isLastActivity) {
    adjustedDuration *= 1.2;
  }
  
  // Snap to 15-minute intervals
  return Math.round(adjustedDuration / 15) * 15;
}