import type { Filters } from './types';

export const AVAILABLE_TYPES = [
  { value: 'restaurant', label: 'Restaurants', emoji: '🍽️' },
  { value: 'tourist_attraction', label: 'Attractions', emoji: '🏛️' },
  { value: 'museum', label: 'Museums', emoji: '🎨' },
  { value: 'park', label: 'Parks', emoji: '🌳' },
  { value: 'shopping_mall', label: 'Shopping', emoji: '🛍️' },
  { value: 'cafe', label: 'Cafes', emoji: '☕' },
  { value: 'bar', label: 'Bars', emoji: '🍺' },
  { value: 'church', label: 'Religious Sites', emoji: '⛪' },
  { value: 'amusement_park', label: 'Entertainment', emoji: '🎢' },
  { value: 'spa', label: 'Wellness', emoji: '🧖‍♀️' },
];

export const DEFAULT_FILTERS: Filters = {
  types: [],
  minRating: 0,
  maxPriceLevel: 4,
  openNow: false,
  radius: 2000,
  searchType: 'all',
};