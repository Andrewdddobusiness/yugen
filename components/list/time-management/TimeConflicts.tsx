"use client";

import React, { useState } from 'react';
import { AlertTriangle, Clock, MapPin, Utensils, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { TimeConflict, ConflictResolution } from '@/utils/timeConflicts';

interface TimeConflictsProps {
  conflicts: TimeConflict[];
  onApplySuggestion?: (activityId: string, suggestion: ConflictResolution) => void;
  className?: string;
}

export function TimeConflicts({ conflicts, onApplySuggestion, className }: TimeConflictsProps) {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set());
  
  if (conflicts.length === 0) {
    return null;
  }

  const errors = conflicts.filter(c => c.severity === 'error');
  const warnings = conflicts.filter(c => c.severity === 'warning');

  const toggleExpanded = (conflictId: string) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId);
    } else {
      newExpanded.add(conflictId);
    }
    setExpandedConflicts(newExpanded);
  };

  const getConflictIcon = (type: TimeConflict['type']) => {
    switch (type) {
      case 'overlap':
        return <Clock className="h-4 w-4" />;
      case 'insufficient_travel':
        return <MapPin className="h-4 w-4" />;
      case 'meal_timing':
        return <Utensils className="h-4 w-4" />;
      case 'closed_venue':
        return <Building2 className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const renderConflictGroup = (conflictList: TimeConflict[], title: string, colorClass: string) => {
    if (conflictList.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h4 className={cn("font-medium text-sm", colorClass)}>{title}</h4>
          <Badge variant={conflictList[0].severity === 'error' ? 'destructive' : 'secondary'} className="text-xs">
            {conflictList.length}
          </Badge>
        </div>
        
        {conflictList.map((conflict, index) => {
          const conflictId = `${conflict.type}-${index}`;
          const isExpanded = expandedConflicts.has(conflictId);
          
          return (
            <Card key={conflictId} className={cn(
              "border-l-4",
              conflict.severity === 'error' ? "border-l-red-500" : "border-l-yellow-500"
            )}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(conflictId)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-4 h-auto hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-start gap-3 w-full text-left">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 mt-0.5",
                        conflict.severity === 'error' 
                          ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400"
                      )}>
                        {getConflictIcon(conflict.type)}
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-gray-100 leading-tight">
                          {conflict.message}
                        </p>
                        {conflict.suggestions.length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {conflict.suggestions.length} suggestion{conflict.suggestions.length > 1 ? 's' : ''} available
                          </p>
                        )}
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
                  {conflict.suggestions.length > 0 && (
                    <div className="px-4 pb-4">
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Suggested Solutions:
                        </h5>
                        <div className="space-y-2">
                          {conflict.suggestions.map((suggestion, suggestionIndex) => (
                            <div
                              key={suggestionIndex}
                              className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                            >
                              <div className="flex-1">
                                <p className="text-sm text-gray-900 dark:text-gray-100">
                                  {suggestion.description}
                                </p>
                                {(suggestion.newStartTime || suggestion.newEndTime) && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {suggestion.newStartTime && `Start: ${suggestion.newStartTime}`}
                                    {suggestion.newStartTime && suggestion.newEndTime && ' • '}
                                    {suggestion.newEndTime && `End: ${suggestion.newEndTime}`}
                                  </p>
                                )}
                              </div>
                              
                              {onApplySuggestion && suggestion.action === 'adjust_time' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Apply to first activity in the conflict
                                    if (conflict.activityIds.length > 0) {
                                      onApplySuggestion(conflict.activityIds[0], suggestion);
                                    }
                                  }}
                                  className="text-xs"
                                >
                                  Apply
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          Schedule Conflicts
        </h3>
      </div>

      {/* Errors */}
      {renderConflictGroup(errors, "Errors", "text-red-600 dark:text-red-400")}
      
      {/* Warnings */}
      {renderConflictGroup(warnings, "Warnings", "text-yellow-600 dark:text-yellow-400")}
      
      {/* Summary help text */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p>
            <strong>Errors</strong> indicate scheduling problems that prevent your itinerary from working properly.
            <strong className="ml-2">Warnings</strong> are suggestions to improve your schedule.
          </p>
        </div>
      )}
    </div>
  );
}

interface DayConflictsSummaryProps {
  conflicts: TimeConflict[];
  className?: string;
}

export function DayConflictsSummary({ conflicts, className }: DayConflictsSummaryProps) {
  if (conflicts.length === 0) {
    return (
      <div className={cn("flex items-center gap-1 text-xs text-green-600 dark:text-green-400", className)}>
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        No conflicts
      </div>
    );
  }

  const errors = conflicts.filter(c => c.severity === 'error').length;
  const warnings = conflicts.filter(c => c.severity === 'warning').length;

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      {errors > 0 && (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
          {errors} error{errors > 1 ? 's' : ''}
        </div>
      )}
      {warnings > 0 && (
        <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
          {warnings} warning{warnings > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}