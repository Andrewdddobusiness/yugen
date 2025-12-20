"use client";

import React, { useMemo, useState } from 'react';
import { InfoWindow } from '@vis.gl/react-google-maps';
import { Polyline } from './Polyline';
import { 
  Route, 
  Clock, 
  TrendingDown, 
  Zap, 
  MapPin, 
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Shuffle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/utils/formatting/time';

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

interface OptimizedRoute {
  originalOrder: string[];
  optimizedOrder: string[];
  originalDistance: number; // in meters
  optimizedDistance: number; // in meters
  originalDuration: number; // in minutes
  optimizedDuration: number; // in minutes
  savings: {
    distanceSaved: number; // in meters
    timeSaved: number; // in minutes
    efficiencyGain: number; // percentage
  };
  segments: Array<{
    from: string;
    to: string;
    distance: number;
    duration: number;
    coordinates: [number, number][];
  }>;
}

interface RouteOptimizerProps {
  activities: ItineraryActivity[];
  date: string;
  onApplyOptimization?: (optimizedActivities: ItineraryActivity[]) => void;
  showVisualization?: boolean;
  className?: string;
}

export function RouteOptimizer({
  activities,
  date,
  onApplyOptimization,
  showVisualization = true,
  className,
}: RouteOptimizerProps) {
  const [selectedOptimization, setSelectedOptimization] = useState<OptimizedRoute | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Filter activities for the specific date with coordinates
  const dayActivities = useMemo(() => {
    return activities.filter(activity => 
      activity.date === date && 
      activity.activity?.coordinates
    ).sort((a, b) => {
      if (!a.start_time || !b.start_time) return 0;
      return a.start_time.localeCompare(b.start_time);
    });
  }, [activities, date]);

  // Calculate multiple optimization strategies
  const optimizationOptions = useMemo(() => {
    if (dayActivities.length < 3) return [];

    // Strategy 1: Shortest Distance (Traveling Salesman Problem approximation)
    const nearestNeighborRoute = calculateNearestNeighbor(dayActivities);
    
    // Strategy 2: Activity Type Clustering
    const clusteredRoute = calculateClusteredRoute(dayActivities);
    
    // Strategy 3: Time-based optimization (considering venue hours and meal times)
    const timeOptimizedRoute = calculateTimeOptimizedRoute(dayActivities);

    return [nearestNeighborRoute, clusteredRoute, timeOptimizedRoute].filter(Boolean);
  }, [dayActivities]);

  // Apply the selected optimization
  const handleApplyOptimization = (optimizedRoute: OptimizedRoute) => {
    const reorderedActivities = optimizedRoute.optimizedOrder.map(activityId => 
      dayActivities.find(act => act.itinerary_activity_id === activityId)!
    );

    // Redistribute times while maintaining the same time slots
    const timeSlots = dayActivities
      .filter(act => act.start_time)
      .map(act => ({ start: act.start_time, end: act.end_time }))
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));

    const optimizedActivities = reorderedActivities.map((activity, index) => ({
      ...activity,
      start_time: timeSlots[index]?.start || activity.start_time,
      end_time: timeSlots[index]?.end || activity.end_time,
    }));

    onApplyOptimization?.(optimizedActivities);
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  if (dayActivities.length < 3) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="text-center text-gray-500">
          <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Route optimization requires at least 3 activities</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Optimization Options */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Route Optimization</h3>
          <Badge variant="secondary" className="text-xs">
            {dayActivities.length} activities
          </Badge>
        </div>

        <div className="space-y-3">
          {optimizationOptions.map((option, index) => (
            <OptimizationOption
              key={index}
              option={option}
              isSelected={selectedOptimization === option}
              onSelect={() => setSelectedOptimization(option)}
              onApply={() => handleApplyOptimization(option)}
            />
          ))}
        </div>

        {selectedOptimization && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Optimized Route Preview</h4>
              <Button
                onClick={() => handleApplyOptimization(selectedOptimization)}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Apply
              </Button>
            </div>
            
            <RoutePreview route={selectedOptimization} activities={dayActivities} />
          </div>
        )}
      </Card>

      {/* Route Visualization */}
      {showVisualization && selectedOptimization && (
        <RouteVisualization
          originalActivities={dayActivities}
          optimizedRoute={selectedOptimization}
        />
      )}
    </div>
  );
}

// Individual optimization option component
interface OptimizationOptionProps {
  option: OptimizedRoute;
  isSelected: boolean;
  onSelect: () => void;
  onApply: () => void;
}

