"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { APIProvider, Map, MapCameraChangedEvent, useMap } from '@vis.gl/react-google-maps';
import { Route as RouteIcon, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { ItineraryActivityMarker, ClusterMarker } from './ItineraryActivityMarker';
// import { RouteVisualization, DayRouteSummary } from './RouteVisualization';
import { LocationSuggestions } from './LocationSuggestions';
import { MapExport } from './MapExport';
import { useMapStore } from '@/store/mapStore';

// Map controller component that uses useMap hook
function ItineraryMapController({ 
  itineraryCoordinates, 
  validActivities, 
  mapBounds 
}: { 
  itineraryCoordinates: [number, number] | null;
  validActivities: any[];
  mapBounds: google.maps.LatLngBounds | null;
}) {
  const map = useMap("itinerary-map");

  useEffect(() => {
    if (!map) return;

    if (mapBounds) {
      map.fitBounds(mapBounds, 50);
    } else if (itineraryCoordinates && validActivities.length === 0) {
      // Set appropriate zoom level for destination when no activities
      map.setCenter({ lat: itineraryCoordinates[0], lng: itineraryCoordinates[1] });
      map.setZoom(12); // City-level zoom
    }
  }, [map, mapBounds, itineraryCoordinates, validActivities.length]);

  return null; // This component doesn't render anything
}

interface ItineraryActivity {
  itinerary_activity_id: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes?: string;
  activity?: {
    activity_id?: string;
    name: string;
    address?: string;
    coordinates?: [number, number];
    types?: string[];
    rating?: number;
    price_level?: string;
    phone_number?: string;
    website_url?: string;
    photo_names?: string[];
    place_id?: string;
  };
}

interface DailyRoute {
  date: string;
  dayIndex: number;
  segments: RouteSegment[];
  color: string;
  totalDuration?: number;
  totalDistance?: number;
}

interface RouteSegment {
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
  travelMode: 'walking' | 'driving' | 'transit' | 'bicycling';
  duration?: string;
  distance?: string;
  polylinePath?: google.maps.LatLng[];
}

interface ClusterGroup {
  activities: ItineraryActivity[];
  center: { lat: number; lng: number };
  bounds: google.maps.LatLngBounds;
}

interface ItineraryMapProps {
  activities: ItineraryActivity[];
  selectedActivityId?: string;
  visibleDays?: string[];
  showRoutes?: boolean;
  showSuggestions?: boolean;
  showExport?: boolean;
  selectedDate?: string;
  itineraryName?: string;
  destinationName?: string;
  onActivitySelect?: (activityId: string) => void;
  onActivityEdit?: (activityId: string) => void;
  onAddSuggestion?: (suggestion: any, date?: string) => void;
  className?: string;
}

export function ItineraryMap({
  activities,
  selectedActivityId,
  visibleDays = [],
  showRoutes = true,
  showSuggestions = true,
  showExport = true,
  selectedDate,
  itineraryName,
  destinationName,
  onActivitySelect,
  onActivityEdit,
  onAddSuggestion,
  className,
}: ItineraryMapProps) {
  const { centerCoordinates, itineraryCoordinates, initialZoom, setCenterCoordinates } = useMapStore();
  const [showClusters, setShowClusters] = useState(true);
  const [localShowRoutes, setLocalShowRoutes] = useState(showRoutes);
  const [hiddenDays, setHiddenDays] = useState<Set<string>>(new Set());

  // Filter activities with coordinates
  const validActivities = useMemo(() => {
    const valid = activities.filter(activity => {
      const hasCoords = activity.activity?.coordinates && 
                       Array.isArray(activity.activity.coordinates) && 
                       activity.activity.coordinates.length === 2;
      const hasDate = activity.date;
      const isVisible = visibleDays.length === 0 || visibleDays.includes(activity.date || '');
      return hasCoords && hasDate && isVisible;
    });
    return valid;
  }, [activities, visibleDays]);

  // Group activities by day
  const dailyActivities = useMemo(() => {
    const grouped = validActivities.reduce((acc, activity) => {
      const date = activity.date!;
      if (!acc[date]) acc[date] = [];
      acc[date].push(activity);
      return acc;
    }, {} as Record<string, ItineraryActivity[]>);

    // Sort activities by start time within each day
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        if (!a.start_time || !b.start_time) return 0;
        return a.start_time.localeCompare(b.start_time);
      });
    });

    return grouped;
  }, [validActivities]);

  // Generate daily routes
  const dailyRoutes = useMemo((): DailyRoute[] => {
    const dayColors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
      '#8B5CF6', '#F97316', '#06B6D4'
    ];

    return Object.entries(dailyActivities).map(([date, dayActivities], dayIndex) => {
      if (dayActivities.length < 2) {
        return {
          date,
          dayIndex,
          segments: [],
          color: dayColors[dayIndex % dayColors.length],
        };
      }

      const segments: RouteSegment[] = [];
      
      for (let i = 0; i < dayActivities.length - 1; i++) {
        const fromActivity = dayActivities[i];
        const toActivity = dayActivities[i + 1];
        
        if (fromActivity.activity?.coordinates && toActivity.activity?.coordinates) {
          segments.push({
            from: {
              activityId: fromActivity.itinerary_activity_id,
              name: fromActivity.activity.name,
              coordinates: fromActivity.activity.coordinates,
              time: fromActivity.start_time || undefined,
            },
            to: {
              activityId: toActivity.itinerary_activity_id,
              name: toActivity.activity.name,
              coordinates: toActivity.activity.coordinates,
              time: toActivity.start_time || undefined,
            },
            travelMode: 'walking', // Default to walking, could be enhanced with travel mode detection
            duration: '15 min', // Placeholder - would calculate with Google Maps API
            distance: '1.2 km', // Placeholder - would calculate with Google Maps API
          });
        }
      }

      return {
        date,
        dayIndex,
        segments,
        color: dayColors[dayIndex % dayColors.length],
      };
    });
  }, [dailyActivities]);

  // Activity clustering logic
  const clusteredActivities = useMemo(() => {
    if (!showClusters || !window.google?.maps) return { clusters: [], individual: validActivities };
    
    const clusters: ClusterGroup[] = [];
    const individual: ItineraryActivity[] = [];
    const processed = new Set<string>();
    
    const CLUSTER_DISTANCE_THRESHOLD = 100; // meters
    
    validActivities.forEach(activity => {
      if (processed.has(activity.itinerary_activity_id) || !activity.activity?.coordinates) {
        return;
      }
      
      const [lng, lat] = activity.activity.coordinates;
      const activityLatLng = new google.maps.LatLng(lat, lng);
      const nearbyActivities = [activity];
      processed.add(activity.itinerary_activity_id);
      
      validActivities.forEach(otherActivity => {
        if (
          processed.has(otherActivity.itinerary_activity_id) ||
          !otherActivity.activity?.coordinates ||
          otherActivity.itinerary_activity_id === activity.itinerary_activity_id
        ) {
          return;
        }
        
        const [otherLng, otherLat] = otherActivity.activity.coordinates;
        const otherLatLng = new google.maps.LatLng(otherLat, otherLng);
        const distance = google.maps.geometry.spherical.computeDistanceBetween(activityLatLng, otherLatLng);
        
        if (distance <= CLUSTER_DISTANCE_THRESHOLD) {
          nearbyActivities.push(otherActivity);
          processed.add(otherActivity.itinerary_activity_id);
        }
      });
      
      if (nearbyActivities.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        nearbyActivities.forEach(act => {
          if (act.activity?.coordinates) {
            const [lng, lat] = act.activity.coordinates;
            bounds.extend({ lat, lng });
          }
        });
        
        clusters.push({
          activities: nearbyActivities,
          center: bounds.getCenter().toJSON(),
          bounds,
        });
      } else {
        individual.push(activity);
      }
    });
    
    return { clusters, individual };
  }, [validActivities, showClusters]);

  // Calculate map bounds
  const mapBounds = useMemo(() => {
    if (validActivities.length === 0) return null;
    
    const bounds = new google.maps.LatLngBounds();
    validActivities.forEach(activity => {
      if (activity.activity?.coordinates) {
        const [lng, lat] = activity.activity.coordinates;
        bounds.extend({ lat, lng });
      }
    });
    
    return bounds;
  }, [validActivities]);


  // Calculate center from activities, then destination, then mapStore, then default
  const center = useMemo(() => {
    if (validActivities.length > 0) {
      const coords = validActivities[0].activity?.coordinates;
      if (coords && coords.length === 2) {
        // Coordinates are stored as [lng, lat] in our data
        const [lng, lat] = coords;
        return { lat, lng };
      }
    }
    
    // Fallback to destination coordinates (itineraryCoordinates) if available
    if (itineraryCoordinates && Array.isArray(itineraryCoordinates) && itineraryCoordinates.length === 2) {
      // itineraryCoordinates are stored as [lat, lng] from geocoding
      return { lat: itineraryCoordinates[0], lng: itineraryCoordinates[1] };
    }
    
    // Fallback to mapStore center coordinates if available
    if (centerCoordinates && Array.isArray(centerCoordinates) && centerCoordinates.length === 2) {
      return { lat: centerCoordinates[0], lng: centerCoordinates[1] };
    }
    
    // Default to London as last resort
    return { lat: 51.5074, lng: -0.1278 };
  }, [validActivities, itineraryCoordinates, centerCoordinates]);

  const handleCenterChanged = (e: MapCameraChangedEvent) => {
    if (e.detail?.center) {
      setCenterCoordinates([e.detail.center.lat, e.detail.center.lng]);
    }
  };

  const toggleDayVisibility = (date: string) => {
    setHiddenDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const visibleRoutes = dailyRoutes.filter(route => !hiddenDays.has(route.date));
  const visibleIndividualActivities = clusteredActivities.individual.filter(
    activity => activity.date && !hiddenDays.has(activity.date)
  );
  const visibleClusters = clusteredActivities.clusters.filter(cluster =>
    cluster.activities.some(activity => activity.date && !hiddenDays.has(activity.date))
  );

  // Check for required Google Maps configuration
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className={cn("relative w-full h-full flex items-center justify-center bg-bg-50", className)}>
        <div className="text-center p-6">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-ink-500" />
          <p className="text-ink-700 font-medium">Google Maps API key not configured</p>
          <p className="text-sm text-ink-500 mt-2">
            Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables
          </p>
        </div>
      </div>
    );
  }

  // Map ID is optional - will warn in console if missing but still work
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID) {
    console.warn('NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID not configured. Map will work but advanced features may be limited.');
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['geometry']}>
        <Map
          id="itinerary-map"
          mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined}
          defaultCenter={center}
          defaultZoom={initialZoom}
          gestureHandling="greedy"
          disableDefaultUI={true}
          onCenterChanged={handleCenterChanged}
          minZoom={8}
          maxZoom={18}
        >
          {/* Map Controller for auto-fitting and centering */}
          <ItineraryMapController 
            itineraryCoordinates={itineraryCoordinates}
            validActivities={validActivities}
            mapBounds={mapBounds}
          />
          
          {/* Individual Activity Markers */}
          {validActivities.map((activity) => {
            const dayIndex = Object.keys(dailyActivities).indexOf(activity.date!);
            return (
              <ItineraryActivityMarker
                key={activity.itinerary_activity_id}
                activity={activity}
                dayIndex={dayIndex}
                isSelected={activity.itinerary_activity_id === selectedActivityId}
                onClick={() => onActivitySelect?.(activity.itinerary_activity_id)}
                onEdit={() => onActivityEdit?.(activity.itinerary_activity_id)}
              />
            );
          })}

          {/* Cluster Markers */}
          {showClusters && visibleClusters.map((cluster, index) => {
            const dayIndex = cluster.activities[0]?.date ? Object.keys(dailyActivities).indexOf(cluster.activities[0].date) : 0;
            return (
              <ClusterMarker
                key={`cluster-${index}`}
                activities={cluster.activities}
                position={cluster.center}
                dayIndex={dayIndex}
                onClick={() => {
                  // Focus map on cluster - will be handled by map click events
                }}
              />
            );
          })}

          {/* Daily Routes - Temporarily disabled due to Polyline unavailability */}
          {/* {showRoutes && (
            <RouteVisualization
              routes={visibleRoutes}
              showTravelTimes={true}
              animated={false}
              onRouteClick={(segment) => {
                console.log('Route segment clicked:', segment);
              }}
            />
          )} */}

          {/* Location Suggestions */}
          {showSuggestions && (
            <LocationSuggestions
              existingActivities={validActivities}
              mapCenter={center}
              selectedDate={selectedDate}
              onAddSuggestion={onAddSuggestion}
            />
          )}
        </Map>
      </APIProvider>

      {/* Map Export */}
      {showExport && (
        <MapExport
          activities={validActivities}
          itineraryName={itineraryName}
          destinationName={destinationName}
        />
      )}

      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        {/* Route Toggle */}
        <Button
          variant={localShowRoutes ? "default" : "secondary"}
          size="sm"
          onClick={() => setLocalShowRoutes(!localShowRoutes)}
        >
          <RouteIcon className="h-4 w-4 mr-2" />
          Routes
        </Button>

        {/* Cluster Toggle */}
        <Button
          variant={showClusters ? "default" : "secondary"}
          size="sm"
          onClick={() => setShowClusters(!showClusters)}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Cluster
        </Button>
      </div>

      {/* Day Control Panel */}
      <div className="absolute top-4 right-4 z-10 glass rounded-xl p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4" />
          <span className="font-semibold text-sm">Days</span>
          <Badge variant="secondary" className="text-xs">
            {Object.keys(dailyActivities).length - hiddenDays.size}/{Object.keys(dailyActivities).length}
          </Badge>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {dailyRoutes.map((route) => (
            <div key={route.date} className="text-xs p-2 border border-stroke-200/60 rounded-lg bg-bg-0/70">
              Day {route.dayIndex + 1} - {route.date}
              <button 
                onClick={() => toggleDayVisibility(route.date)}
                className="ml-2 text-brand-600 hover:text-brand-700"
              >
                {!hiddenDays.has(route.date) ? 'Hide' : 'Show'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Stats */}
      <div className="absolute bottom-4 left-4 z-10 glass rounded-xl p-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-brand-500 rounded-full" />
            <span>{validActivities.length} activities</span>
          </div>
          {showClusters && visibleClusters.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-teal-500 rounded-full" />
              <span>{visibleClusters.length} clusters</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-coral-500 rounded-full" />
            <span>{visibleRoutes.reduce((sum, route) => sum + route.segments.length, 0)} routes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
