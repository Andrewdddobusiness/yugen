"use client";

import React from "react";
import { Filter, ChevronDown, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FilterPanel } from "./FilterPanel";
import type { SuggestionsControlPanelProps } from "./types";

/**
 * Control panel for location suggestions
 * Shows suggestion count, filters, and loading state
 */
export function SuggestionsControlPanel({
  filteredCount,
  totalActivities,
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  onRefresh,
  isLoading,
}: SuggestionsControlPanelProps) {
  return (
    <>
      {/* Main Control Panel Card */}
      <Card className="absolute top-4 right-4 z-10 p-3 bg-white/95 backdrop-blur max-w-xs">
        <div className="space-y-3">
          {/* Header with count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-sm">Suggestions</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {filteredCount}
            </Badge>
          </div>

          {/* Stats */}
          <div className="text-xs text-gray-600 space-y-1">
            <div>Based on your {totalActivities} activities</div>
            <div>Within {filters.radius}m radius</div>
          </div>

          {/* Filter Toggle Button */}
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="w-full text-xs">
            <Filter className="h-3 w-3 mr-1" />
            Filters
            <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", showFilters && "rotate-180")} />
          </Button>

          {/* Expandable Filter Panel */}
          {showFilters && <FilterPanel filters={filters} setFilters={setFilters} onRefresh={onRefresh} />}
        </div>
      </Card>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute bottom-4 right-4 z-10 bg-white/95 rounded-lg shadow-lg p-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-600 border-t-transparent" />
            Finding suggestions...
          </div>
        </div>
      )}
    </>
  );
}
