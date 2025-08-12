"use client";

import React, { useState } from 'react';
import { Clock, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { FreeTimeGap, FreeTimeSuggestion } from '@/utils/freeTimeSuggestions';

interface FreeTimeSuggestionsProps {
  gaps: FreeTimeGap[];
  onAddActivity?: (startTime: string, duration: number, suggestion: FreeTimeSuggestion) => void;
  className?: string;
}

export function FreeTimeSuggestions({ gaps, onAddActivity, className }: FreeTimeSuggestionsProps) {
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());

  if (gaps.length === 0) {
    return null;
  }

  const toggleExpanded = (gapId: string) => {
    const newExpanded = new Set(expandedGaps);
    if (newExpanded.has(gapId)) {
      newExpanded.delete(gapId);
    } else {
      newExpanded.add(gapId);
    }
    setExpandedGaps(newExpanded);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getGapTypeColor = (type: FreeTimeGap['type']) => {
    switch (type) {
      case 'short':
        return 'bg-gray-100 text-gray-700 border-l-gray-400';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-l-blue-400';
      case 'long':
        return 'bg-green-50 text-green-700 border-l-green-400';
      case 'meal':
        return 'bg-orange-50 text-orange-700 border-l-orange-400';
      default:
        return 'bg-gray-100 text-gray-700 border-l-gray-400';
    }
  };

  const getPriorityColor = (priority: FreeTimeSuggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-blue-600 dark:text-blue-400';
      case 'low':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-blue-600" />
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          Free Time Suggestions
        </h3>
        <Badge variant="secondary" className="text-xs">
          {gaps.length} gap{gaps.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Gaps */}
      <div className="space-y-3">
        {gaps.map((gap, index) => {
          const gapId = `gap-${gap.startTime}-${gap.endTime}`;
          const isExpanded = expandedGaps.has(gapId);

          return (
            <Card
              key={gapId}
              className={cn(
                "border-l-4",
                getGapTypeColor(gap.type)
              )}
            >
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(gapId)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-4 h-auto hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3 w-full text-left">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 flex-shrink-0">
                        <Clock className="h-4 w-4" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {gap.startTime} - {gap.endTime}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {formatDuration(gap.duration)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {gap.suggestions.length} suggestion{gap.suggestions.length > 1 ? 's' : ''} available
                        </p>
                      </div>

                      <div className="flex items-center text-gray-400">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="grid gap-2">
                        {gap.suggestions.map((suggestion, suggestionIndex) => (
                          <div
                            key={suggestionIndex}
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="text-lg flex-shrink-0 mt-0.5">
                              {suggestion.icon}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                    {suggestion.title}
                                  </h4>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {suggestion.description}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs", getPriorityColor(suggestion.priority))}
                                  >
                                    {suggestion.priority}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDuration(suggestion.duration)} suggested
                                </span>

                                {onAddActivity && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onAddActivity(gap.startTime, suggestion.duration, suggestion)}
                                    className="text-xs h-6 px-2"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Summary help text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p>
          <strong>Free time gaps</strong> represent unscheduled periods in your itinerary.
          Click on a gap to see personalized suggestions for how to spend that time.
        </p>
      </div>
    </div>
  );
}

interface FreeTimeSummaryProps {
  totalFreeTime: number;
  largestGap: number;
  gapCount: number;
  className?: string;
}

export function FreeTimeSummary({ totalFreeTime, largestGap, gapCount, className }: FreeTimeSummaryProps) {
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  if (gapCount === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400", className)}>
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <span>Fully scheduled</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400", className)}>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full" />
        <span>{formatDuration(totalFreeTime)} free</span>
      </div>
      {gapCount > 1 && (
        <>
          <span>•</span>
          <span>{gapCount} gaps</span>
        </>
      )}
      {largestGap > 60 && (
        <>
          <span>•</span>
          <span>longest: {formatDuration(largestGap)}</span>
        </>
      )}
    </div>
  );
}