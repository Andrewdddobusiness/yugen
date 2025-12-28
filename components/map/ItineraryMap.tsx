"use client";

import React, { useMemo, useState, useEffect } from 'react';
import type { MapMouseEvent } from '@vis.gl/react-google-maps';
import { APIProvider, Map, MapCameraChangedEvent, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

import CustomMarker from './CustomMarker';
import GoogleMarkers from './GoogleMarkers';
import { ActivityOverlay } from './ActivityOverlay';
import { MapExport } from './MapExport';
import { useMapStore } from '@/store/mapStore';
import { useActivitiesStore } from '@/store/activityStore';
import { useSearchHistoryStore } from '@/store/searchHistoryStore';
import SearchField from '@/components/search/SearchField';
import { getRadiusForZoom } from './zoomRadiusMap';
import { fetchPlaceDetails } from '@/actions/google/actions';
import { colors } from '@/lib/colors/colors';

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
  showSuggestions = false,
  showExport = false,
  selectedDate,
  itineraryName,
  destinationName,
  onActivitySelect,
  onActivityEdit,
  onAddSuggestion,
  className,
}: ItineraryMapProps) {
  const { centerCoordinates, itineraryCoordinates, initialZoom, setCenterCoordinates, setRadius } = useMapStore();
  const { selectedActivity, setSelectedActivity } = useActivitiesStore();
  const { selectedSearchQuery } = useSearchHistoryStore();
  const [isPlaceDetailsLoading, setIsPlaceDetailsLoading] = useState(false);

  const showExploreMarkers = selectedSearchQuery.trim().length > 0;

  const itineraryPlaceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const activity of activities) {
      const placeId = activity.activity?.place_id;
      if (placeId) ids.add(placeId);
    }
    return Array.from(ids);
  }, [activities]);

  // Filter activities with coordinates
  const validActivities = useMemo(() => {
    return activities.filter((activity) => {
      const coords = activity.activity?.coordinates;
      const hasCoords = coords && Array.isArray(coords) && coords.length === 2;
      const isVisible = visibleDays.length === 0 || !activity.date || visibleDays.includes(activity.date);
      return hasCoords && isVisible;
    });
  }, [activities, visibleDays]);

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

  const selectedIdFromStore = useMemo(() => {
    const placeId = selectedActivity?.place_id;
    if (!placeId) return undefined;
    return validActivities.find((activity) => activity.activity?.place_id === placeId)
      ?.itinerary_activity_id;
  }, [selectedActivity?.place_id, validActivities]);

  const effectiveSelectedActivityId = selectedActivityId ?? selectedIdFromStore;


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

  const handleZoomChanged = (e: MapCameraChangedEvent) => {
    if (!e.detail) return;
    const radius = getRadiusForZoom(e.detail.zoom);
    requestAnimationFrame(() => {
      setRadius(radius);
    });
  };

  const handleMapClick = async (event: MapMouseEvent) => {
    const rawPlaceId = event.detail?.placeId;
    if (!rawPlaceId) return;

    // Prevent the default Google Maps place-info window.
    if (event.stoppable) {
      event.stop();
    }

    const placeId = rawPlaceId.startsWith('places/')
      ? rawPlaceId.slice('places/'.length)
      : rawPlaceId;

    setIsPlaceDetailsLoading(true);
    try {
      const details = await fetchPlaceDetails(placeId);
      setSelectedActivity(details);
    } catch (error) {
      console.error('Failed to fetch place details:', error);
    } finally {
      setIsPlaceDetailsLoading(false);
    }
  };

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
          onZoomChanged={handleZoomChanged}
          onClick={handleMapClick}
          clickableIcons={true}
          minZoom={8}
          maxZoom={18}
        >
          {/* Map Controller for auto-fitting and centering */}
          <ItineraryMapController 
            itineraryCoordinates={itineraryCoordinates}
            validActivities={validActivities}
            mapBounds={mapBounds}
          />
          
          {/* Itinerary Waypoints (blue) */}
          {validActivities.map((activity, index) => {
            const coords = activity.activity?.coordinates;
            if (!coords || !Array.isArray(coords) || coords.length !== 2) return null;

            const [lng, lat] = coords;
            const isSelected = activity.itinerary_activity_id === effectiveSelectedActivityId;

            return (
              <AdvancedMarker
                key={activity.itinerary_activity_id}
                position={{ lat, lng }}
                onClick={() => {
                  if (activity.activity?.place_id) {
                    setSelectedActivity(activity.activity as any);
                  }
                  onActivitySelect?.(activity.itinerary_activity_id);
                }}
                className="cursor-pointer"
              >
                <CustomMarker
                  number={index + 1}
                  color={colors.Blue}
                  size={isSelected ? "lg" : "md"}
                  isSelected={isSelected}
                />
              </AdvancedMarker>
            );
          })}

          {/* Explore/Search Result Markers */}
          {showExploreMarkers && <GoogleMarkers mapId="itinerary-map" excludePlaceIds={itineraryPlaceIds} />}

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

        </Map>
      </APIProvider>

      {/* Search Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[420px] max-w-[calc(100%-2rem)]">
        <SearchField />
        {isPlaceDetailsLoading && (
          <div className="mt-2 text-xs text-ink-500 bg-bg-0/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-card">
            Loading place details…
          </div>
        )}
      </div>

      {/* Activity Bottom Sheet */}
      <AnimatePresence>
        {selectedActivity && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            <ActivityOverlay onClose={() => setSelectedActivity(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Export */}
      {showExport && (
        <MapExport
          activities={validActivities}
          itineraryName={itineraryName}
          destinationName={destinationName}
        />
      )}

      {/* Activity Stats */}
      <div className="absolute bottom-4 left-4 z-10 glass rounded-xl p-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-brand-500 rounded-full" />
            <span>{validActivities.length} activities</span>
          </div>
        </div>
      </div>
    </div>
  );
}
