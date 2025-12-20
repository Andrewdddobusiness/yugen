"use client";
import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { useMapStore } from "@/store/mapStore";
import Loading from "@/components/loading/Loading";
import { useParams } from "next/navigation";
const ItineraryMap = lazy(() => import("@/components/map/ItineraryMap").then(module => ({ default: module.ItineraryMap })));
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
import { Map, X } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ViewToggle } from "@/components/view/toggle/ViewToggle";
import { ViewTransition, ViewLoadingState } from "@/components/view/toggle/ViewTransition";
import { useViewRouter } from "@/hooks/useViewRouter";
import { useViewStatePreservation } from "@/hooks/useViewStatePreservation";
import { getDestination } from "@/actions/supabase/destinations";
import { geocodeAddress } from "@/actions/google/maps";

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
  const listRef = useRef<any>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  
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
    if (data) {
      setItineraryActivities(data);
    }
  }, [data, setItineraryActivities]);

  // Context data update in separate effect with memoized calculation
  useEffect(() => {
    if (data?.length) {
      const scheduledActivities = data.filter(a => a.start_time && a.end_time);
      const validDates = data.map(a => a.date).filter((date): date is string => !!date && !isNaN(new Date(date).getTime()));
      const timeSpan = validDates.length > 0 ? 
        Math.ceil((Math.max(...validDates.map(date => new Date(date).getTime())) 
        - Math.min(...validDates.map(date => new Date(date).getTime()))) / (1000 * 60 * 60 * 24)) + 1 : 1;
      
      updateContextData({
        activityCount: data.length,
        hasScheduledActivities: scheduledActivities.length > 0,
        timeSpanDays: timeSpan,
        lastActivity: new Date(),
        userBehavior: {
          usesMobile: isMobile,
          prefersDragDrop: scheduledActivities.length > data.length * 0.5,
          prefersDetailView: data.length > 10,
        }
      });
    }
  }, [data?.length, isMobile, updateContextData]);

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
    <div className="h-full flex flex-col">
      {/* Enhanced Toolbar with ViewToggle */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-950 shadow-sm">
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
            {showMap ? <X className="h-4 w-4 mr-2" /> : <Map className="h-4 w-4 mr-2" />}
            {showMap ? 'Hide' : 'Map'}
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
            {showMap ? (
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Main Content */}
                <ResizablePanel defaultSize={60} className="min-w-0">
                  <div className="h-full bg-gray-50 dark:bg-gray-900">
                    <ViewTransition 
                      viewKey={currentView}
                      loadingComponent={<ViewLoadingState />}
                      className="h-full"
                    >
                      <Suspense fallback={<ViewLoadingState />}>
                        {currentView === 'calendar' ? (
                          <div ref={calendarRef} className="h-full overflow-auto">
                            <GoogleCalendarView isLoading={false} className="h-full" />
                          </div>
                        ) : currentView === 'table' ? (
                          <div ref={tableRef} className="flex-1 h-full overflow-auto">
                            <div className="p-4">
                              <ItineraryTableView showMap={showMap} onToggleMap={toggleMap} />
                            </div>
                          </div>
                        ) : (
                          <ScrollArea className="flex-1 h-full">
                            <ItineraryListView
                              ref={listRef}
                              showMap={showMap}
                              onToggleMap={toggleMap}
                              targetDate={targetDate}
                            />
                          </ScrollArea>
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
                  <div className="h-full">
                    {(() => {
                      const filteredActivities = itineraryActivities.filter(
                        (a) =>
                          a.activity?.coordinates && Array.isArray(a.activity.coordinates) && a.activity.coordinates.length === 2
                      );
                      
                      return (
                        <Suspense fallback={
                          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                            <div className="flex flex-col items-center space-y-2">
                              <Map className="w-8 h-8 animate-spin text-blue-500" />
                              <p className="text-sm text-muted-foreground">Loading map...</p>
                            </div>
                          </div>
                        }>
                          <ItineraryMap
                            activities={filteredActivities}
                            showRoutes={true}
                            destinationName={destinationData ? `${destinationData.city}, ${destinationData.country}` : undefined}
                            onActivitySelect={() => {}}
                            onActivityEdit={() => {}}
                            onAddSuggestion={() => {}}
                          />
                        </Suspense>
                      );
                    })()}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <div className="h-full w-full bg-gray-50 dark:bg-gray-900">
                <ViewTransition 
                  viewKey={currentView}
                  loadingComponent={<ViewLoadingState />}
                  className="h-full"
                >
                  <Suspense fallback={<ViewLoadingState />}>
                    {currentView === 'calendar' ? (
                      <div ref={calendarRef} className="h-full overflow-auto">
                        <GoogleCalendarView isLoading={false} className="h-full" />
                      </div>
                    ) : currentView === 'table' ? (
                      <div ref={tableRef} className="flex-1 h-full overflow-auto">
                        <div className="p-4">
                          <ItineraryTableView showMap={false} onToggleMap={toggleMap} />
                        </div>
                      </div>
                    ) : (
                      <ScrollArea className="flex-1 h-full">
                        <ItineraryListView
                          ref={listRef}
                          showMap={false}
                          onToggleMap={toggleMap}
                          targetDate={targetDate}
                        />
                      </ScrollArea>
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
