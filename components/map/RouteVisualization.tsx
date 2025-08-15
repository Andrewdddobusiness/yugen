"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { InfoWindow } from '@vis.gl/react-google-maps';
import { Clock, Car, PersonStanding, Train, Bike, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RouteSegment {
  from: {
    activityId: string;
    name: string;
    coordinates: [number, number]; // [lng, lat]
    time?: string;
  };
  to: {
    activityId: string;
    name: string;
    coordinates: [number, number]; // [lng, lat]
    time?: string;
  };
  travelMode: 'walking' | 'driving' | 'transit' | 'bicycling';
  duration?: string;
  distance?: string;
  polylinePath?: google.maps.LatLng[];
}

interface DailyRoute {
  date: string;
  dayIndex: number;
  segments: RouteSegment[];
  color: string;
  totalDuration?: number; // in minutes
  totalDistance?: number; // in meters
}

interface RouteVisualizationProps {
  routes: DailyRoute[];
  visibleDays?: string[];
  showTravelTimes?: boolean;
  animated?: boolean;
  onRouteClick?: (segment: RouteSegment) => void;
  className?: string;
}

export function RouteVisualization({
  routes,
  visibleDays = [],
  showTravelTimes = true,
  animated = false,
  onRouteClick,
  className,
}: RouteVisualizationProps) {
  const [selectedSegment, setSelectedSegment] = useState<{
    segment: RouteSegment;
    position: { lat: number; lng: number };
  } | null>(null);

  // Filter routes by visible days
  const visibleRoutes = useMemo(() => {
    if (visibleDays.length === 0) return routes;
    return routes.filter(route => visibleDays.includes(route.date));
  }, [routes, visibleDays]);

  // Get travel mode icon
  const getTravelModeIcon = (mode: RouteSegment['travelMode']) => {
    switch (mode) {
      case 'walking':
        return <PersonStanding className="h-3 w-3" />;
      case 'driving':
        return <Car className="h-3 w-3" />;
      case 'transit':
        return <Train className="h-3 w-3" />;
      case 'bicycling':
        return <Bike className="h-3 w-3" />;
      default:
        return <Navigation className="h-3 w-3" />;
    }
  };

  const getTravelModeColor = (mode: RouteSegment['travelMode']) => {
    switch (mode) {
      case 'walking':
        return '#10B981'; // Green
      case 'driving':
        return '#3B82F6'; // Blue
      case 'transit':
        return '#8B5CF6'; // Purple
      case 'bicycling':
        return '#F59E0B'; // Amber
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <div className={className}>
      {/* Note: Polyline not available in current @vis.gl/react-google-maps version */}
      {/* Route visualization will be implemented with alternative approach */}
      
      {/* Route Info Window */}
      {selectedSegment && (
        <InfoWindow
          position={selectedSegment.position}
          onCloseClick={() => setSelectedSegment(null)}
          maxWidth={280}
        >
          <RouteInfoContent 
            segment={selectedSegment.segment}
            showTravelTimes={showTravelTimes}
          />
        </InfoWindow>
      )}
    </div>
  );
}

// Route info content component
interface RouteInfoContentProps {
  segment: RouteSegment;
  showTravelTimes: boolean;
}

function RouteInfoContent({ segment, showTravelTimes }: RouteInfoContentProps) {
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

  return (
    <div className="p-2 space-y-3">
      {/* From/To */}
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

      {/* Travel Details */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {getTravelModeIcon(segment.travelMode)}
          <span className="text-sm capitalize">{segment.travelMode}</span>
        </div>
        
        {showTravelTimes && segment.duration && (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {segment.duration}
          </Badge>
        )}
        
        {segment.distance && (
          <Badge variant="secondary" className="text-xs">
            {segment.distance}
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const fromCoords = segment.from.coordinates;
            const toCoords = segment.to.coordinates;
            const url = `https://www.google.com/maps/dir/${fromCoords[1]},${fromCoords[0]}/${toCoords[1]},${toCoords[0]}`;
            window.open(url, '_blank');
          }}
          className="flex-1 text-xs"
        >
          Get Directions
        </Button>
      </div>
    </div>
  );
}

// Day route summary component
interface DayRouteSummaryProps {
  route: DailyRoute;
  isVisible: boolean;
  onToggleVisibility: (date: string) => void;
  className?: string;
}

export function DayRouteSummary({
  route,
  isVisible,
  onToggleVisibility,
  className,
}: DayRouteSummaryProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString([], { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Get travel mode distribution
  const travelModes = route.segments.reduce((acc, segment) => {
    acc[segment.travelMode] = (acc[segment.travelMode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case 'walking': return '🚶';
      case 'driving': return '🚗';
      case 'transit': return '🚌';
      case 'bicycling': return '🚲';
      default: return '🗺️';
    }
  };

  return (
    <div className={cn("p-3 bg-white dark:bg-gray-800 rounded-lg border shadow-sm", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: route.color }}
          />
          <h4 className="font-semibold text-sm">
            Day {route.dayIndex + 1} - {formatDate(route.date)}
          </h4>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleVisibility(route.date)}
          className={cn("text-xs", isVisible ? "text-blue-600" : "text-gray-500")}
        >
          {isVisible ? 'Hide' : 'Show'}
        </Button>
      </div>

      <div className="space-y-2">
        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <span>{route.segments.length} segments</span>
          </div>
          
          {route.totalDuration && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(route.totalDuration)}</span>
            </div>
          )}
          
          {route.totalDistance && (
            <div className="flex items-center gap-1">
              <span>{formatDistance(route.totalDistance)}</span>
            </div>
          )}
        </div>

        {/* Travel Modes */}
        <div className="flex items-center gap-2">
          {Object.entries(travelModes).map(([mode, count]) => (
            <Badge key={mode} variant="outline" className="text-xs">
              <span className="mr-1">{getTravelModeIcon(mode)}</span>
              {count}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// Route optimization suggestions
interface RouteOptimizationProps {
  originalRoute: DailyRoute;
  optimizedRoute?: DailyRoute;
  savings?: {
    timeSaved: number; // minutes
    distanceSaved: number; // meters
  };
  onApplyOptimization?: () => void;
  className?: string;
}

export function RouteOptimization({
  originalRoute,
  optimizedRoute,
  savings,
  onApplyOptimization,
  className,
}: RouteOptimizationProps) {
  if (!optimizedRoute || !savings) {
    return null;
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className={cn("p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800", className)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-blue-900 dark:text-blue-100">
            Route Optimization Available
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            We found a more efficient route for your day
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-700 dark:text-blue-300">Time saved:</span>
          <span className="font-semibold text-blue-900 dark:text-blue-100">
            {formatDuration(savings.timeSaved)}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-700 dark:text-blue-300">Distance saved:</span>
          <span className="font-semibold text-blue-900 dark:text-blue-100">
            {formatDistance(savings.distanceSaved)}
          </span>
        </div>
      </div>

      <Button
        onClick={onApplyOptimization}
        className="w-full"
        size="sm"
      >
        Apply Optimized Route
      </Button>
    </div>
  );
}