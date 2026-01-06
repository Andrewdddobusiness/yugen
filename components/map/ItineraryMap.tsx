"use client";

import React, { useMemo, useState, useEffect } from 'react';
import type { MapMouseEvent } from '@vis.gl/react-google-maps';
import { APIProvider, Map as GoogleMap, MapCameraChangedEvent, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { AnimatePresence, motion } from 'framer-motion';
import { Bike, Car, MapPin, PersonStanding, Train } from 'lucide-react';
import { cn } from '@/lib/utils';

import CustomMarker from './customMarker';
import GoogleMarkers from './googleMarkers';
import { ActivityOverlay } from './activityOverlay';
import { MapExport } from './MapExport';
import { Polyline } from './Polyline';
import { Switch } from '@/components/ui/switch';
import { TravelModeSelect } from '@/components/travel/TravelModeSelect';
import { useMapStore } from '@/store/mapStore';
import { useActivitiesStore } from '@/store/activityStore';
import { useSearchHistoryStore } from '@/store/searchHistoryStore';
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';
import SearchField from '@/components/search/SearchField';
import { getRadiusForZoom } from './zoomRadiusMap';
import { fetchPlaceDetails } from '@/actions/google/actions';
import { computeRoutePolyline } from '@/actions/google/routes';
import { calculateTravelTime, type TravelMode } from '@/actions/google/travelTime';
import { colors } from '@/lib/colors/colors';
import { decodeEncodedPolyline } from '@/lib/googleMaps/polyline';

// Map controller component that uses useMap hook
function ItineraryMapController({ 
  itineraryCoordinates, 
  validActivities, 
  mapBounds 
}: { 
  itineraryCoordinates: [number, number] | null;
  validActivities: any[];
  mapBounds: google.maps.LatLngBoundsLiteral | null;
}) {
  const map = useMap("itinerary-map");
  const lastAppliedKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!map) return;

    const key =
      mapBounds
        ? `bounds:${validActivities.length}:${mapBounds.north},${mapBounds.south},${mapBounds.east},${mapBounds.west}`
        : itineraryCoordinates && validActivities.length === 0
        ? `dest:${itineraryCoordinates[0]},${itineraryCoordinates[1]}`
        : null;

    // Prevent re-centering on every render (e.g. when centerCoordinates updates while panning).
    if (key && lastAppliedKeyRef.current === key) return;
    if (key) lastAppliedKeyRef.current = key;

    if (mapBounds) {
      const { north, south, east, west } = mapBounds;
      const isSinglePoint = north === south && east === west;

      if (isSinglePoint) {
        map.setCenter({ lat: north, lng: east });
        // Avoid "zooming into oblivion" when there's only one itinerary point.
        map.setZoom(14);
      } else {
        map.fitBounds(mapBounds, 50);
        // Clamp overly aggressive fitBounds zoom on tight clusters.
        const listener = map.addListener("idle", () => {
          const z = map.getZoom();
          if (typeof z === "number" && z > 16) {
            map.setZoom(16);
          }
          listener.remove();
        });
      }
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
  travel_mode_to_next?: TravelMode | null;
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

const DAY_OF_WEEK_PALETTE = [
  colors.Blue, // Sun
  colors.Purple, // Mon
  colors.Green, // Tue
  colors.Yellow, // Wed
  colors.Orange, // Thu
  colors.Red, // Fri
  colors.TangyOrange, // Sat
];

function getDayColorForDayKey(dayKey: string | null) {
  if (!dayKey) return colors.Blue;

  // Use local time so colors match the UI's local calendar.
  const date = new Date(`${dayKey}T00:00:00`);
  const dayIndex = Number.isFinite(date.getTime()) ? date.getDay() : 0;
  return DAY_OF_WEEK_PALETTE[dayIndex] ?? colors.Blue;
}

function parseTimeToMinutes(time: string | null | undefined) {
  if (!time) return null;
  const parts = time.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function sortActivitiesForWaypoints(activities: ItineraryActivity[]) {
  return [...activities].sort((a, b) => {
    const aStart = parseTimeToMinutes(a.start_time);
    const bStart = parseTimeToMinutes(b.start_time);

    if (aStart != null && bStart != null && aStart !== bStart) {
      return aStart - bStart;
    }
    if (aStart != null && bStart == null) return -1;
    if (aStart == null && bStart != null) return 1;

    const aName = a.activity?.name ?? "";
    const bName = b.activity?.name ?? "";
    const nameSort = aName.localeCompare(bName);
    if (nameSort !== 0) return nameSort;

    return String(a.itinerary_activity_id).localeCompare(String(b.itinerary_activity_id));
  });
}

function DayRoutePolylines({
  activities,
  strokeColor,
  onRouteStatusChange,
}: {
  activities: ItineraryActivity[];
  strokeColor: string;
  onRouteStatusChange?: (status: { source: "routes_api" | "fallback" | "none"; status?: string }) => void;
}) {
  const isDebugEnabled = React.useCallback((): boolean => {
    if (
      process.env.NEXT_PUBLIC_GOOGLE_ROUTES_DEBUG === "1" ||
      process.env.NEXT_PUBLIC_GOOGLE_ROUTES_DEBUG === "true"
    ) {
      return true;
    }
    try {
      return window.localStorage.getItem("debug:routes") === "1";
    } catch {
      return false;
    }
  }, []);

  const cacheRef = React.useRef<Map<string, google.maps.LatLngLiteral[]>>(
    new Map()
  );
  const lastEmittedStatusRef = React.useRef<string>("");
  const unmountedRef = React.useRef(false);
  const [pathsByKey, setPathsByKey] = React.useState<
    Record<string, google.maps.LatLngLiteral[] | null>
  >({});
  const [statusByKey, setStatusByKey] = React.useState<Record<string, string | null>>({});

  useEffect(() => {
    // Fast Refresh can re-run effect cleanups; ensure we don't get "stuck" in an unmounted state.
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (activities.length < 2) {
      if (onRouteStatusChange) {
        const key = "none:";
        if (lastEmittedStatusRef.current !== key) {
          lastEmittedStatusRef.current = key;
          onRouteStatusChange({ source: "none" });
        }
      }
      return;
    }

    const allowedKeys = new Set<string>();
    for (let i = 0; i < activities.length - 1; i += 1) {
      const from = activities[i];
      const to = activities[i + 1];
      const fromCoords = from.activity?.coordinates;
      const toCoords = to.activity?.coordinates;
      if (!fromCoords || !toCoords || fromCoords.length !== 2 || toCoords.length !== 2) {
        continue;
      }
      const [fromLng, fromLat] = fromCoords;
      const [toLng, toLat] = toCoords;
      if (
        typeof fromLat !== "number" ||
        typeof fromLng !== "number" ||
        typeof toLat !== "number" ||
        typeof toLng !== "number"
      ) {
        continue;
      }

      const mode = (from.travel_mode_to_next ?? "driving") as TravelMode;
      const key = `${from.itinerary_activity_id}->${to.itinerary_activity_id}:${mode}:${fromLat.toFixed(5)},${fromLng.toFixed(5)}|${toLat.toFixed(5)},${toLng.toFixed(5)}`;
      allowedKeys.add(key);
    }

    if (allowedKeys.size === 0) {
      if (onRouteStatusChange) {
        const key = "none:";
        if (lastEmittedStatusRef.current !== key) {
          lastEmittedStatusRef.current = key;
          onRouteStatusChange({ source: "none" });
        }
      }
      return;
    }

    setPathsByKey((prev) => {
      const prevKeys = Object.keys(prev);
      const hasExtraneousKey = prevKeys.some((key) => !allowedKeys.has(key));
      if (!hasExtraneousKey) return prev;
      const next: typeof prev = {};
      for (const key of prevKeys) {
        if (allowedKeys.has(key)) next[key] = prev[key];
      }
      return next;
    });

    setStatusByKey((prev) => {
      const prevKeys = Object.keys(prev);
      const hasExtraneousKey = prevKeys.some((key) => !allowedKeys.has(key));
      if (!hasExtraneousKey) return prev;
      const next: typeof prev = {};
      for (const key of prevKeys) {
        if (allowedKeys.has(key)) next[key] = prev[key];
      }
      return next;
    });
  }, [activities, onRouteStatusChange]);

  const segmentRequests = useMemo(() => {
    const segments: Array<{
      key: string;
      mode: TravelMode;
      points: Array<{ lat: number; lng: number }>;
      fallbackPath: google.maps.LatLngLiteral[];
    }> = [];

    if (activities.length < 2) return segments;

    for (let i = 0; i < activities.length - 1; i += 1) {
      const from = activities[i];
      const to = activities[i + 1];
      const fromCoords = from.activity?.coordinates;
      const toCoords = to.activity?.coordinates;
      if (!fromCoords || !toCoords || fromCoords.length !== 2 || toCoords.length !== 2) {
        continue;
      }

      const [fromLng, fromLat] = fromCoords;
      const [toLng, toLat] = toCoords;
      if (
        typeof fromLat !== "number" ||
        typeof fromLng !== "number" ||
        typeof toLat !== "number" ||
        typeof toLng !== "number"
      ) {
        continue;
      }

      const origin = { lat: fromLat, lng: fromLng };
      const destination = { lat: toLat, lng: toLng };
      const mode = (from.travel_mode_to_next ?? "driving") as TravelMode;
      const key = `${from.itinerary_activity_id}->${to.itinerary_activity_id}:${mode}:${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}|${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;

      segments.push({
        key,
        mode,
        points: [origin, destination],
        fallbackPath: [origin, destination],
      });
    }

    return segments;
  }, [activities]);

  useEffect(() => {
    if (segmentRequests.length === 0) return;

    const missing = segmentRequests.filter(
      (segment) => pathsByKey[segment.key] === undefined && statusByKey[segment.key] === undefined
    );
    if (missing.length === 0) return;

    setStatusByKey((prev) => {
      const next = { ...prev };
      for (const segment of missing) {
        next[segment.key] = "LOADING";
      }
      return next;
    });

    (async () => {
      const nextPaths: Record<string, google.maps.LatLngLiteral[] | null> = {};
      const nextStatuses: Record<string, string | null> = {};

      await Promise.all(
        missing.map(async (segment) => {
          const cached = cacheRef.current.get(segment.key);
          if (cached) {
            nextPaths[segment.key] = cached;
            nextStatuses[segment.key] = null;
            return;
          }

          try {
            if (isDebugEnabled()) {
              console.debug("[map] routes api segment request", {
                key: segment.key,
                mode: segment.mode,
                origin: segment.points[0],
                destination: segment.points[segment.points.length - 1],
              });
            }

            const result = await computeRoutePolyline(segment.points, segment.mode);
            if (!result.success || !result.data) {
              nextPaths[segment.key] = null;
              nextStatuses[segment.key] = result.error?.code || "ROUTES_API_ERROR";
              return;
            }

            const decoded = decodeEncodedPolyline(result.data.encodedPolyline);
            if (decoded.length < 2) {
              nextPaths[segment.key] = null;
              nextStatuses[segment.key] = "EMPTY_ROUTE";
              return;
            }

            cacheRef.current.set(segment.key, decoded);
            nextPaths[segment.key] = decoded;
            nextStatuses[segment.key] = null;
          } catch (error) {
            console.warn("[map] routes api segment request failed:", error);
            nextPaths[segment.key] = null;
            nextStatuses[segment.key] = "ROUTES_API_ERROR";
          }
        })
      );

      if (unmountedRef.current) return;

      setPathsByKey((prev) => ({ ...prev, ...nextPaths }));
      setStatusByKey((prev) => ({ ...prev, ...nextStatuses }));
    })();
  }, [isDebugEnabled, pathsByKey, segmentRequests, statusByKey]);

  useEffect(() => {
    if (!onRouteStatusChange) return;

    if (segmentRequests.length === 0) {
      const key = "none:";
      if (lastEmittedStatusRef.current !== key) {
        lastEmittedStatusRef.current = key;
        onRouteStatusChange({ source: "none" });
      }
      return;
    }

    const keys = segmentRequests.map((segment) => segment.key);
    const hasAnyRoadRoute = keys.some((key) => {
      const path = pathsByKey[key];
      return Array.isArray(path) && path.length >= 2;
    });

    const isLoading = keys.some((key) => statusByKey[key] === "LOADING");
    const errorCodes = keys
      .map((key) => statusByKey[key])
      .filter((status): status is string => !!status && status !== "LOADING");
    const uniqueErrors = Array.from(new Set(errorCodes));

    const allRoadRoute = hasAnyRoadRoute && keys.every((key) => {
      const path = pathsByKey[key];
      return Array.isArray(path) && path.length >= 2;
    });

    let status: string | undefined;
    if (isLoading) {
      status = "LOADING";
    } else if (allRoadRoute) {
      status = undefined;
    } else if (hasAnyRoadRoute) {
      status = uniqueErrors.length === 1 ? uniqueErrors[0] : "PARTIAL";
    } else {
      status = uniqueErrors.length === 1 ? uniqueErrors[0] : undefined;
    }

    const next = hasAnyRoadRoute
      ? { source: "routes_api" as const, status }
      : { source: "fallback" as const, status };

    const emittedKey = `${next.source}:${next.status ?? ""}`;
    if (lastEmittedStatusRef.current === emittedKey) return;
    lastEmittedStatusRef.current = emittedKey;
    onRouteStatusChange(next);
  }, [onRouteStatusChange, pathsByKey, segmentRequests, statusByKey]);

  if (segmentRequests.length === 0) return null;

  return (
    <>
      {segmentRequests.map((segment) => {
        const path = pathsByKey[segment.key] ?? null;
        const effectivePath = path && path.length >= 2 ? path : segment.fallbackPath;

        const isFallback = !path || path.length < 2;
        const fallbackIcons: google.maps.IconSequence[] | undefined = isFallback
          ? [
              {
                icon: {
                  path: "M 0,-1 0,1",
                  strokeOpacity: 0.7,
                  scale: 4,
                  strokeColor,
                },
                offset: "0",
                repeat: "12px",
              },
            ]
          : undefined;

        return (
          <Polyline
            key={segment.key}
            path={effectivePath}
            strokeColor={strokeColor}
            strokeOpacity={isFallback ? 0 : 0.45}
            strokeWeight={3}
            icons={fallbackIcons}
            geodesic={false}
            clickable={false}
          />
        );
      })}
    </>
  );
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
  visibleDays,
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
  const { optimisticUpdateItineraryActivity } = useItineraryActivityStore();
  const [isPlaceDetailsLoading, setIsPlaceDetailsLoading] = useState(false);
  const [showTravelTimes, setShowTravelTimes] = useState(false);
  const [isUpdatingRouteMode, setIsUpdatingRouteMode] = useState(false);
  const [showSegmentModes, setShowSegmentModes] = useState(false);
  const [savingSegmentModeFor, setSavingSegmentModeFor] = useState<string | null>(null);
  const [routeLineStatus, setRouteLineStatus] = useState<{
    source: "routes_api" | "fallback" | "none";
    status?: string;
  } | null>(null);
  const [travelTimesLoading, setTravelTimesLoading] = useState(false);
  const [travelTimesBySegment, setTravelTimesBySegment] = useState<
    Record<
      string,
      | {
          durationText: string;
          mode: TravelMode;
          distanceText?: string;
        }
      | null
    >
  >({});

  const showExploreMarkers = selectedSearchQuery.trim().length > 0;

  const itineraryPlaceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const activity of activities) {
      const placeId = activity.activity?.place_id;
      if (placeId) ids.add(placeId);
    }
    return Array.from(ids);
  }, [activities]);

  const normalizedSelectedDate = useMemo(
    () => (selectedDate ? selectedDate.slice(0, 10) : null),
    [selectedDate]
  );

  const activeDayColor = useMemo(
    () => getDayColorForDayKey(normalizedSelectedDate),
    [normalizedSelectedDate]
  );

  const visibleDaySet = useMemo(() => {
    if (visibleDays === undefined) return null;
    return new Set((visibleDays ?? []).map((day) => day.slice(0, 10)));
  }, [visibleDays]);

  // Filter activities with coordinates
  const validActivities = useMemo(() => {
    return activities.filter((activity) => {
      const coords = activity.activity?.coordinates;
      const hasCoords = coords && Array.isArray(coords) && coords.length === 2;
      const activityDay = activity.date ? activity.date.slice(0, 10) : null;
      const isVisible = visibleDaySet
        ? activityDay != null && visibleDaySet.has(activityDay)
        : normalizedSelectedDate
          ? activityDay === normalizedSelectedDate
          : true;
      return hasCoords && isVisible;
    });
  }, [activities, normalizedSelectedDate, visibleDaySet]);

  const markerItems = useMemo(() => {
    type MarkerItem = {
      activity: ItineraryActivity;
      dayKey: string;
      waypointNumber: number;
      color: string;
    };

    const groups = new Map<string, ItineraryActivity[]>();
    for (const activity of validActivities) {
      const dayKey = activity.date ? activity.date.slice(0, 10) : null;
      if (!dayKey) continue;
      const list = groups.get(dayKey);
      if (list) list.push(activity);
      else groups.set(dayKey, [activity]);
    }

    const items: MarkerItem[] = [];
    const dayKeys = Array.from(groups.keys()).sort();
    for (const dayKey of dayKeys) {
      const sorted = sortActivitiesForWaypoints(groups.get(dayKey) ?? []);
      const color = getDayColorForDayKey(dayKey);
      for (let index = 0; index < sorted.length; index += 1) {
        items.push({
          activity: sorted[index],
          dayKey,
          waypointNumber: index + 1,
          color,
        });
      }
    }

    return items;
  }, [validActivities]);

  const orderedActivitiesForSelectedDay = useMemo(() => {
    if (!normalizedSelectedDate) return [];
    const selected = validActivities.filter(
      (activity) => (activity.date ? activity.date.slice(0, 10) : null) === normalizedSelectedDate
    );
    return sortActivitiesForWaypoints(selected);
  }, [normalizedSelectedDate, validActivities]);

  const routeActivities = useMemo(() => {
    if (!showRoutes) return [];
    if (!normalizedSelectedDate) return [];
    if (orderedActivitiesForSelectedDay.length < 2) return [];
    return orderedActivitiesForSelectedDay;
  }, [normalizedSelectedDate, orderedActivitiesForSelectedDay, showRoutes]);

  const dayRouteModeState = useMemo(() => {
    if (routeActivities.length < 2) {
      return { mode: null as TravelMode | null, isMixed: false };
    }

    const fromActivities = routeActivities.slice(0, -1);
    const modes = new Set<TravelMode>();
    for (const activity of fromActivities) {
      modes.add((activity.travel_mode_to_next ?? "driving") as TravelMode);
    }

    if (modes.size === 1) {
      return { mode: Array.from(modes)[0] ?? null, isMixed: false };
    }

    return { mode: null as TravelMode | null, isMixed: true };
  }, [routeActivities]);

  const routePolylineMode: TravelMode = dayRouteModeState.mode ?? "driving";

  const routePolylineModeLabel = useMemo(() => {
    switch (routePolylineMode) {
      case "walking":
        return "Walk";
      case "transit":
        return "Transit";
      case "bicycling":
        return "Bike";
      case "driving":
      default:
        return "Drive";
    }
  }, [routePolylineMode]);

  const applyRouteModeToDay = React.useCallback(
    async (mode: TravelMode) => {
      if (!normalizedSelectedDate) return;
      if (routeActivities.length < 2) return;

      setIsUpdatingRouteMode(true);
      try {
        const fromActivities = routeActivities.slice(0, -1);
        const results = await Promise.all(
          fromActivities.map((activity) =>
            optimisticUpdateItineraryActivity(String(activity.itinerary_activity_id), {
              travel_mode_to_next: mode,
            })
          )
        );

        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
          console.error("Failed to update some segment modes:", failed.map((r) => r.error));
        }
      } finally {
        setIsUpdatingRouteMode(false);
      }
    },
    [normalizedSelectedDate, optimisticUpdateItineraryActivity, routeActivities]
  );

  const routeSegmentModes = useMemo(() => {
    if (routeActivities.length < 2) return [];

    return routeActivities.slice(0, -1).map((from, index) => {
      const to = routeActivities[index + 1];
      return {
        fromId: String(from.itinerary_activity_id),
        fromName: from.activity?.name ?? "From",
        toName: to.activity?.name ?? "To",
        mode: (from.travel_mode_to_next ?? "driving") as TravelMode,
      };
    });
  }, [routeActivities]);

  const setSegmentMode = React.useCallback(
    async (fromId: string, mode: TravelMode) => {
      setSavingSegmentModeFor(fromId);
      try {
        const result = await optimisticUpdateItineraryActivity(fromId, {
          travel_mode_to_next: mode,
        });
        if (!result.success) {
          console.error("Failed to update segment mode:", result.error);
        }
      } finally {
        setSavingSegmentModeFor(null);
      }
    },
    [optimisticUpdateItineraryActivity]
  );

  const routeStatusLabel = useMemo(() => {
    if (!showRoutes || !normalizedSelectedDate || routeActivities.length < 2) return null;
    const status = routeLineStatus?.status;
    if (status === "LOADING") return "Loading road route…";

    if (routeLineStatus?.source === "routes_api") {
      const modeLabel = dayRouteModeState.isMixed ? "Mixed modes" : routePolylineModeLabel;
      if (status) {
        return `Road route (${modeLabel}, partial)`;
      }
      return `Road route (${modeLabel})`;
    }

    if (!status) return "Straight line (routes unavailable)";
    if (status === "ROUTES_API_DISABLED") return "Straight line (Routes API disabled)";
    if (status === "API_KEY_NOT_CONFIGURED") return "Straight line (Routes API key missing)";
    if (status === "ZERO_RESULTS") return "Straight line (no route found)";
    if (status === "NO_ROUTE") return "Straight line (no route found)";
    if (status === "RATE_LIMITED") return "Straight line (rate limited)";
    return `Straight line (${status})`;
  }, [
    dayRouteModeState.isMixed,
    normalizedSelectedDate,
    routeActivities.length,
    routeLineStatus?.source,
    routeLineStatus?.status,
    routePolylineModeLabel,
    showRoutes,
  ]);

  const travelSegments = useMemo(() => {
    if (!showRoutes) return [];
    if (!showTravelTimes) return [];
    if (routeActivities.length < 2) return [];

    const segments: Array<{
      key: string;
      preferredMode: TravelMode;
      origin: { lat: number; lng: number };
      destination: { lat: number; lng: number };
      midpoint: { lat: number; lng: number };
    }> = [];

    for (let i = 0; i < routeActivities.length - 1; i += 1) {
      const from = routeActivities[i];
      const to = routeActivities[i + 1];
      const fromCoords = from.activity?.coordinates;
      const toCoords = to.activity?.coordinates;
      if (!fromCoords || !toCoords || fromCoords.length !== 2 || toCoords.length !== 2) {
        continue;
      }

      const [fromLng, fromLat] = fromCoords;
      const [toLng, toLat] = toCoords;
      if (
        typeof fromLat !== "number" ||
        typeof fromLng !== "number" ||
        typeof toLat !== "number" ||
        typeof toLng !== "number"
      ) {
        continue;
      }

      const origin = { lat: fromLat, lng: fromLng };
      const destination = { lat: toLat, lng: toLng };
      const midpoint = { lat: (fromLat + toLat) / 2, lng: (fromLng + toLng) / 2 };
      const preferredMode = (from.travel_mode_to_next ?? "driving") as TravelMode;

      segments.push({
        key: `${from.itinerary_activity_id}->${to.itinerary_activity_id}:${preferredMode}`,
        preferredMode,
        origin,
        destination,
        midpoint,
      });
    }

    return segments;
  }, [routeActivities, showRoutes, showTravelTimes]);

  useEffect(() => {
    if (travelSegments.length === 0) return;

    const allowedKeys = new Set(travelSegments.map((segment) => segment.key));

    setTravelTimesBySegment((prev) => {
      const prevKeys = Object.keys(prev);
      const hasExtraneousKey = prevKeys.some((key) => !allowedKeys.has(key));
      if (!hasExtraneousKey) return prev;

      const next: typeof prev = {};
      for (const key of prevKeys) {
        if (allowedKeys.has(key)) next[key] = prev[key];
      }
      return next;
    });
  }, [travelSegments]);

  useEffect(() => {
    if (!showRoutes) return;
    if (!showTravelTimes) return;
    if (travelSegments.length === 0) return;

    const missingSegments = travelSegments.filter(
      (segment) => !(segment.key in travelTimesBySegment)
    );
    if (missingSegments.length === 0) return;

    const debugEnabled =
      process.env.NEXT_PUBLIC_GOOGLE_ROUTES_DEBUG === "1" ||
      process.env.NEXT_PUBLIC_GOOGLE_ROUTES_DEBUG === "true";
    if (debugEnabled) {
      console.debug("[map] travel time fetch start", {
        segments: missingSegments.map((s) => s.key),
      });
    }

    let cancelled = false;
    setTravelTimesLoading(true);

    const pickBest = (results: Record<string, any>) => {
      const candidates = Object.values(results ?? {})
        .filter(Boolean)
        .filter((entry: any) => entry.status === "OK" && entry.duration?.value != null)
        .sort((a: any, b: any) => a.duration.value - b.duration.value);
      return candidates[0] ?? null;
    };

    (async () => {
      const next: typeof travelTimesBySegment = {};

      await Promise.all(
        missingSegments.map(async (segment) => {
          try {
            const baseModes: TravelMode[] = ["walking", "driving", "transit"];
            const requestedModes = Array.from(
              new Set<TravelMode>([...baseModes, segment.preferredMode])
            );

            const result = await calculateTravelTime(
              segment.origin,
              segment.destination,
              requestedModes
            );

            if (!result.success || !result.data) {
              if (debugEnabled) {
                console.debug("[map] travel time failed", {
                  segment: segment.key,
                  message: result.error?.message,
                  code: result.error?.code,
                });
              }
              next[segment.key] = null;
              return;
            }

            const chosen = (result.data.results as any)?.[segment.preferredMode] ?? pickBest(result.data.results as any);

            if (!chosen) {
              next[segment.key] = null;
              return;
            }

            next[segment.key] = {
              durationText: chosen.duration?.text ?? "",
              mode: chosen.mode as TravelMode,
              distanceText: chosen.distance?.text ?? undefined,
            };
            if (debugEnabled) {
              console.debug("[map] travel time ok", {
                segment: segment.key,
                bestMode: chosen.mode,
                duration: chosen.duration?.text,
                distance: chosen.distance?.text,
              });
            }
          } catch (error) {
            console.error("Failed to calculate travel time:", error);
            next[segment.key] = null;
          }
        })
      );

      if (cancelled) return;

      setTravelTimesBySegment((prev) => ({
        ...prev,
        ...next,
      }));
      setTravelTimesLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [showRoutes, showTravelTimes, travelSegments, travelTimesBySegment]);

  const getTravelIcon = (mode: TravelMode) => {
    switch (mode) {
      case "walking":
        return <PersonStanding className="h-3 w-3" />;
      case "bicycling":
        return <Bike className="h-3 w-3" />;
      case "transit":
        return <Train className="h-3 w-3" />;
      case "driving":
      default:
        return <Car className="h-3 w-3" />;
    }
  };

  // Calculate map bounds
  const mapBounds = useMemo(() => {
    if (validActivities.length === 0) return null;

    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;

    let found = false;
    for (const activity of validActivities) {
      const coords = activity.activity?.coordinates;
      if (!coords || !Array.isArray(coords) || coords.length !== 2) continue;
      const [lng, lat] = coords;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      found = true;

      north = Math.max(north, lat);
      south = Math.min(south, lat);
      east = Math.max(east, lng);
      west = Math.min(west, lng);
    }

    if (!found) return null;
    return { north, south, east, west };
  }, [validActivities]);

  const markerPositionByItineraryActivityId = useMemo(() => {
    const groups = new Map<string, Array<{ id: string; lat: number; lng: number; start: string | null }>>();

    for (const activity of validActivities) {
      const coords = activity.activity?.coordinates;
      if (!coords || coords.length !== 2) continue;
      const [lng, lat] = coords;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;

      const bucket = groups.get(key);
      const entry = {
        id: String(activity.itinerary_activity_id),
        lat,
        lng,
        start: activity.start_time ?? null,
      };
      if (bucket) bucket.push(entry);
      else groups.set(key, [entry]);
    }

    const byId = new Map<string, { lat: number; lng: number }>();

    for (const bucket of groups.values()) {
      if (bucket.length === 1) {
        const only = bucket[0];
        byId.set(only.id, { lat: only.lat, lng: only.lng });
        continue;
      }

      // If multiple activities share identical coordinates, fan them out slightly
      // so users can see each waypoint.
      bucket.sort((a, b) => {
        const aStart = a.start ?? "";
        const bStart = b.start ?? "";
        const timeSort = aStart.localeCompare(bStart);
        if (timeSort !== 0) return timeSort;
        return a.id.localeCompare(b.id);
      });

      const pointsPerRing = 8;
      const baseRadius = 0.00006; // ~6-7m
      const ringStep = 0.00004;

      bucket.forEach((entry, idx) => {
        const ring = Math.floor(idx / pointsPerRing);
        const slot = idx % pointsPerRing;
        const angle = (slot / pointsPerRing) * Math.PI * 2;
        const radius = baseRadius + ring * ringStep;
        const lat = entry.lat + Math.cos(angle) * radius;
        const lng = entry.lng + Math.sin(angle) * radius;
        byId.set(entry.id, { lat, lng });
      });
    }

    return byId;
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
        <GoogleMap
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

          {/* Route (road-following) between the selected day's activities */}
          {showRoutes && normalizedSelectedDate && routeActivities.length >= 2 ? (
            <DayRoutePolylines
              activities={routeActivities}
              strokeColor={activeDayColor}
              onRouteStatusChange={setRouteLineStatus}
            />
          ) : null}

          {/* Travel time markers between consecutive activities */}
          {showRoutes && showTravelTimes
            ? travelSegments.map((segment) => {
                const info = travelTimesBySegment[segment.key];
                if (!info) return null;
                return (
                  <AdvancedMarker
                    key={segment.key}
                    position={segment.midpoint}
                    className="pointer-events-none"
                  >
                    <div className="flex items-center gap-1 rounded-full border border-stroke-200 bg-bg-0/90 px-2 py-1 text-[11px] font-medium text-ink-900 shadow-card backdrop-blur-sm">
                      {getTravelIcon(info.mode)}
                      <span>{info.durationText}</span>
                    </div>
                  </AdvancedMarker>
                );
              })
            : null}
          
          {/* Itinerary Waypoints */}
          {markerItems.map(({ activity, waypointNumber, color }) => {
            const coords = markerPositionByItineraryActivityId.get(
              String(activity.itinerary_activity_id)
            );
            if (!coords) return null;
            const { lat, lng } = coords;
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
                  number={waypointNumber}
                  color={color}
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

        </GoogleMap>
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
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: activeDayColor }}
              />
              <span>{validActivities.length} activities</span>
            </div>
            {normalizedSelectedDate ? (
              <span className="text-xs text-ink-500">{normalizedSelectedDate}</span>
            ) : null}
          </div>

          {showRoutes && normalizedSelectedDate && routeActivities.length >= 2 ? (
            <>
              {routeStatusLabel ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-ink-600">Route</div>
                  <div className="text-[11px] text-ink-500">{routeStatusLabel}</div>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-ink-600">Mode</div>
                <div className="flex items-center gap-2">
                  {isUpdatingRouteMode ? (
                    <div className="text-[11px] text-ink-500">Saving…</div>
                  ) : null}
                  <TravelModeSelect
                    value={dayRouteModeState.mode ?? undefined}
                    onValueChange={applyRouteModeToDay}
                    placeholder={dayRouteModeState.isMixed ? "Mixed" : "Mode"}
                    disabled={isUpdatingRouteMode}
                    className="w-[110px] bg-bg-0/80"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-ink-600">Segments</div>
                <button
                  type="button"
                  onClick={() => setShowSegmentModes((prev) => !prev)}
                  className="text-[11px] text-ink-500 hover:text-ink-700"
                >
                  {showSegmentModes ? "Hide" : "Edit"}
                </button>
              </div>

              {showSegmentModes ? (
                <div className="max-h-40 overflow-auto rounded-md border border-stroke-200 bg-bg-0/60 p-2 space-y-2">
                  {routeSegmentModes.map((segment) => (
                    <div key={segment.fromId} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 pr-2">
                        <div className="truncate text-[11px] text-ink-700">
                          {segment.fromName} → {segment.toName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {savingSegmentModeFor === segment.fromId ? (
                          <div className="text-[11px] text-ink-500">Saving…</div>
                        ) : null}
                        <TravelModeSelect
                          value={segment.mode}
                          onValueChange={(mode) => setSegmentMode(segment.fromId, mode)}
                          disabled={savingSegmentModeFor === segment.fromId}
                          className="w-[110px] bg-bg-0/80"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-ink-600">Travel times</div>
                <div className="flex items-center gap-2">
                  {travelTimesLoading && showTravelTimes ? (
                    <div className="text-[11px] text-ink-500">Calculating…</div>
                  ) : null}
                  <Switch checked={showTravelTimes} onCheckedChange={setShowTravelTimes} />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
