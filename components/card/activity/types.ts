import { type IActivity, type IActivityWithLocation } from "@/store/activityStore";
import { type IItineraryActivity } from "@/store/itineraryActivityStore";

// Base props shared by all activity cards
export interface BaseActivityCardProps {
  className?: string;
  
  // Interaction states
  isSelected?: boolean;
  isHovered?: boolean;
  isDragging?: boolean;
  isEditing?: boolean;
  isLoading?: boolean;
  
  // Event handlers
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onHover?: (hovered: boolean) => void;
  
  // Display options
  showTime?: boolean;
  showDate?: boolean;
  showAddress?: boolean;
  showRating?: boolean;
  showPrice?: boolean;
  showCategory?: boolean;
  showNotes?: boolean;
  showTravelTime?: boolean;
  showImage?: boolean;
  showDescription?: boolean;
  showActions?: boolean;
  
  // Custom content slots
  customActions?: React.ReactNode;
  customHeader?: React.ReactNode;
  customFooter?: React.ReactNode;
  customImage?: React.ReactNode;
  
  // Time/duration data
  startTime?: string;
  endTime?: string;
  duration?: number;
  travelTime?: string;
  
  // Additional styling
  borderColor?: string;
  accentColor?: string;
}

// Variant-specific props
export type ActivityCardVariant = 'vertical' | 'horizontal-full' | 'horizontal-simple' | 'compact' | 'timeblock';
export type ActivityCardSize = 'sm' | 'md' | 'lg';

// Props for unified ActivityCard component
export interface ActivityCardProps extends BaseActivityCardProps {
  activity: IActivity | IActivityWithLocation | IItineraryActivity;
  variant?: ActivityCardVariant;
  size?: ActivityCardSize;
  
  // Actions for non-itinerary activities
  onAddToItinerary?: () => void;
  onRemoveFromItinerary?: () => void;
  onOptionsClick?: () => void;
  
  // State for button display
  isAdded?: boolean;
  
  // Additional variant-specific options
  showSaveButton?: boolean; // For wishlist functionality
}

// Props for skeleton loading states
export interface ActivityCardSkeletonProps {
  variant?: ActivityCardVariant;
  size?: ActivityCardSize;
  className?: string;
}

// Props for drag handle component
export interface DragHandleProps {
  dragHandleProps?: any;
  isVisible?: boolean;
  className?: string;
}

// Props for activity metadata display
export interface ActivityMetadataProps {
  activity: IActivity | IActivityWithLocation;
  showRating?: boolean;
  showPrice?: boolean;
  showCategory?: boolean;
  showDuration?: boolean;
  size?: ActivityCardSize;
  className?: string;
}

// Props for activity actions
export interface ActivityActionsProps {
  isAdded?: boolean;
  isLoading?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  onOptions?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  variant?: 'default' | 'inline' | 'dropdown';
  size?: ActivityCardSize;
  className?: string;
}

// Helper type to extract activity data from different activity types
export type ActivityData = IActivity | IActivityWithLocation | (IItineraryActivity & { activity?: IActivity });

// Type guard functions
export const isItineraryActivity = (activity: ActivityData): activity is IItineraryActivity => {
  return 'itinerary_activity_id' in activity;
};

export const isActivityWithLocation = (activity: ActivityData): activity is IActivityWithLocation => {
  return 'country_name' in activity && 'city_name' in activity;
};

export const getActivityData = (activity: ActivityData): IActivity | undefined => {
  if (isItineraryActivity(activity)) {
    return activity.activity;
  }
  return activity as IActivity;
};