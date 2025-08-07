"use client";

import React from 'react';
import { Calendar, Table2, Map, Filter, Search, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ItineraryToolbarProps {
  currentView: 'calendar' | 'table';
  onViewChange: (view: 'calendar' | 'table') => void;
  showMap: boolean;
  onToggleMap: () => void;
  timeRange: 'day' | 'week';
  onTimeRangeChange: (range: 'day' | 'week') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: string[];
  onFilterChange: (filters: string[]) => void;
  onAddActivity: () => void;
  className?: string;
}

export function ItineraryToolbar({
  currentView,
  onViewChange,
  showMap,
  onToggleMap,
  timeRange,
  onTimeRangeChange,
  searchQuery,
  onSearchChange,
  activeFilters,
  onFilterChange,
  onAddActivity,
  className
}: ItineraryToolbarProps) {
  
  const filterOptions = [
    'Restaurant',
    'Attraction',
    'Shopping',
    'Entertainment',
    'Outdoor',
    'Culture',
    'Nightlife',
    'Transportation'
  ];

  const toggleFilter = (filter: string) => {
    const newFilters = activeFilters.includes(filter)
      ? activeFilters.filter(f => f !== filter)
      : [...activeFilters, filter];
    onFilterChange(newFilters);
  };

  return (
    <div className={cn(
      "bg-white border-b border-gray-200 px-4 py-3",
      className
    )}>
      <div className="flex items-center justify-between space-x-4">
        {/* Left side - View controls */}
        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <Tabs value={currentView} onValueChange={(value) => onViewChange(value as 'calendar' | 'table')}>
            <TabsList className="grid w-[120px] grid-cols-2 border">
              <TabsTrigger value="calendar" className="px-3">
                <Calendar className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="table" className="px-3">
                <Table2 className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Time Range Selector (for calendar view) */}
          {currentView === 'calendar' && (
            <Select value={timeRange} onValueChange={(value) => onTimeRangeChange(value as 'day' | 'week')}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Map Toggle */}
          <Button
            variant={showMap ? "default" : "outline"}
            size="sm"
            onClick={onToggleMap}
            className="hidden sm:flex"
          >
            <Map className="h-4 w-4 mr-1" />
            Map
          </Button>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {activeFilters.length > 0 && (
                  <span className="ml-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2">
                <p className="text-sm font-medium mb-2">Activity Types</p>
                {filterOptions.map((filter) => (
                  <DropdownMenuItem
                    key={filter}
                    onClick={() => toggleFilter(filter)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{filter}</span>
                      {activeFilters.includes(filter) && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                {activeFilters.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onFilterChange([])}
                      className="cursor-pointer text-red-600"
                    >
                      Clear all filters
                    </DropdownMenuItem>
                  </>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Activity */}
          <Button onClick={onAddActivity} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Activity
          </Button>
        </div>
      </div>
    </div>
  );
}