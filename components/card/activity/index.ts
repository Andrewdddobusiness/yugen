// Main components
export { ActivityCard } from './ActivityCard';
export { ActivityCardSkeleton } from './ActivityCardSkeleton';

// Legacy wrappers for backward compatibility
export { LegacyActivityCardHorizontal } from './LegacyActivityCardHorizontal';

// Time management specific component
export { TimeBlockActivityCard } from './TimeBlockActivityCard';

// Sub-components (for advanced usage)
export { ActivityImage } from './components/ActivityImage';
export { ActivityMetadata } from './components/ActivityMetadata';
export { ActivityActions } from './components/ActivityActions';
export { ActivityTimeInfo } from './components/ActivityTimeInfo';

// Types
export type {
  ActivityCardProps,
  BaseActivityCardProps,
  ActivityCardVariant,
  ActivityCardSize,
  ActivityCardSkeletonProps,
  DragHandleProps,
  ActivityMetadataProps,
  ActivityActionsProps,
  ActivityData
} from './types';

// Utilities
export {
  isItineraryActivity,
  isActivityWithLocation,
  getActivityData
} from './types';

export {
  getActivityTypeColor,
  formatPriceLevel,
  getActivityName,
  getActivityTypes,
  getActivityRating,
  getActivityPriceLevel,
  getActivityAddress,
  getActivityDescription,
  getActivityPhotoUrls,
  hasFeature
} from './utils';

// Constants
export {
  ACTIVITY_TYPE_COLORS,
  PRICE_LEVELS,
  SIZE_CONFIGS,
  VARIANT_CONFIGS,
  TRANSITIONS
} from './constants';