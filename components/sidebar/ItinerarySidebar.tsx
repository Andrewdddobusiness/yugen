"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WishlistPanel } from '@/components/wishlist/WishlistPanel';
import { QuickAddPlace } from './QuickAddPlace';

interface ItinerarySidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function ItinerarySidebar({
  isCollapsed = false,
  onToggleCollapse,
  className
}: ItinerarySidebarProps) {
  const [activeTab, setActiveTab] = useState<'wishlist' | 'quickAdd'>('wishlist');

  return (
    <div className={cn(
      "relative bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col",
      isCollapsed ? "w-12" : "w-80",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        {!isCollapsed && (
          <>
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-500" />
              <h2 className="text-sm font-semibold text-gray-900">Place Library</h2>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex items-center bg-white rounded-lg p-1">
              <Button
                variant={activeTab === 'wishlist' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('wishlist')}
                className="h-7 px-2 text-xs"
              >
                Wishlist
              </Button>
              <Button
                variant={activeTab === 'quickAdd' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('quickAdd')}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </>
        )}
        
        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          {activeTab === 'wishlist' && (
            <ScrollArea className="h-full">
              <WishlistPanel
                className="p-0"
                isCollapsed={false}
                enableDragToCalendar={true}
              />
            </ScrollArea>
          )}
          
          {activeTab === 'quickAdd' && (
            <div className="p-4">
              <QuickAddPlace onPlaceAdded={() => setActiveTab('wishlist')} />
            </div>
          )}
        </div>
      )}

      {/* Collapsed State */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center justify-start pt-4 space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Wishlist"
            onClick={() => {
              setActiveTab('wishlist');
              onToggleCollapse?.();
            }}
          >
            <Heart className="h-4 w-4 text-red-500" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Add Place"
            onClick={() => {
              setActiveTab('quickAdd');
              onToggleCollapse?.();
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}