function OptimizationOption({ option, isSelected, onSelect, onApply }: OptimizationOptionProps) {
  const getStrategyInfo = (route: OptimizedRoute) => {
    if (route.savings.distanceSaved > route.savings.timeSaved * 50) {
      return {
        name: 'Shortest Distance',
        description: 'Minimizes total travel distance',
        icon: <TrendingDown className="h-4 w-4" />,
        color: 'bg-blue-500',
      };
    } else if (route.segments.some(s => s.duration < 10)) {
      return {
        name: 'Activity Clustering',
        description: 'Groups similar activities together',
        icon: <MapPin className="h-4 w-4" />,
        color: 'bg-purple-500',
      };
    } else {
      return {
        name: 'Time Optimized',
        description: 'Considers venue hours and meal timing',
        icon: <Clock className="h-4 w-4" />,
        color: 'bg-green-500',
      };
    }
  };

  const strategy = getStrategyInfo(option);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all",
        isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-gray-200 hover:border-gray-300"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded text-white", strategy.color)}>
            {strategy.icon}
          </div>
          
          <div className="flex-1">
            <h4 className="font-medium text-sm">{strategy.name}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {strategy.description}
            </p>
            
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-green-600">
                <Clock className="h-3 w-3" />
                <span>Save {Math.round(option.savings.timeSaved)}min</span>
              </div>
              
              <div className="flex items-center gap-1 text-blue-600">
                <TrendingDown className="h-3 w-3" />
                <span>Save {(option.savings.distanceSaved / 1000).toFixed(1)}km</span>
              </div>
              
              <Badge variant="outline" className="text-xs">
                {option.savings.efficiencyGain.toFixed(1)}% better
              </Badge>
            </div>
          </div>
        </div>

        {isSelected && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onApply();
            }}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Apply
          </Button>
        )}
      </div>
    </div>
  );
}

// Route preview component
interface RoutePreviewProps {
  route: OptimizedRoute;
  activities: ItineraryActivity[];
}

