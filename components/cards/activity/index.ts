// Unified Activity Card System
// Export all activity card components from a single entry point

export { BaseActivityCard } from "./BaseActivityCard";
export type { BaseActivityCardProps } from "./BaseActivityCard";

export { ListActivityCard } from "./ListActivityCard";
export { TimeBlockActivityCard } from "./TimeBlockActivityCard";
export { DraggableActivityCard } from "./DraggableActivityCard";

// Legacy exports for backwards compatibility during migration
export { ListActivityCard as ItineraryListCard } from "./ListActivityCard";
export { TimeBlockActivityCard as ActivityTimeBlock } from "./TimeBlockActivityCard";
export { DraggableActivityCard as ItineraryListCardWrapper } from "./DraggableActivityCard";