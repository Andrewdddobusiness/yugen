"use client";

import React from 'react';
import { Calendar, Table2, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  currentView: 'calendar' | 'table';
  onViewChange: (view: 'calendar' | 'table') => void;
  showMap: boolean;
  onToggleMap: () => void;
  className?: string;
}

export function ViewToggle({
  currentView,
  onViewChange,
  showMap,
  onToggleMap,
  className
}: ViewToggleProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Calendar/Table Toggle */}
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
  );
}