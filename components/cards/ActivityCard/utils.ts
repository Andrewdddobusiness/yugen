import { ACTIVITY_TYPE_COLORS, PRICE_LEVELS } from "./constants";
import { type ActivityData, getActivityData } from "./types";

// Get the appropriate color scheme for an activity based on its type
export const getActivityTypeColor = (types?: string[]) => {
  if (!types || types.length === 0) return ACTIVITY_TYPE_COLORS.default;
  
  // Check primary types first
  for (const type of types) {
    if (type in ACTIVITY_TYPE_COLORS) {
      return ACTIVITY_TYPE_COLORS[type as keyof typeof ACTIVITY_TYPE_COLORS];
    }
  }
  
  // Check for related types
  if (types.some(t => t.includes('restaurant') || t.includes('food'))) {
    return ACTIVITY_TYPE_COLORS.restaurant;
  }
  if (types.some(t => t.includes('attraction') || t.includes('point_of_interest'))) {
    return ACTIVITY_TYPE_COLORS.tourist_attraction;
  }
  if (types.some(t => t.includes('lodging') || t.includes('hotel'))) {
    return ACTIVITY_TYPE_COLORS.lodging;
  }
  
  return ACTIVITY_TYPE_COLORS.default;
};

// Format price level for display
export const formatPriceLevel = (priceLevel?: string): string => {
  if (!priceLevel) return "";
  return PRICE_LEVELS[priceLevel as keyof typeof PRICE_LEVELS] || "";
};

// Get activity name with proper formatting
export const getActivityName = (activity: ActivityData): string => {
  const activityData = getActivityData(activity);
  return activityData?.name || "Unnamed Activity";
};

// Get activity types array
export const getActivityTypes = (activity: ActivityData): string[] => {
  const activityData = getActivityData(activity);
  return activityData?.types || [];
};

// Get activity rating
export const getActivityRating = (activity: ActivityData): number | undefined => {
  const activityData = getActivityData(activity);
  return activityData?.rating;
};

// Get activity price level
export const getActivityPriceLevel = (activity: ActivityData): string | undefined => {
  const activityData = getActivityData(activity);
  return activityData?.price_level;
};

// Get activity address
export const getActivityAddress = (activity: ActivityData): string | undefined => {
  const activityData = getActivityData(activity);
  return activityData?.address;
};

// Get activity description
export const getActivityDescription = (activity: ActivityData): string | undefined => {
  const activityData = getActivityData(activity);
  return activityData?.description;
};

// Get activity photo URLs
export const getActivityPhotoUrls = (activity: ActivityData): string[] => {
  const activityData = getActivityData(activity);
  if (!activityData?.photo_names || activityData.photo_names.length === 0) return [];
  
  return activityData.photo_names.map(photoName => 
    `https://places.googleapis.com/v1/${photoName}/media?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&maxHeightPx=1000&maxWidthPx=1000`
  );
};

// Check if activity has specific feature
export const hasFeature = (activity: ActivityData, feature: string): boolean => {
  switch (feature) {
    case 'image':
      const photos = getActivityPhotoUrls(activity);
      return photos.length > 0;
    case 'rating':
      return getActivityRating(activity) !== undefined;
    case 'price':
      return !!getActivityPriceLevel(activity);
    case 'description':
      return !!getActivityDescription(activity);
    case 'address':
      return !!getActivityAddress(activity);
    default:
      return false;
  }
};