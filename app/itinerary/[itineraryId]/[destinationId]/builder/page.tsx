"use client";
import React, { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import DragDropCalendar from "@/components/calendar/calendar";
import { GoogleCalendarView } from "@/components/calendar/GoogleCalendarView";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import Loading from "@/components/loading/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItineraryTableView } from "@/components/table/itineraryTable";
import { ItineraryListView } from "@/components/list/ItineraryListView";
import ErrorPage from "@/app/error/page";
import { useParams } from "next/navigation";
import GoogleMapView from "@/components/map/googleMapView";
import { Button } from "@/components/ui/button";
import { Calendar, Table, List, Map, X } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ViewToggle } from "@/components/view-toggle/ViewToggle";
import { ViewTransition, ViewLoadingState } from "@/components/view-toggle/ViewTransition";
import { ViewRecommendationCard } from "@/components/view-toggle/ViewRecommendationCard";
import { useViewRouter } from "@/hooks/useViewRouter";
import { useViewStatePreservation } from "@/hooks/useViewStatePreservation";

export default function Builder() {
  const { itineraryId, destinationId } = useParams();
  const itinId = itineraryId.toString();
  const destId = destinationId.toString();

  const { itineraryActivities, fetchItineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const { 
    currentView, 
    showMap, 
    isTransitioningView,
    updateContextData,
    setCurrentView, 
    toggleMap 
  } = useItineraryLayoutStore();
  
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
      console.log(`Entering view: ${view}`);
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
      console.log(`Exiting view: ${view}`);
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

  useEffect(() => {
    if (data) {
      setItineraryActivities(data);
      
      // Update context data for smart recommendations
      const scheduledActivities = data.filter(a => a.start_time && a.end_time);
      const validDates = data.map(a => a.date).filter(date => date && !isNaN(new Date(date).getTime()));
      const timeSpan = validDates.length > 0 ? 
        Math.ceil((Math.max(...validDates.map(date => new Date(date).getTime())) 
        - Math.min(...validDates.map(date => new Date(date).getTime()))) / (1000 * 60 * 60 * 24)) + 1 : 1;
      
      updateContextData({
        activityCount: data.length,
        hasScheduledActivities: scheduledActivities.length > 0,
        timeSpanDays: timeSpan,
        lastActivity: data.length > 0 ? new Date() : null,
        userBehavior: {
          usesMobile: isMobile,
          prefersDragDrop: scheduledActivities.length > data.length * 0.5, // More than 50% scheduled
          prefersDetailView: data.length > 10,
        }
      });
    }
  }, [data, setItineraryActivities, updateContextData, isMobile]);

  if (isLoading) return <Loading />;
  if (error) {
    console.error('Builder page error:', error);
    return <div>Error: {error.message || 'Unknown error'}</div>;
  }

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
                      {currentView === 'calendar' ? (
                        <div ref={calendarRef} className="h-full overflow-auto">
                          <GoogleCalendarView 
                            isLoading={false} 
                            className="h-full"
                          />
                        </div>
                      ) : currentView === 'table' ? (
                        <div ref={tableRef} className="flex-1 h-full overflow-auto">
                          <div className="p-4">
                            <ItineraryTableView 
                              showMap={showMap} 
                              onToggleMap={toggleMap}
                            />
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
                    <GoogleMapView
                      activities={itineraryActivities.filter(
                        (a) =>
                          a.activity?.coordinates && Array.isArray(a.activity.coordinates) && a.activity.coordinates.length === 2
                      )}
                    />
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
                  {currentView === 'calendar' ? (
                    <div ref={calendarRef} className="h-full overflow-auto">
                      <GoogleCalendarView 
                        isLoading={false} 
                        className="h-full"
                      />
                    </div>
                  ) : currentView === 'table' ? (
                    <div ref={tableRef} className="flex-1 h-full overflow-auto">
                      <div className="p-4">
                        <ItineraryTableView 
                          showMap={false} 
                          onToggleMap={toggleMap}
                        />
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
                </ViewTransition>
              </div>
            )}
      </div>
      
      {/* View Recommendations */}
      <ViewRecommendationCard autoShow={true} showDelay={5000} />
    </div>
  );
}
