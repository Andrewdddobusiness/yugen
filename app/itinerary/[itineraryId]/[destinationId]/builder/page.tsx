"use client";
import React, { useEffect, useMemo, useState, useRef, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useItineraryActivityStore, type IItineraryActivity } from "@/store/itineraryActivityStore";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { useMapStore } from "@/store/mapStore";
import Loading from "@/components/loading/Loading";
import { useParams } from "next/navigation";
const GoogleCalendarView = lazy(() =>
  import("@/components/view/calendar/GoogleCalendarView").then((module) => ({ default: module.GoogleCalendarView }))
);
const ItineraryTableView = lazy(() =>
  import("@/components/table/ItineraryTable").then((module) => ({ default: module.ItineraryTableView }))
);
const ItineraryListView = lazy(() =>
  import("@/components/list/containers/ItineraryListView").then((module) => ({ default: module.ItineraryListView }))
);
import { Button } from "@/components/ui/button";
import { Map as MapIcon, X } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ViewToggle } from "@/components/view/toggle/ViewToggle";
import { ViewTransition, ViewLoadingState } from "@/components/view/toggle/ViewTransition";
import { useViewRouter } from "@/hooks/useViewRouter";
import { useViewStatePreservation } from "@/hooks/useViewStatePreservation";
import { getDestination } from "@/actions/supabase/destinations";
import { geocodeAddress } from "@/actions/google/maps";