function RoutePreview({ route, activities }: RoutePreviewProps) {
  const getActivityById = (id: string) => 
    activities.find(act => act.itinerary_activity_id === id);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span>Optimized order:</span>
        <Badge variant="outline" className="text-xs">
          {route.optimizedOrder.length} stops
        </Badge>
      </div>
      
      <div className="space-y-1">
        {route.optimizedOrder.map((activityId, index) => {
          const activity = getActivityById(activityId);
          const isFirst = index === 0;
          const isLast = index === route.optimizedOrder.length - 1;
          
          return (
            <div key={activityId} className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                {!isLast && <ArrowRight className="h-3 w-3 text-gray-400" />}
              </div>
              
              <span className="flex-1 truncate">
                {activity?.activity?.name || 'Unknown Activity'}
              </span>
              
              {activity?.start_time && (
                <Badge variant="secondary" className="text-xs">
                  {activity.start_time}
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Route visualization on map
interface RouteVisualizationProps {
  originalActivities: ItineraryActivity[];
  optimizedRoute: OptimizedRoute;
}

function RouteVisualization({ originalActivities, optimizedRoute }: RouteVisualizationProps) {
  const originalPath = originalActivities
    .filter(act => act.activity?.coordinates)
    .map(act => {
      const [lng, lat] = act.activity!.coordinates!;
      return { lat, lng };
    });

  const optimizedPath = optimizedRoute.optimizedOrder
    .map(id => originalActivities.find(act => act.itinerary_activity_id === id))
    .filter(act => act?.activity?.coordinates)
    .map(act => {
      const [lng, lat] = act!.activity!.coordinates!;
      return { lat, lng };
    });

  return (
    <div className="space-y-2">
      {/* Original Route */}
      <Polyline
        path={originalPath}
        strokeColor="#EF4444"
        strokeOpacity={0.5}
        strokeWeight={3}
        geodesic={true}
      />
      
      {/* Optimized Route */}
      <Polyline
        path={optimizedPath}
        strokeColor="#10B981"
        strokeOpacity={0.8}
        strokeWeight={4}
        geodesic={true}
      />
    </div>
  );
}

// Route optimization algorithms
function calculateNearestNeighbor(activities: ItineraryActivity[]): OptimizedRoute {
  // Simplified TSP using nearest neighbor heuristic
  const unvisited = [...activities];
  const route = [unvisited.shift()!];
  
  while (unvisited.length > 0) {
    const current = route[route.length - 1];
    const currentCoords = current.activity!.coordinates!;
    
    let nearest = unvisited[0];
    let nearestDistance = Infinity;
    
    unvisited.forEach(activity => {
      const coords = activity.activity!.coordinates!;
      const distance = calculateDistance(currentCoords, coords);
      if (distance < nearestDistance) {
        nearest = activity;
        nearestDistance = distance;
      }
    });
    
    route.push(nearest);
    unvisited.splice(unvisited.indexOf(nearest), 1);
  }
  
  const originalOrder = activities.map(act => act.itinerary_activity_id);
  const optimizedOrder = route.map(act => act.itinerary_activity_id);
  
  const originalDistance = calculateTotalDistance(activities);
  const optimizedDistance = calculateTotalDistance(route);
  
  return {
    originalOrder,
    optimizedOrder,
    originalDistance,
    optimizedDistance,
    originalDuration: Math.round(originalDistance / 50), // Assume 50m/min walking
    optimizedDuration: Math.round(optimizedDistance / 50),
    savings: {
      distanceSaved: originalDistance - optimizedDistance,
      timeSaved: Math.round((originalDistance - optimizedDistance) / 50),
      efficiencyGain: ((originalDistance - optimizedDistance) / originalDistance) * 100,
    },
    segments: [],
  };
}

function calculateClusteredRoute(activities: ItineraryActivity[]): OptimizedRoute {
  // Group by activity types and optimize within clusters
  const clusters: Record<string, ItineraryActivity[]> = {};
  
  activities.forEach(activity => {
    const type = activity.activity?.types?.[0] || 'other';
    if (!clusters[type]) clusters[type] = [];
    clusters[type].push(activity);
  });
  
  // Sort clusters by priority (restaurants together, attractions together, etc.)
  const priorityOrder = ['restaurant', 'tourist_attraction', 'museum', 'shopping_mall', 'other'];
  const sortedClusters = priorityOrder
    .map(type => clusters[type] || [])
    .filter(cluster => cluster.length > 0);
  
  const optimizedRoute = sortedClusters.flat();
  
  const originalOrder = activities.map(act => act.itinerary_activity_id);
  const optimizedOrder = optimizedRoute.map(act => act.itinerary_activity_id);
  
  const originalDistance = calculateTotalDistance(activities);
  const optimizedDistance = calculateTotalDistance(optimizedRoute);
  
  return {
    originalOrder,
    optimizedOrder,
    originalDistance,
    optimizedDistance,
    originalDuration: Math.round(originalDistance / 50),
    optimizedDuration: Math.round(optimizedDistance / 50),
    savings: {
      distanceSaved: originalDistance - optimizedDistance,
      timeSaved: Math.round((originalDistance - optimizedDistance) / 50),
      efficiencyGain: ((originalDistance - optimizedDistance) / originalDistance) * 100,
    },
    segments: [],
  };
}

function calculateTimeOptimizedRoute(activities: ItineraryActivity[]): OptimizedRoute {
  // Consider meal times, venue hours, and logical flow
  const mealTypes = ['restaurant', 'cafe', 'meal_takeaway'];
  const sorted = [...activities].sort((a, b) => {
    const aIsMeal = mealTypes.some(type => a.activity?.types?.includes(type));
    const bIsMeal = mealTypes.some(type => b.activity?.types?.includes(type));
    
    // Prioritize meals at appropriate times
    if (aIsMeal && !bIsMeal) return -1;
    if (!aIsMeal && bIsMeal) return 1;
    
    // Sort by original time if available
    if (a.start_time && b.start_time) {
      return a.start_time.localeCompare(b.start_time);
    }
    
    return 0;
  });
  
  const originalOrder = activities.map(act => act.itinerary_activity_id);
  const optimizedOrder = sorted.map(act => act.itinerary_activity_id);
  
  const originalDistance = calculateTotalDistance(activities);
  const optimizedDistance = calculateTotalDistance(sorted);
  
  return {
    originalOrder,
    optimizedOrder,
    originalDistance,
    optimizedDistance,
    originalDuration: Math.round(originalDistance / 50),
    optimizedDuration: Math.round(optimizedDistance / 50),
    savings: {
      distanceSaved: originalDistance - optimizedDistance,
      timeSaved: Math.round((originalDistance - optimizedDistance) / 50),
      efficiencyGain: ((originalDistance - optimizedDistance) / originalDistance) * 100,
    },
    segments: [],
  };
}

// Utility functions
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

function calculateTotalDistance(activities: ItineraryActivity[]): number {
  let total = 0;
  for (let i = 0; i < activities.length - 1; i++) {
    const coord1 = activities[i].activity?.coordinates;
    const coord2 = activities[i + 1].activity?.coordinates;
    if (coord1 && coord2) {
      total += calculateDistance(coord1, coord2);
    }
  }
  return total;
}