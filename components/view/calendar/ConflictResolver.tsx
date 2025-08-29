"use client";

import React, { useState } from 'react';
import { AlertTriangle, Clock, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ConflictType {
  type: 'time_overlap' | 'travel_time' | 'business_hours' | 'capacity' | 'personal';
  severity: 'high' | 'medium' | 'low';
  message: string;
  conflictingActivity?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
}

export interface TimeConflict {
  activityId: string;
  activityName: string;
  originalTime: {
    startTime: string;
    endTime: string;
    date: string;
  };
  conflicts: ConflictType[];
  suggestedResolutions: ResolutionOption[];
}

export interface ResolutionOption {
  id: string;
  type: 'adjust_time' | 'split_activity' | 'move_conflicting' | 'reduce_duration' | 'ignore';
  description: string;
  impact: string;
  newTime?: {
    startTime: string;
    endTime: string;
    date?: string;
  };
  affectedActivities?: string[];
}

interface ConflictResolverProps {
  conflicts: TimeConflict[];
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolutions: { conflictId: string; resolutionId: string }[]) => Promise<void>;
  className?: string;
}

/**
 * Intelligent conflict detection and resolution interface
 */
export function ConflictResolver({
  conflicts,
  isOpen,
  onClose,
  onResolve,
  className
}: ConflictResolverProps) {
  const [selectedResolutions, setSelectedResolutions] = useState<Record<string, string>>({});
  const [isResolving, setIsResolving] = useState(false);

  const handleResolutionSelect = (conflictId: string, resolutionId: string) => {
    setSelectedResolutions(prev => ({
      ...prev,
      [conflictId]: resolutionId
    }));
  };

  const handleResolveAll = async () => {
    setIsResolving(true);
    try {
      const resolutions = conflicts
        .filter(conflict => selectedResolutions[conflict.activityId])
        .map(conflict => ({
          conflictId: conflict.activityId,
          resolutionId: selectedResolutions[conflict.activityId]
        }));
      
      await onResolve(resolutions);
      onClose();
      setSelectedResolutions({});
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const getConflictIcon = (type: ConflictType['type']) => {
    switch (type) {
      case 'time_overlap': return <Clock className="h-4 w-4" />;
      case 'travel_time': return <MapPin className="h-4 w-4" />;
      case 'business_hours': return <Calendar className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: ConflictType['severity']) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  if (!conflicts.length) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-4xl max-h-[80vh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>Schedule Conflicts Detected</span>
          </DialogTitle>
          <DialogDescription>
            We found {conflicts.length} scheduling conflict{conflicts.length > 1 ? 's' : ''} that need your attention.
            Please choose how to resolve each conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {conflicts.map((conflict) => (
            <div key={conflict.activityId} className="border rounded-lg p-4 space-y-4">
              {/* Conflict Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-lg">{conflict.activityName}</h4>
                  <div className="text-sm text-muted-foreground">
                    {conflict.originalTime.date} • {formatTime(conflict.originalTime.startTime)} - {formatTime(conflict.originalTime.endTime)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {conflict.conflicts.map((conf, idx) => (
                    <Badge key={idx} variant={getSeverityColor(conf.severity) as any} className="text-xs">
                      {getConflictIcon(conf.type)}
                      <span className="ml-1">{conf.type.replace('_', ' ')}</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Conflict Details */}
              <div className="space-y-2">
                {conflict.conflicts.map((conf, idx) => (
                  <Alert key={idx} variant={getSeverityColor(conf.severity) as any}>
                    <AlertDescription className="flex items-start space-x-2">
                      {getConflictIcon(conf.type)}
                      <div>
                        <p>{conf.message}</p>
                        {conf.conflictingActivity && (
                          <p className="text-xs mt-1 text-muted-foreground">
                            Conflicts with: {conf.conflictingActivity.name} ({formatTime(conf.conflictingActivity.startTime)} - {formatTime(conf.conflictingActivity.endTime)})
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>

              {/* Resolution Options */}
              <div>
                <h5 className="font-medium mb-3">Resolution Options:</h5>
                <div className="space-y-2">
                  {conflict.suggestedResolutions.map((resolution) => (
                    <div
                      key={resolution.id}
                      className={cn(
                        "border rounded-lg p-3 cursor-pointer transition-colors",
                        selectedResolutions[conflict.activityId] === resolution.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => handleResolutionSelect(conflict.activityId, resolution.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="radio"
                          checked={selectedResolutions[conflict.activityId] === resolution.id}
                          onChange={() => handleResolutionSelect(conflict.activityId, resolution.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{resolution.description}</div>
                          <div className="text-sm text-muted-foreground mt-1">{resolution.impact}</div>
                          
                          {resolution.newTime && (
                            <div className="flex items-center space-x-2 mt-2 text-sm">
                              <span className="text-muted-foreground">
                                {formatTime(conflict.originalTime.startTime)} - {formatTime(conflict.originalTime.endTime)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">
                                {formatTime(resolution.newTime.startTime)} - {formatTime(resolution.newTime.endTime)}
                              </span>
                            </div>
                          )}
                          
                          {resolution.affectedActivities && resolution.affectedActivities.length > 0 && (
                            <div className="text-xs text-amber-600 mt-1">
                              Will also affect: {resolution.affectedActivities.length} other activit{resolution.affectedActivities.length > 1 ? 'ies' : 'y'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {Object.keys(selectedResolutions).length} of {conflicts.length} conflicts resolved
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleResolveAll}
                disabled={Object.keys(selectedResolutions).length !== conflicts.length || isResolving}
              >
                {isResolving ? 'Resolving...' : 'Apply Resolutions'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Auto-resolve conflicts with intelligent defaults
 */
export function autoResolveConflicts(conflicts: TimeConflict[]): { conflictId: string; resolutionId: string }[] {
  return conflicts.map(conflict => {
    // Find the best resolution based on priority:
    // 1. Adjust time (least disruptive)
    // 2. Reduce duration 
    // 3. Move conflicting activity
    // 4. Split activity (most complex)
    
    const priorityOrder = ['adjust_time', 'reduce_duration', 'move_conflicting', 'split_activity'];
    
    const bestResolution = priorityOrder
      .map(type => conflict.suggestedResolutions.find(r => r.type === type))
      .find(resolution => resolution !== undefined);
    
    return {
      conflictId: conflict.activityId,
      resolutionId: bestResolution?.id || conflict.suggestedResolutions[0]?.id || 'ignore'
    };
  });
}

/**
 * Generate resolution options for a conflict
 */
export function generateResolutionOptions(
  conflict: TimeConflict,
  availableSlots: Array<{ startTime: string; endTime: string }>,
  businessHours?: { open: string; close: string }
): ResolutionOption[] {
  const options: ResolutionOption[] = [];
  const duration = calculateDuration(conflict.originalTime.startTime, conflict.originalTime.endTime);

  // Option 1: Adjust to nearest available time
  if (availableSlots.length > 0) {
    const nearestSlot = availableSlots[0]; // Assuming sorted by proximity
    options.push({
      id: 'adjust_time',
      type: 'adjust_time',
      description: 'Move to nearest available time slot',
      impact: `Activity will be rescheduled to ${formatTime(nearestSlot.startTime)} - ${formatTime(nearestSlot.endTime)}`,
      newTime: nearestSlot
    });
  }

  // Option 2: Reduce duration to fit
  if (duration > 30) {
    const reducedDuration = Math.max(30, duration - 30);
    const endTime = addMinutesToTime(conflict.originalTime.startTime, reducedDuration);
    options.push({
      id: 'reduce_duration',
      type: 'reduce_duration',
      description: 'Reduce activity duration',
      impact: `Duration reduced by ${duration - reducedDuration} minutes`,
      newTime: {
        startTime: conflict.originalTime.startTime,
        endTime
      }
    });
  }

  // Option 3: Split into multiple sessions
  if (duration >= 120) {
    options.push({
      id: 'split_activity',
      type: 'split_activity',
      description: 'Split into multiple sessions',
      impact: 'Activity will be divided into smaller time blocks',
    });
  }

  // Option 4: Ignore conflict (proceed with warning)
  options.push({
    id: 'ignore',
    type: 'ignore',
    description: 'Keep current time (ignore conflict)',
    impact: 'Conflict will remain - you may need to manually manage overlapping activities'
  });

  return options;
}

// Utility functions
function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function calculateDuration(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}

function addMinutesToTime(timeString: string, minutes: number): string {
  const [hours, mins] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}:00`;
}