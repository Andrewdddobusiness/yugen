"use client";

import React, { useState, useEffect } from 'react';
import { Clock, Car, Navigation, Bus, Bike, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { calculateTravelTime, type TravelMode, type TravelTimeResponse } from '@/actions/google/travelTime';
import type { Coordinates } from '@/types/database';

interface TravelTimeIndicatorProps {
  fromCoordinates: [number, number] | null;
  toCoordinates: [number, number] | null;
  fromName?: string;
  toName?: string;
  className?: string;
  compact?: boolean;
  showAllModes?: boolean;
  departureTime?: Date;
}

const TRANSPORT_MODES: Array<{
  mode: TravelMode;
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  priority: number;
}> = [
  { mode: 'walking', icon: Navigation, label: 'Walk', color: 'text-green-600', priority: 1 },
  { mode: 'driving', icon: Car, label: 'Drive', color: 'text-blue-600', priority: 2 },
  { mode: 'transit', icon: Bus, label: 'Transit', color: 'text-purple-600', priority: 3 },
  { mode: 'bicycling', icon: Bike, label: 'Bike', color: 'text-orange-600', priority: 4 },
];

// Simple in-memory cache for component-level caching
const componentCache = new Map<string, { data: TravelTimeResponse; timestamp: number }>();
const COMPONENT_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function generateComponentCacheKey(from: [number, number], to: [number, number]): string {
  const fromKey = `${Math.round(from[0] * 10000)},${Math.round(from[1] * 10000)}`;
  const toKey = `${Math.round(to[0] * 10000)},${Math.round(to[1] * 10000)}`;
  return `${fromKey}|${toKey}`;
}

export function TravelTimeIndicator({
  fromCoordinates,
  toCoordinates,
  fromName = 'Previous location',
  toName = 'Next location',
  className,
  compact = false,
  showAllModes = false,
  departureTime
}: TravelTimeIndicatorProps) {
  const [travelTimes, setTravelTimes] = useState<TravelTimeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Convert coordinates format
  const fromCoords = fromCoordinates ? { lat: fromCoordinates[0], lng: fromCoordinates[1] } : null;
  const toCoords = toCoordinates ? { lat: toCoordinates[0], lng: toCoordinates[1] } : null;

  useEffect(() => {
    if (!fromCoords || !toCoords) {
      setTravelTimes(null);
      setError(null);
      return;
    }

    const fetchTravelTimes = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check component cache first
        const cacheKey = generateComponentCacheKey(fromCoordinates!, toCoordinates!);
        const cached = componentCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < COMPONENT_CACHE_DURATION) {
          setTravelTimes(cached.data);
          setLoading(false);
          return;
        }

        // Determine which modes to request
        const modes: TravelMode[] = showAllModes 
          ? ['walking', 'driving', 'transit', 'bicycling']
          : ['walking', 'driving'];

        const result = await calculateTravelTime(
          fromCoords,
          toCoords,
          modes,
          departureTime
        );

        if (result.success && result.data) {
          setTravelTimes(result.data);
          
          // Update component cache
          componentCache.set(cacheKey, {
            data: result.data,
            timestamp: Date.now()
          });
        } else {
          setError(result.error?.message || 'Failed to calculate travel time');
        }
      } catch (err: any) {
        console.error('Error fetching travel times:', err);
        setError('Unable to calculate travel time');
      } finally {
        setLoading(false);
      }
    };

    fetchTravelTimes();
  }, [fromCoords?.lat, fromCoords?.lng, toCoords?.lat, toCoords?.lng, showAllModes, departureTime]);

  // Don't render if no coordinates provided
  if (!fromCoords || !toCoords) {
    return null;
  }

  // Don't render if it's the same location (within ~100m)
  const distance = getDistanceFromLatLonInMeters(
    fromCoords.lat, fromCoords.lng, 
    toCoords.lat, toCoords.lng
  );
  
  if (distance < 100) {
    return null;
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className={cn(
          "flex items-center justify-center gap-2 text-gray-500",
          compact ? "py-2" : "py-4"
        )}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Calculating travel time...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className={cn(
          "flex items-center gap-2 text-gray-500",
          compact ? "py-2" : "py-4"
        )}>
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <span className="text-sm">Travel time unavailable</span>
        </div>
      );
    }

    if (!travelTimes || Object.keys(travelTimes.results).length === 0) {
      return (
        <div className={cn(
          "flex items-center gap-2 text-gray-500",
          compact ? "py-2" : "py-4"
        )}>
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <span className="text-sm">No route found</span>
        </div>
      );
    }

    // Get available modes sorted by priority
    const availableModes = TRANSPORT_MODES
      .filter(({ mode }) => travelTimes.results[mode])
      .sort((a, b) => a.priority - b.priority);

    if (availableModes.length === 0) {
      return (
        <div className={cn(
          "flex items-center gap-2 text-gray-500",
          compact ? "py-2" : "py-4"
        )}>
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <span className="text-sm">No routes available</span>
        </div>
      );
    }

    const primaryMode = availableModes[0];
    const primaryResult = travelTimes.results[primaryMode.mode]!;

    if (compact) {
      // Compact view - show only the best option
      const Icon = primaryMode.icon;
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Icon className={cn("h-4 w-4", primaryMode.color)} />
          <span className="font-medium">{primaryResult.duration.text}</span>
          <span className="text-gray-400">({primaryResult.distance.text})</span>
        </div>
      );
    }

    // Full view
    return (
      <div className="space-y-3">
        {/* Primary route */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <primaryMode.icon className={cn("h-5 w-5", primaryMode.color)} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{primaryResult.duration.text}</span>
                <span className="text-sm text-gray-500">({primaryResult.distance.text})</span>
              </div>
              <span className="text-xs text-gray-400 capitalize">{primaryMode.label}</span>
            </div>
          </div>
          
          {availableModes.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  More options
                </>
              )}
            </Button>
          )}
        </div>

        {/* Additional routes */}
        {availableModes.length > 1 && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleContent>
              <div className="space-y-2 pl-8 border-l border-gray-200">
                {availableModes.slice(1).map(({ mode, icon: Icon, label, color }) => {
                  const result = travelTimes.results[mode];
                  if (!result) return null;

                  return (
                    <div key={mode} className="flex items-center gap-3">
                      <Icon className={cn("h-4 w-4", color)} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{result.duration.text}</span>
                          <span className="text-xs text-gray-500">({result.distance.text})</span>
                        </div>
                        <span className="text-xs text-gray-400 capitalize">{label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={cn("px-4 py-2", className)}>
        {renderContent()}
      </div>
    );
  }

  return (
    <Card className={cn("border-l-4 border-l-gray-300 bg-gray-50/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Travel Time</span>
        </div>
        {renderContent()}
      </CardContent>
    </Card>
  );
}

// Helper function to calculate distance between two points in meters
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}