class MapLoadErrorBoundary extends React.Component<
  {
    onRetry: () => void;
    children: React.ReactNode;
  },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Itinerary map failed to load:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error.message || String(this.state.error);
    const isChunkLoadError = /ChunkLoadError|Loading chunk/i.test(message);

    return (
      <div className="h-full flex items-center justify-center bg-bg-50 dark:bg-ink-900 p-6">
        <div className="max-w-sm text-center space-y-3">
          <div className="text-sm font-medium text-ink-900 dark:text-ink-100">Map failed to load</div>
          <div className="text-xs text-muted-foreground">
            {isChunkLoadError
              ? "This can happen after a hot-reload or when the dev server restarts. Try retrying, or reload the page."
              : "Please retry, or reload the page."}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                this.setState({ error: null });
                this.props.onRetry();
              }}
            >
              Retry
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default function Builder() {
  const { itineraryId, destinationId } = useParams();
  const itinId = itineraryId?.toString();
  const destId = destinationId?.toString();

  const { itineraryActivities, fetchItineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const { 
    currentView, 
    showMap, 
    isTransitioningView,
    updateContextData,
    setCurrentView, 
    toggleMap 
  } = useItineraryLayoutStore();
  const { setItineraryCoordinates } = useMapStore();
  
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [mapImportAttempt, setMapImportAttempt] = useState(0);
  const listRef = useRef<any>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const ItineraryMap = useMemo(
    () => {
      // Intentionally re-create the lazy component on retry attempts.
      void mapImportAttempt;
      return lazy(() =>
        import("@/components/map/ItineraryMap").then((module) => ({ default: module.ItineraryMap }))
      );
    },
    [mapImportAttempt]
  );
  
  const { changeView, currentDate, navigateToDate } = useViewRouter({
    enableUrlSync: true,
    defaultView: 'table',
    onDateChange: (date) => {
      setTargetDate(date);
      
      // Scroll to the specific date in the current view (currently only supported in list view)
      if (date && currentView === 'list') {
        setTimeout(() => {
          if (listRef.current?.scrollToDate) {
            listRef.current.scrollToDate(date);
          }
        }, 100);
      }
    }
  });
  
  const [isMobile, setIsMobile] = useState(false);

  // View state preservation
  const { saveScrollPosition, restoreScrollPosition } = useViewStatePreservation({
    onViewEnter: (view) => {
      // Restore scroll position for the entering view
      setTimeout(() => {
        const element = view === 'list' ? listRef.current?.containerRef?.current :
                      view === 'calendar' ? calendarRef.current :
                      view === 'table' ? tableRef.current : null;
        
        if (element) {
          restoreScrollPosition(element, view, 200);
        }
      }, 300); // Wait for view transition to complete
    },
    onViewExit: (view) => {
      // Save scroll position for the exiting view
      const element = view === 'list' ? listRef.current?.containerRef?.current :
                    view === 'calendar' ? calendarRef.current :
                    view === 'table' ? tableRef.current : null;
      
      if (element) {
        saveScrollPosition(element, view);
      }
    },
  });

  // Fetch itinerary activities
  const { isLoading, error, data } = useQuery({
    queryKey: ["itineraryActivities", itineraryId, destinationId],
    queryFn: () => fetchItineraryActivities(itinId, destId),
    enabled: !!itineraryId && !!destinationId,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch destination data for map centering
  const { data: destinationData } = useQuery({
    queryKey: ["destination", destinationId],
    queryFn: async () => {
      const result = await getDestination(destId);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    },
    enabled: !!destinationId,
  });

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Separate effects to reduce unnecessary re-runs
  useEffect(() => {
    if (!data) return;
    if (!destId) return;

    const current = useItineraryActivityStore.getState().itineraryActivities;

    // Only hydrate from react-query when the store is empty OR when the store
    // is for a different destination. This avoids view/date URL navigations
    // re-applying stale cached query data over optimistic store updates.
    const hasDifferentDestination = current.some(
      (activity) =>
        !!activity.itinerary_destination_id &&
        String(activity.itinerary_destination_id) !== destId
    );

    if (current.length === 0 || hasDifferentDestination) {
      setItineraryActivities(data);
      return;
    }

    // Otherwise, merge in any missing rows from the query result, but never
    // overwrite in-memory versions of existing activities.
    const byId = new Map<string, IItineraryActivity>();
    for (const activity of current) {
      byId.set(String(activity.itinerary_activity_id), activity);
    }

    let changed = false;
    for (const activity of data) {
      const id = String(activity.itinerary_activity_id);
      if (!byId.has(id)) {
        byId.set(id, activity);
        changed = true;
      }
    }

    if (changed) {
      setItineraryActivities(Array.from(byId.values()));
    }
  }, [data, destId, setItineraryActivities]);

  // Context data update in separate effect with memoized calculation
  useEffect(() => {
    const active = itineraryActivities.filter((a) => a.deleted_at === null);
    if (active.length) {
      const scheduledActivities = active.filter((a) => a.start_time && a.end_time);
      const validDates = active
        .map((a) => a.date)
        .filter(
          (date): date is string =>
            !!date && !isNaN(new Date(date).getTime())
        );
      const timeSpan = validDates.length > 0 ? 
        Math.ceil((Math.max(...validDates.map(date => new Date(date).getTime())) 
        - Math.min(...validDates.map(date => new Date(date).getTime()))) / (1000 * 60 * 60 * 24)) + 1 : 1;
      
      updateContextData({
        activityCount: active.length,
        hasScheduledActivities: scheduledActivities.length > 0,
        timeSpanDays: timeSpan,
        lastActivity: new Date(),
        userBehavior: {
          usesMobile: isMobile,
          prefersDragDrop: scheduledActivities.length > active.length * 0.5,
          prefersDetailView: active.length > 10,
        }
      });
    }
  }, [itineraryActivities, isMobile, updateContextData]);

  // Geocode destination and set map coordinates
  useEffect(() => {
    const geocodeDestination = async () => {
      if (destinationData?.city && destinationData?.country) {
        const address = `${destinationData.city}, ${destinationData.country}`;
        
        try {
          const result = await geocodeAddress(address);
          
          if (result.success && result.data?.coordinates) {
            const { lat, lng } = result.data.coordinates;
            setItineraryCoordinates([lat, lng]);
          } else {
            console.warn("Failed to geocode destination:", result.error?.message || "Unknown error");
          }
        } catch (error) {
          console.error("Error geocoding destination:", error);
        }
      }
    };

    geocodeDestination();
  }, [destinationData, setItineraryCoordinates]);

  if (!itineraryId || !destinationId) {
    console.error('Missing required route params');
    return <div>Error: Missing itinerary or destination ID</div>;
  }

  if (isLoading) return <Loading />;
  if (error) {
    console.error('Builder page error:', error);
    return <div>Error: {error.message || 'Unknown error'}</div>;
  }

  try {
    return (
    <div className="w-full flex flex-col bg-bg-50 dark:bg-ink-900 h-[calc(100svh-56px)] min-h-0">
      {/* Enhanced Toolbar with ViewToggle */}
      <div className="shrink-0 z-40 flex items-center justify-between p-4 border-b bg-bg-0/90 dark:bg-ink-900/90 backdrop-blur-xl shadow-sm">
        <ViewToggle 
          className="flex-1"
          showMapToggle={!isMobile}
          isTransitioning={isTransitioningView}
          onViewChange={changeView}
          onDateChange={navigateToDate}
          currentDate={currentDate}
          isMobile={isMobile}
        />
        
        {/* Mobile Map Toggle */}
        {isMobile && (
          <Button
            variant={showMap ? 'default' : 'outline'}
            size="sm"
            onClick={toggleMap}
            className="ml-4"
          >
            {showMap ? <X className="h-4 w-4 mr-2" /> : <MapIcon className="h-4 w-4 mr-2" />}
            {showMap ? 'Hide' : 'Map'}
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 w-full">
            {showMap ? (
              <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                {/* Main Content */}
                <ResizablePanel defaultSize={60} className="min-w-0">
                  <div className="h-full min-h-0 bg-bg-50 dark:bg-ink-900">
                    <ViewTransition 
                      viewKey={currentView}
                      loadingComponent={<ViewLoadingState />}
                      className="h-full w-full"
                    >
                      <Suspense fallback={<ViewLoadingState />}>
                        {currentView === 'calendar' ? (
                          <div ref={calendarRef} className="h-full w-full overflow-hidden">
                            <GoogleCalendarView
                              isLoading={false}
                              className="h-full w-full"
                              selectedDate={currentDate ?? undefined}
                              onSelectedDateChange={(date) => navigateToDate(date)}
                              useExternalDndContext
                            />
                          </div>
                        ) : currentView === 'table' ? (
                          <div ref={tableRef} className="h-full w-full overflow-auto">
                            <div className="p-4 min-w-0">
                              <ItineraryTableView showMap={showMap} onToggleMap={toggleMap} />
                            </div>
                          </div>
                        ) : (
                          <div className="h-full w-full overflow-y-auto">
                            <ItineraryListView
                              ref={listRef}
                              showMap={showMap}
                              onToggleMap={toggleMap}
                              targetDate={targetDate}
                            />
                          </div>
                        )}
                      </Suspense>
                    </ViewTransition>
                  </div>
                </ResizablePanel>

                <ResizableHandle />

                {/* Map Panel */}
                <ResizablePanel
                  defaultSize={40}
                  minSize={25}
                  maxSize={60}
                  className="hidden sm:block"
                >
                  <div className="h-full min-h-0">
                    {(() => {
                      const filteredActivities = itineraryActivities.filter(
                        (a) =>
                          a.activity?.coordinates && Array.isArray(a.activity.coordinates) && a.activity.coordinates.length === 2
                      );
                      
                      return (
                        <Suspense fallback={
                          <div className="h-full flex items-center justify-center bg-bg-50 dark:bg-ink-900">
                              <div className="flex flex-col items-center space-y-2">
                              <MapIcon className="w-8 h-8 animate-spin text-brand-500" />
                              <p className="text-sm text-muted-foreground">Loading map...</p>
                            </div>
                          </div>
                        }>
                          <MapLoadErrorBoundary onRetry={() => setMapImportAttempt((v) => v + 1)}>
                            <ItineraryMap
                              activities={filteredActivities}
                              showRoutes={true}
                              destinationName={destinationData ? `${destinationData.city}, ${destinationData.country}` : undefined}
                              onActivitySelect={() => {}}
                              onActivityEdit={() => {}}
                              onAddSuggestion={() => {}}
                            />
                          </MapLoadErrorBoundary>
                        </Suspense>
                      );
                    })()}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <div className="h-full w-full bg-bg-50 dark:bg-ink-900">
                <ViewTransition 
                  viewKey={currentView}
                  loadingComponent={<ViewLoadingState />}
                  className="h-full w-full"
                >
                  <Suspense fallback={<ViewLoadingState />}>
                    {currentView === 'calendar' ? (
                          <div ref={calendarRef} className="h-full w-full overflow-hidden">
                            <GoogleCalendarView
                              isLoading={false}
                              className="h-full w-full"
                              selectedDate={currentDate ?? undefined}
                              onSelectedDateChange={(date) => navigateToDate(date)}
                              useExternalDndContext
                            />
                          </div>
                        ) : currentView === 'table' ? (
                          <div ref={tableRef} className="h-full w-full overflow-auto">
                            <div className="p-4 min-w-0">
                              <ItineraryTableView showMap={false} onToggleMap={toggleMap} />
                        </div>
                      </div>
                    ) : (
                      <div className="h-full w-full overflow-y-auto">
                        <ItineraryListView
                          ref={listRef}
                          showMap={false}
                          onToggleMap={toggleMap}
                          targetDate={targetDate}
                        />
                      </div>
                    )}
                  </Suspense>
                </ViewTransition>
              </div>
            )}
      </div>
      
    </div>
  );
  } catch (error) {
    console.error('Error in Builder component:', error);
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-muted-foreground">Unable to load the builder page</p>
        </div>
      </div>
    );
  }
}
