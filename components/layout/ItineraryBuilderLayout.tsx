"use client";

import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import ItineraryHeader from '@/components/layout/header/ItineraryHeader';
import ItineraryToolbar from '@/components/layout/header/ItineraryToolbar';
import ItinerarySidebar from '@/components/layout/sidebar/ItinerarySidebar';
import { useItineraryLayoutStore } from '@/store/itineraryLayoutStore';
import { fetchItineraryDestination, fetchItineraryDestinationDateRange } from '@/actions/supabase/actions';
import Loading from '@/components/loading/Loading';
import ErrorPage from '@/app/error/page';
const GoogleMapView = lazy(() => import('@/components/map/GoogleMapView'));
import { useItineraryActivityStore } from '@/store/itineraryActivityStore';

interface ItineraryBuilderLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function ItineraryBuilderLayout({ children, className }: ItineraryBuilderLayoutProps) {
  const { itineraryId, destinationId } = useParams();
  const [itineraryName, setItineraryName] = useState('');
  
  const { itineraryActivities } = useItineraryActivityStore();
  
	  const {
	    currentView,
	    timeRange,
	    showMap,
	    sidebarCollapsed,
	    searchQuery,
	    activeFilters,
	    layoutPreferences,
	    setCurrentView,
	    setTimeRange,
	    setShowMap,
	    toggleMap,
	    toggleSidebar,
	    setSearchQuery,
	    setActiveFilters,
	  } = useItineraryLayoutStore();

  // Fetch itinerary and destination data
  const { data: destinationData, isLoading: isDestinationLoading, error: destinationError } = useQuery({
    queryKey: ["itineraryDestination", itineraryId],
    queryFn: () => fetchItineraryDestination(itineraryId as string),
    enabled: !!itineraryId,
  });

  const { data: dateRangeData, isLoading: isDateRangeLoading } = useQuery({
    queryKey: ["itineraryDestinationDateRange", itineraryId, destinationId],
    queryFn: () => fetchItineraryDestinationDateRange(itineraryId as string, destinationId as string),
    enabled: !!itineraryId && !!destinationId,
  });

  // Set initial itinerary name from destination
  useEffect(() => {
    if (destinationData?.data?.city && destinationData?.data?.country) {
      setItineraryName(`Trip to ${destinationData.data.city}, ${destinationData.data.country}`);
    }
  }, [destinationData]);

  const handleNameChange = async (newName: string) => {
    setItineraryName(newName);
    // TODO: Implement API call to update itinerary name
    console.log('Update itinerary name:', newName);
  };

  const handleDateChange = async (dates: { from: Date; to: Date }) => {
    // TODO: Implement API call to update itinerary dates
    console.log('Update itinerary dates:', dates);
  };

	  const handleAddActivity = () => {
	    // Activities are now handled inside the builder (map/search panel).
	    setShowMap(true);
	  };

  const handlePlaceSelect = (place: any) => {
    // TODO: Implement place selection logic for drag-and-drop
    console.log('Place selected:', place);
  };

  if (isDestinationLoading || isDateRangeLoading) {
    return <Loading />;
  }

  if (destinationError || destinationData?.error || !destinationData?.data) {
    console.error('ItineraryBuilderLayout error:', destinationError, destinationData);
    return <div>Layout Error: {destinationError?.message || destinationData?.error?.message || 'Failed to load destination data'}</div>;
  }

  const destination = destinationData.data;
  const dateRange = dateRangeData?.success && dateRangeData.data 
    ? { from: new Date(dateRangeData.data.from), to: new Date(dateRangeData.data.to) }
    : { from: new Date(), to: new Date() };

  return (
    <div className={cn("flex flex-col h-full w-full overflow-hidden bg-gray-50", className)}>
      {/* Header */}
      {layoutPreferences.showHeader && (
        <ItineraryHeader
          itineraryName={itineraryName}
          destination={`${destination.city}, ${destination.country}`}
          dateRange={dateRange}
          onNameChange={handleNameChange}
          onDateChange={handleDateChange}
        />
      )}

      {/* Toolbar */}
      {layoutPreferences.showToolbar && (
        <ItineraryToolbar
          itineraryId={itineraryId?.toString()}
          currentView={currentView}
          onViewChange={setCurrentView}
          showMap={showMap}
          onToggleMap={toggleMap}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          onAddActivity={handleAddActivity}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {showMap ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Main Content */}
            <ResizablePanel defaultSize={60} className="min-w-0">
              <div className="h-full bg-white">
                {children}
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
                <Suspense fallback={
                  <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      <p className="text-sm text-muted-foreground">Loading map...</p>
                    </div>
                  </div>
                }>
                  <GoogleMapView
                    activities={itineraryActivities.filter(
                      (a) =>
                        a.activity?.coordinates && 
                        Array.isArray(a.activity.coordinates) && 
                        a.activity.coordinates.length === 2
                    )}
                  />
                </Suspense>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full w-full bg-white">
            {children}
          </div>
        )}
      </div>

      {/* Mobile-specific elements */}
      <div className="sm:hidden">
        {/* Mobile view toggles, bottom sheets, etc. would go here */}
      </div>
    </div>
  );
}
