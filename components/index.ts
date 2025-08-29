// Components main index following UI-first organization

// Button components
export * from './button';

// Card components
export * from './card';

// Dialog components
export * from './dialog';

// Drag and drop components
export * from './dnd';

// Filter components
export * from './filters';

// Form components
export * from './form';

// Hook components
export * from './hooks';

// Landing page components
export * from './landing';

// Layout components
export * from './layout';

// List components
export * from './list';

// Loading components
export * from './loading';

// Map components
export * from './map';

// Mobile components
export * from './mobile';

// Navigation components
export * from './navigation';

// Provider components
export * from './provider';

// Rating components
export * from './rating';

// Search components
export * from './search';

// Settings components
export * from './settings';

// Table components
export * from './table';

// Travel components
export * from './travel';

// UI primitive components
export * from './ui';

// View components
export * from './view';

// Re-export commonly used components for backwards compatibility
export { default as ActivityCard } from './card/activity/ActivityCard';
export { default as ActivityCards } from './card/activity/ActivityCards';
export { default as ItineraryCard } from './card/itinerary/ItineraryCard';
export { default as GoogleMap } from './map/GoogleMap';
export { default as Calendar } from './view/calendar/Calendar';
export { default as ViewToggle } from './view/toggle/ViewToggle';
export { default as Navigation } from './layout/navigation/Navigation';
export { default as Footer } from './layout/footer/Footer';