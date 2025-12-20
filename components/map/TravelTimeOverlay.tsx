"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { InfoWindow } from '@vis.gl/react-google-maps';
import Circle from './Circle';
import { 
  Clock, 
  Car, 
  PersonStanding, 
  Train, 
  Bike, 
  MapPin, 
  AlertTriangle,
  Zap,
  Navigation
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/utils/formatting/time';

interface TravelTimeData {
  from: {
    activityId: string;
    name: string;
    coordinates: [number, number];
    time?: string;
  };
  to: {
    activityId: string;
    name: string;
    coordinates: [number, number];
    time?: string;
  };
  modes: {
    walking?: {
      duration: number; // in minutes
      distance: number; // in meters
      reliable: boolean;
    };
    driving?: {
      duration: number;
      distance: number;
      trafficDuration?: number; // with current traffic
      reliable: boolean;
    };
    transit?: {
      duration: number;
      distance: number;
      transfers?: number;
      reliable: boolean;
    };
    bicycling?: {
      duration: number;
      distance: number;
      reliable: boolean;
    };
  };
  warnings?: string[];
  isRealistic: boolean; // Whether the travel time fits the schedule
}

interface ItineraryActivity {
  itinerary_activity_id: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  activity?: {
    name: string;
    coordinates?: [number, number];
    types?: string[];
  };
}

interface TravelTimeOverlayProps {
  activities: ItineraryActivity[];
  selectedDate?: string;
  showAllModes?: boolean;
  showWarnings?: boolean;
  onTravelModeSelect?: (fromId: string, toId: string, mode: string) => void;
  className?: string;
}

export function TravelTimeOverlay({
  activities,
  selectedDate,
  showAllModes = false,
  showWarnings = true,
  onTravelModeSelect,
  className,
}: TravelTimeOverlayProps) {
  const [selectedSegment, setSelectedSegment] = useState<TravelTimeData | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<'travel-time' | 'isochrone' | 'buffer' | null>('travel-time');

  // Filter activities for selected date
  const dayActivities = useMemo(() => {
    if (!selectedDate) return activities;
    return activities.filter(activity => 
      activity.date === selectedDate && 
      activity.activity?.coordinates
    ).sort((a, b) => {
      if (!a.start_time || !b.start_time) return 0;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [activities, selectedDate]);

  // Calculate travel times between consecutive activities
  const travelSegments = useMemo((): TravelTimeData[] => {
    const segments: TravelTimeData[] = [];
    
    for (let i = 0; i < dayActivities.length - 1; i++) {
      const fromActivity = dayActivities[i];
      const toActivity = dayActivities[i + 1];
      
      if (fromActivity.activity?.coordinates && toActivity.activity?.coordinates) {
        const travelData = calculateTravelTime(fromActivity, toActivity);
        segments.push(travelData);
      }
    }
    
    return segments;
  }, [dayActivities]);

  // Get color for travel time based on feasibility
  const getTravelTimeColor = (segment: TravelTimeData) => {
    if (!segment.isRealistic) return '#EF4444'; // Red for problematic
    if (segment.warnings && segment.warnings.length > 0) return '#F59E0B'; // Amber for warnings
    return '#10B981'; // Green for good
  };

  // Get recommended travel mode
  const getRecommendedMode = (segment: TravelTimeData) => {
    const modes = Object.entries(segment.modes)
      .filter(([_, data]) => data.reliable)
      .sort(([_, a], [__, b]) => a.duration - b.duration);
    
    return modes.length > 0 ? modes[0][0] : 'walking';
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case 'walking': return <PersonStanding className="h-4 w-4" />;
      case 'driving': return <Car className="h-4 w-4" />;
      case 'transit': return <Train className="h-4 w-4" />;
      case 'bicycling': return <Bike className="h-4 w-4" />;
      default: return <Navigation className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Control Panel */}
      <Card className="absolute top-4 left-4 z-10 p-3 bg-white/95 backdrop-blur">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="font-semibold text-sm">Travel Times</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs">Show all modes</span>
              <Switch
                checked={showAllModes}
                onCheckedChange={(checked) => {
                  // This would be handled by parent component
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs">Show warnings</span>
              <Switch
                checked={showWarnings}
                onCheckedChange={(checked) => {
                  // This would be handled by parent component
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Travel Time Segments */}
      {activeOverlay === 'travel-time' && travelSegments.map((segment, index) => {
        const midpoint = calculateMidpoint(
          segment.from.coordinates,
          segment.to.coordinates
        );
        
        const recommendedMode = getRecommendedMode(segment);
        const modeData = segment.modes[recommendedMode as keyof typeof segment.modes];
        
        return (
          <div key={`${segment.from.activityId}-${segment.to.activityId}`}>
            {/* Travel Time Indicator */}
            <div
              className="absolute z-10 cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${((midpoint.lng + 180) / 360) * 100}%`,
                top: `${((90 - midpoint.lat) / 180) * 100}%`,
              }}
              onClick={() => {
                setSelectedSegment(segment);
                setSelectedPosition(midpoint);
              }}
            >
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white shadow-lg",
                  "transition-transform hover:scale-110"
                )}
                style={{ backgroundColor: getTravelTimeColor(segment) }}
              >
                {getTravelModeIcon(recommendedMode)}
                <span>{formatDuration(modeData?.duration || 0)}</span>
                {segment.warnings && segment.warnings.length > 0 && (
                  <AlertTriangle className="h-3 w-3" />
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Isochrone Overlays (Travel Time Circles) */}
      {activeOverlay === 'isochrone' && dayActivities.map((activity, index) => {
        if (!activity.activity?.coordinates) return null;
        
        const [lng, lat] = activity.activity.coordinates;
        const center = { lat, lng };
        
        // Show different travel time zones (5, 10, 15 minutes walking)
        const timeZones = [
          { minutes: 5, radius: 400, color: '#10B981', opacity: 0.3 },
          { minutes: 10, radius: 800, color: '#F59E0B', opacity: 0.2 },
          { minutes: 15, radius: 1200, color: '#EF4444', opacity: 0.1 },
        ];
        
        return (
          <div key={activity.itinerary_activity_id}>
            {timeZones.map((zone) => (
              <Circle
                key={`${activity.itinerary_activity_id}-${zone.minutes}`}
                center={center}
                radius={zone.radius}
                fillColor={zone.color}
                fillOpacity={zone.opacity}
                strokeColor={zone.color}
                strokeOpacity={0.6}
                strokeWeight={1}
              />
            ))}
          </div>
        );
      })}

      {/* Travel Time Detail InfoWindow */}
      {selectedSegment && selectedPosition && (
        <InfoWindow
          position={selectedPosition}
          onCloseClick={() => {
            setSelectedSegment(null);
            setSelectedPosition(null);
          }}
          maxWidth={320}
        >
          <TravelTimeDetail
            segment={selectedSegment}
            showAllModes={showAllModes}
            onModeSelect={(mode) => {
              onTravelModeSelect?.(
                selectedSegment.from.activityId,
                selectedSegment.to.activityId,
                mode
              );
            }}
          />
        </InfoWindow>
      )}

      {/* Travel Time Summary */}
      <Card className="absolute bottom-4 left-4 z-10 p-3 bg-white/95 backdrop-blur max-w-xs">
        <TravelTimeSummary segments={travelSegments} />
      </Card>
    </div>
  );
}

// Travel time detail component
interface TravelTimeDetailProps {
  segment: TravelTimeData;
  showAllModes: boolean;
  onModeSelect: (mode: string) => void;
}

function TravelTimeDetail({ segment, showAllModes, onModeSelect }: TravelTimeDetailProps) {
  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return time;
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case 'walking': return <PersonStanding className="h-4 w-4" />;
      case 'driving': return <Car className="h-4 w-4" />;
      case 'transit': return <Train className="h-4 w-4" />;
      case 'bicycling': return <Bike className="h-4 w-4" />;
      default: return <Navigation className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-2 space-y-3 max-w-sm">
      {/* Route Info */}
      <div className="space-y-1">
        <div className="text-sm">
          <span className="font-medium text-green-600">From:</span> {segment.from.name}
          {segment.from.time && (
            <span className="text-gray-500 ml-1">at {formatTime(segment.from.time)}</span>
          )}
        </div>
        <div className="text-sm">
          <span className="font-medium text-red-600">To:</span> {segment.to.name}
          {segment.to.time && (
            <span className="text-gray-500 ml-1">by {formatTime(segment.to.time)}</span>
          )}
        </div>
      </div>

      {/* Travel Mode Options */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Travel Options</h4>
        
        {Object.entries(segment.modes)
          .filter(([mode, data]) => showAllModes || data.reliable)
          .sort(([_, a], [__, b]) => a.duration - b.duration)
          .map(([mode, data]: [string, any]) => (
            <div
              key={mode}
              className={cn(
                "flex items-center justify-between p-2 rounded border cursor-pointer transition-colors",
                data.reliable ? "hover:bg-gray-50" : "opacity-60"
              )}
              onClick={() => data.reliable && onModeSelect(mode)}
            >
              <div className="flex items-center gap-2">
                {getTravelModeIcon(mode)}
                <span className="text-sm capitalize">{mode}</span>
                {!data.reliable && (
                  <Badge variant="destructive" className="text-xs">
                    Unreliable
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{formatDuration(data.duration)}</span>
                <span className="text-gray-500">{formatDistance(data.distance)}</span>
                {mode === 'driving' && data.trafficDuration && data.trafficDuration > data.duration && (
                  <Badge variant="outline" className="text-xs">
                    +{formatDuration(data.trafficDuration - data.duration)} traffic
                  </Badge>
                )}
                {mode === 'transit' && data.transfers && (
                  <Badge variant="outline" className="text-xs">
                    {data.transfers} transfers
                  </Badge>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Warnings */}
      {segment.warnings && segment.warnings.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Warnings
          </h4>
          {segment.warnings.map((warning, index) => (
            <div key={index} className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
              {warning}
            </div>
          ))}
        </div>
      )}

      {/* Schedule Feasibility */}
      <div className="pt-2 border-t">
        <div className="flex items-center gap-2">
          {segment.isRealistic ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-green-700">Schedule is realistic</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs text-red-700">Tight schedule - consider adjusting</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Travel time summary component
interface TravelTimeSummaryProps {
  segments: TravelTimeData[];
}

function TravelTimeSummary({ segments }: TravelTimeSummaryProps) {
  const totalTravelTime = segments.reduce((sum, segment) => {
    const recommendedMode = Object.entries(segment.modes)
      .filter(([_, data]) => data.reliable)
      .sort(([_, a], [__, b]) => a.duration - b.duration)[0];
    
    return sum + (recommendedMode?.[1]?.duration || 0);
  }, 0);

  const problematicSegments = segments.filter(segment => !segment.isRealistic);
  const warningSegments = segments.filter(segment => segment.warnings && segment.warnings.length > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span className="font-semibold text-sm">Travel Summary</span>
      </div>
      
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span>Total travel time:</span>
          <Badge variant="secondary" className="text-xs">
            {formatDuration(totalTravelTime)}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Segments:</span>
          <span>{segments.length} routes</span>
        </div>
        
        {problematicSegments.length > 0 && (
          <div className="flex items-center justify-between text-red-600">
            <span>Issues:</span>
            <Badge variant="destructive" className="text-xs">
              {problematicSegments.length} problematic
            </Badge>
          </div>
        )}
        
        {warningSegments.length > 0 && (
          <div className="flex items-center justify-between text-amber-600">
            <span>Warnings:</span>
            <Badge variant="outline" className="text-xs border-amber-300">
              {warningSegments.length} warnings
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

// Utility functions
function calculateTravelTime(fromActivity: ItineraryActivity, toActivity: ItineraryActivity): TravelTimeData {
  const fromCoords = fromActivity.activity!.coordinates!;
  const toCoords = toActivity.activity!.coordinates!;
  
  const distance = calculateDistance(fromCoords, toCoords);
  
  // Estimate travel times (in practice, would use Google Maps API)
  const walkingSpeed = 5; // km/h
  const drivingSpeed = 30; // km/h in city
  const cyclingSpeed = 15; // km/h
  const transitSpeed = 20; // km/h average including waiting
  
  const distanceKm = distance / 1000;
  
  const walkingTime = Math.round((distanceKm / walkingSpeed) * 60);
  const drivingTime = Math.round((distanceKm / drivingSpeed) * 60);
  const cyclingTime = Math.round((distanceKm / cyclingSpeed) * 60);
  const transitTime = Math.round((distanceKm / transitSpeed) * 60) + 10; // Add waiting time
  
  // Check if schedule is realistic
  const availableTime = calculateAvailableTime(fromActivity, toActivity);
  const minRequiredTime = Math.min(walkingTime, drivingTime, cyclingTime, transitTime);
  
  const warnings: string[] = [];
  if (distance > 10000) { // > 10km
    warnings.push("Long distance - consider transportation mode carefully");
  }
  if (availableTime < minRequiredTime) {
    warnings.push("Not enough time allocated for travel");
  }
  
  return {
    from: {
      activityId: fromActivity.itinerary_activity_id,
      name: fromActivity.activity!.name,
      coordinates: fromCoords,
      time: fromActivity.start_time || undefined,
    },
    to: {
      activityId: toActivity.itinerary_activity_id,
      name: toActivity.activity!.name,
      coordinates: toCoords,
      time: toActivity.start_time || undefined,
    },
    modes: {
      walking: {
        duration: walkingTime,
        distance: distance,
        reliable: walkingTime <= 60, // Walking is reliable up to 1 hour
      },
      driving: {
        duration: drivingTime,
        distance: distance,
        trafficDuration: drivingTime * 1.3, // Add 30% for traffic
        reliable: distance > 1000, // Driving makes sense for > 1km
      },
      bicycling: {
        duration: cyclingTime,
        distance: distance,
        reliable: distance > 500 && distance < 15000, // 0.5km - 15km
      },
      transit: {
        duration: transitTime,
        distance: distance,
        transfers: distance > 5000 ? 1 : 0,
        reliable: distance > 2000, // Transit makes sense for > 2km
      },
    },
    warnings,
    isRealistic: availableTime >= minRequiredTime,
  };
}

function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateMidpoint(coord1: [number, number], coord2: [number, number]) {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  
  return {
    lat: (lat1 + lat2) / 2,
    lng: (lng1 + lng2) / 2,
  };
}

function calculateAvailableTime(fromActivity: ItineraryActivity, toActivity: ItineraryActivity): number {
  if (!fromActivity.end_time || !toActivity.start_time) return 60; // Default 1 hour
  
  const fromEnd = parseTime(fromActivity.end_time);
  const toStart = parseTime(toActivity.start_time);
  
  return toStart - fromEnd;
}

function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}