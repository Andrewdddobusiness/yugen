"use client";

import React from 'react';
import { AlertTriangle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { detectTravelTimeConflicts, suggestDepartureTime, type ActivityWithCoordinates } from '@/utils/travel/travelTimeUtils';
import type { TravelTimeResult } from '@/utils/travel/travelTimeUtils';

interface TravelTimeConflictsProps {
  activities: ActivityWithCoordinates[];
  travelTimes: TravelTimeResult[];
  className?: string;
}

export function TravelTimeConflicts({ activities, travelTimes, className }: TravelTimeConflictsProps) {
  const conflicts = detectTravelTimeConflicts(activities, travelTimes);

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {conflicts.map((conflict, index) => {
        const fromActivity = activities.find(a => a.itinerary_activity_id === conflict.fromActivityId);
        const toActivity = activities.find(a => a.itinerary_activity_id === conflict.toActivityId);
        const travelTime = travelTimes.find(t => 
          t.fromActivityId === conflict.fromActivityId && 
          t.toActivityId === conflict.toActivityId
        );

        if (!fromActivity || !toActivity || !travelTime) {
          return null;
        }

        const isError = conflict.severity === 'error';
        const Icon = isError ? AlertTriangle : AlertCircle;
        
        // Calculate suggested departure time for errors
        let suggestedDeparture: string | null = null;
        if (isError && toActivity.start_time) {
          suggestedDeparture = suggestDepartureTime(toActivity.start_time, travelTime.durationValue);
        }

        return (
          <Alert key={index} className={cn(
            "border-l-4",
            isError 
              ? "border-l-red-500 bg-red-50/50 text-red-800" 
              : "border-l-yellow-500 bg-yellow-50/50 text-yellow-800"
          )}>
            <Icon className={cn("h-4 w-4", isError ? "text-red-600" : "text-yellow-600")} />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium text-sm">
                  {fromActivity.activity?.name} → {toActivity.activity?.name}
                </div>
                <div className="text-sm">
                  {conflict.conflict}
                </div>
                {suggestedDeparture && (
                  <div className="text-xs flex items-center gap-1 mt-2">
                    <Clock className="h-3 w-3" />
                    <span>Suggested departure: {suggestedDeparture}</span>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}

export default TravelTimeConflicts;