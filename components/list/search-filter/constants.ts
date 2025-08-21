import { SearchFilters, TimePeriod, FilterOption, QuickFilterConfig } from './types';

export const TIME_PERIODS: TimePeriod[] = [
  { value: 'morning', label: 'Morning (6AM-12PM)', start: 6, end: 12 },
  { value: 'afternoon', label: 'Afternoon (12PM-6PM)', start: 12, end: 18 },
  { value: 'evening', label: 'Evening (6PM-12AM)', start: 18, end: 24 },
  { value: 'late-night', label: 'Late Night (12AM-6AM)', start: 0, end: 6 },
];

export const ACTIVITY_STATUS: FilterOption[] = [
  { value: 'scheduled', label: 'Scheduled (has time)' },
  { value: 'unscheduled', label: 'Unscheduled (no time)' },
  { value: 'with-notes', label: 'Has notes' },
  { value: 'without-notes', label: 'No notes' },
];

export const PRICE_LEVELS: FilterOption[] = [
  { value: '1', label: '$' },
  { value: '2', label: '$$' },
  { value: '3', label: '$$$' },
  { value: '4', label: '$$$$' },
];

export const DAYS_OF_WEEK: FilterOption[] = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export const QUICK_FILTERS: QuickFilterConfig[] = [
  { label: 'Scheduled', filters: { activityStatus: ['scheduled'] } },
  { label: 'Unscheduled', filters: { activityStatus: ['unscheduled'] } },
  { label: 'Has Notes', filters: { activityStatus: ['with-notes'] } },
  { label: 'Morning', filters: { timePeriods: ['morning'] } },
  { label: 'Evening', filters: { timePeriods: ['evening'] } },
  { label: 'High Rated', filters: { ratingRange: [4, 5] } },
  { label: 'Weekend', filters: { daysOfWeek: ['0', '6'] } },
];

export const DEFAULT_FILTERS: SearchFilters = {
  searchText: '',
  categories: [],
  timePeriods: [],
  activityStatus: [],
  priceLevel: [],
  ratingRange: [0, 5],
  daysOfWeek: [],
  hasNotes: null,
  hasTime: null,
  hasCoordinates: null,
};

export const STORAGE_KEY = 'itinerary-list-filters';