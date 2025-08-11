// Travel time system type definitions

export type { TravelMode, TravelTimeResult, TravelTimeRequest, TravelTimeResponse } from '@/actions/google/travelTime';

export type {
  ActivityWithCoordinates,
  TravelTimeResult as TravelTimeUtilResult
} from '@/utils/travel/travelTimeUtils';

export interface TravelTimeDisplayProps {
  fromCoordinates: [number, number] | null;
  toCoordinates: [number, number] | null;
  fromName?: string;
  toName?: string;
  className?: string;
  compact?: boolean;
  showAllModes?: boolean;
  departureTime?: Date;
}

export interface TravelTimeConflict {
  fromActivityId: string;
  toActivityId: string;
  conflict: string;
  severity: 'warning' | 'error';
}

export interface TravelTimeSummary {
  totalDuration: number; // in seconds
  totalDistance: number; // in meters
  formattedDuration: string;
  formattedDistance: string;
}

export interface TravelTimeSettings {
  modes: TravelMode[];
  showConflicts: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface TravelTimeCacheEntry {
  data: TravelTimeResponse;
  timestamp: number;
}

export interface TravelTimeCacheStats {
  size: number;
  keys: string[];
  oldestEntry: number;
  newestEntry: number;
}