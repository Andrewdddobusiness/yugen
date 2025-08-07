"use client";

import React, { useState } from 'react';
import { Heart, Search, Lightbulb, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import WishlistPanel from '@/components/wishlist/WishlistPanel';

interface ItinerarySidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onPlaceSelect?: (place: any) => void;
  className?: string;
}

export function ItinerarySidebar({
  isCollapsed,
  onToggleCollapse,
  onPlaceSelect,
  className
}: ItinerarySidebarProps) {
  const [activeTab, setActiveTab] = useState('wishlist');

  const suggestions = [
    {
      id: 1,
      name: "Morning Coffee Route",
      description: "Start your day with the best cafes in the area",
      places: 3
    },
    {
      id: 2,
      name: "Cultural District Walk",
      description: "Museums and galleries within walking distance",
      places: 5
    },
    {
      id: 3,
      name: "Foodie Adventure",
      description: "Local restaurants and markets",
      places: 4
    }
  ];

  if (isCollapsed) {
    return (
      <div className={cn(
        "w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-4",
        className
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <div className="flex flex-col space-y-2">
          <Button
            variant={activeTab === 'wishlist' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('wishlist')}
            className="p-2"
            title="Wishlist"
          >
            <Heart className="h-4 w-4" />
          </Button>
          
          <Button
            variant={activeTab === 'search' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('search')}
            className="p-2"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
          
          <Button
            variant={activeTab === 'suggestions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('suggestions')}
            className="p-2"
            title="Suggestions"
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-80 bg-white border-r border-gray-200 flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Trip Planning</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-1"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-3 m-4 mb-2">
            <TabsTrigger value="wishlist" className="text-xs">
              <Heart className="h-4 w-4 mr-1" />
              Saved
            </TabsTrigger>
            <TabsTrigger value="search" className="text-xs">
              <Search className="h-4 w-4 mr-1" />
              Search
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="text-xs">
              <Lightbulb className="h-4 w-4 mr-1" />
              Ideas
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0">
            <TabsContent value="wishlist" className="h-full m-0 p-0">
              <WishlistPanel
                onPlaceSelect={onPlaceSelect}
                className="h-full border-0 shadow-none rounded-none"
                isCollapsed={false}
              />
            </TabsContent>

            <TabsContent value="search" className="h-full m-0 p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm mb-2">Quick Add</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Search for places to add to your itinerary
                  </p>
                  <Button className="w-full" onClick={() => {
                    // This would open the activities page or search modal
                    window.location.href = window.location.href.replace('/builder', '/activities');
                  }}>
                    <Search className="h-4 w-4 mr-2" />
                    Search Activities
                  </Button>
                </div>

                <div>
                  <h3 className="font-medium text-sm mb-2">Recent Searches</h3>
                  <div className="space-y-2">
                    {['Restaurants', 'Museums', 'Parks'].map((term) => (
                      <button
                        key={term}
                        className="w-full text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 py-1 rounded"
                      >
                        <History className="h-3 w-3 inline mr-2" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="suggestions" className="h-full m-0 p-4">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-sm mb-2">Route Suggestions</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Popular itinerary templates for your destination
                    </p>
                  </div>

                  <div className="space-y-3">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <h4 className="font-medium text-sm mb-1">{suggestion.name}</h4>
                        <p className="text-xs text-gray-600 mb-2">{suggestion.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {suggestion.places} places
                          </span>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                            Add Route
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <h3 className="font-medium text-sm mb-2">Smart Suggestions</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Based on your saved places and preferences
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>• Fill gaps in your schedule</p>
                      <p>• Optimize travel routes</p>
                      <p>• Suggest meal times</p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}