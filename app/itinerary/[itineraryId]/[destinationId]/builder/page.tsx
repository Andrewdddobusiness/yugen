"use client";
import React, { useEffect, useState } from "react";
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

export default function Builder() {
  const { itineraryId, destinationId } = useParams();
  const itinId = itineraryId.toString();
  const destId = destinationId.toString();

  const { itineraryActivities, fetchItineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const { currentView, showMap, setCurrentView, toggleMap } = useItineraryLayoutStore();

  // Fetch itinerary activities
  const { isLoading, error, data } = useQuery({
    queryKey: ["itineraryActivities", itineraryId, destinationId],
    queryFn: () => fetchItineraryActivities(itinId, destId),
    enabled: !!itineraryId && !!destinationId,
  });

  useEffect(() => {
    if (data) {
      setItineraryActivities(data);
    }
  }, [data, setItineraryActivities]);

  if (isLoading) return <Loading />;
  if (error) {
    console.error('Builder page error:', error);
    return <div>Error: {error.message || 'Unknown error'}</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('calendar')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={currentView === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('table')}
          >
            <Table className="h-4 w-4 mr-2" />
            Table
          </Button>
          <Button
            variant={currentView === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentView('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>
        <Button
          variant={showMap ? 'default' : 'outline'}
          size="sm"
          onClick={toggleMap}
        >
          {showMap ? <X className="h-4 w-4 mr-2" /> : <Map className="h-4 w-4 mr-2" />}
          {showMap ? 'Hide Map' : 'Show Map'}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
            {showMap ? (
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Main Content */}
                <ResizablePanel defaultSize={60} className="min-w-0">
                  <div className="h-full bg-gray-50">
                    {currentView === 'calendar' ? (
                      <div className="h-full">
                        <GoogleCalendarView isLoading={false} className="h-full" />
                      </div>
                    ) : currentView === 'table' ? (
                      <ScrollArea className="flex-1 h-full">
                        <div className="p-4">
                          <ItineraryTableView showMap={showMap} onToggleMap={toggleMap} />
                        </div>
                      </ScrollArea>
                    ) : (
                      <ScrollArea className="flex-1 h-full">
                        <ItineraryListView showMap={showMap} onToggleMap={toggleMap} />
                      </ScrollArea>
                    )}
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
              <div className="h-full w-full bg-gray-50">
                {currentView === 'calendar' ? (
                  <div className="h-full">
                    <GoogleCalendarView isLoading={false} className="h-full" />
                  </div>
                ) : currentView === 'table' ? (
                  <ScrollArea className="flex-1 h-full">
                    <div className="p-4">
                      <ItineraryTableView showMap={false} onToggleMap={toggleMap} />
                    </div>
                  </ScrollArea>
                ) : (
                  <ScrollArea className="flex-1 h-full">
                    <ItineraryListView showMap={false} onToggleMap={toggleMap} />
                  </ScrollArea>
                )}
              </div>
            )}
      </div>
    </div>
  );
}
