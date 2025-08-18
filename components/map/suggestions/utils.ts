import type { SuggestedActivity, ItineraryActivity } from './types';
import type { IActivity } from '@/store/activityStore';

export const getPriceDisplay = (priceLevel?: number): string => {
  if (!priceLevel) return '';
  return '$'.repeat(priceLevel);
};

export const formatTypes = (types: string[]): string => {
  return types
    .map(type => type.replace(/_/g, ' ').toLowerCase())
    .map(type => type.charAt(0).toUpperCase() + type.slice(1))
    .slice(0, 2)
    .join(', ');
};

export const convertToSuggestedActivity = (activity: IActivity): SuggestedActivity => {
  return {
    place_id: activity.place_id,
    name: activity.name,
    vicinity: activity.address || 'Address not available',
    rating: activity.rating || undefined,
    price_level: activity.price_level ? parseInt(activity.price_level) : undefined,
    types: activity.types || [],
    geometry: {
      location: {
        lat: activity.coordinates[1], // Convert from [lng, lat] to lat
        lng: activity.coordinates[0]  // Convert from [lng, lat] to lng
      }
    },
    photos: activity.photo_names ? activity.photo_names.map((name: string) => ({
      photo_reference: name,
      width: 400,
      height: 300
    })) : undefined,
    opening_hours: undefined // IActivity doesn't have opening hours info
  };
};

export const getExistingPlaceIds = (activities: ItineraryActivity[]): Set<string> => {
  return new Set(
    activities
      .map(a => a.activity?.place_id)
      .filter(Boolean) as string[]
  );
};