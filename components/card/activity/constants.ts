// Activity type to color mapping for consistent theming
export const ACTIVITY_TYPE_COLORS = {
  restaurant: {
    border: "border-l-orange-500",
    bg: "bg-orange-50",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-800"
  },
  tourist_attraction: {
    border: "border-l-purple-500",
    bg: "bg-purple-50", 
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-800"
  },
  lodging: {
    border: "border-l-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-800"
  },
  shopping: {
    border: "border-l-pink-500",
    bg: "bg-pink-50",
    text: "text-pink-700",
    badge: "bg-pink-100 text-pink-800"
  },
  park: {
    border: "border-l-green-500",
    bg: "bg-green-50",
    text: "text-green-700",
    badge: "bg-green-100 text-green-800"
  },
  museum: {
    border: "border-l-indigo-500",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    badge: "bg-indigo-100 text-indigo-800"
  },
  default: {
    border: "border-l-gray-400",
    bg: "bg-gray-50",
    text: "text-gray-700",
    badge: "bg-gray-100 text-gray-800"
  }
} as const;

// Price level display mapping
export const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  "1": "$",
  "2": "$$",
  "3": "$$$",
  "4": "$$$$"
} as const;

// Size configurations for different card sizes
export const SIZE_CONFIGS = {
  sm: {
    padding: "p-2",
    text: "text-xs",
    title: "text-sm",
    icon: "h-3 w-3",
    button: "h-6",
    gap: "gap-1"
  },
  md: {
    padding: "p-3",
    text: "text-sm", 
    title: "text-base",
    icon: "h-4 w-4",
    button: "h-8",
    gap: "gap-2"
  },
  lg: {
    padding: "p-4",
    text: "text-base",
    title: "text-lg",
    icon: "h-5 w-5",
    button: "h-10",
    gap: "gap-3"
  }
} as const;

// Variant-specific configurations
export const VARIANT_CONFIGS = {
  vertical: {
    layout: "flex-col",
    imageHeight: "h-48", // Fixed consistent height
    cardHeight: "h-[400px]", // Fixed total card height
    contentSpacing: "flex-1",
    titleClamp: "line-clamp-2",
    descriptionClamp: "line-clamp-2"
  },
  "horizontal-full": {
    layout: "flex-row", 
    imageWidth: "w-48", // Reduced from w-64 for better proportions
    imageHeight: "h-32", // Fixed height for horizontal images
    cardHeight: "h-32", // Fixed total card height
    contentSpacing: "flex-1",
    titleClamp: "line-clamp-2",
    descriptionClamp: "line-clamp-2"
  },
  "horizontal-simple": {
    layout: "flex-row",
    height: "h-16",
    contentSpacing: "px-4",
    titleClamp: "truncate",
    hideDescription: true
  },
  compact: {
    layout: "flex-row",
    height: "h-12",
    contentSpacing: "px-3",
    titleClamp: "truncate",
    hideAll: true
  },
  timeblock: {
    layout: "flex-col",
    contentSpacing: "p-2",
    titleClamp: "line-clamp-2",
    hideImage: true
  }
} as const;

// Animation and transition classes
export const TRANSITIONS = {
  card: "transition-all duration-200",
  hover: "hover:shadow-md",
  drag: "opacity-50 shadow-lg",
  selected: "ring-2 ring-blue-500 bg-blue-50/30 dark:bg-blue-900/20",
  editing: "ring-2 ring-yellow-500"
} as const;