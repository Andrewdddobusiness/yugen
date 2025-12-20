"use client";

import React from 'react';
import { format, parseISO, isWithinInterval, addMinutes } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, MapPin, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DraggedItem, DropValidation } from '@/components/provider/dnd/DragProvider';

interface DropValidationProps {
  validation: DropValidation;
  targetSlot: {
    date: Date;
    timeSlot: string;
  };
  draggedItem: DraggedItem;
  onSelectAlternative?: (alternative: any) => void;
  onResolveConflict?: (resolution: string) => void;
  className?: string;
}

/**
 * Drop validation feedback component that shows validation results and alternatives
 */
export function DropValidationFeedback({
  validation,
  targetSlot,
  draggedItem,
  onSelectAlternative,
  onResolveConflict,
  className
}: DropValidationProps) {
  if (validation.isValid) {
    return (
      <div className={cn(
        "absolute z-20 bg-green-50 border border-green-200 rounded-lg p-2 shadow-sm",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        className
      )}>
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-800">Valid drop zone</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "absolute z-20 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg min-w-[280px]",
      "animate-in fade-in-0 zoom-in-95 duration-150",
      className
    )}>
      {/* Error Header */}
      <div className="flex items-center space-x-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
        <span className="text-sm font-medium text-red-800">Cannot schedule here</span>
      </div>

      {/* Error Reason */}
      {validation.reason && (
        <p className="text-sm text-red-700 mb-3">
          {validation.reason}
        </p>
      )}

      {/* Conflicting Activities */}
      {validation.conflictingActivities && validation.conflictingActivities.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-medium text-red-800 mb-1">
            Conflicting activities:
          </h5>
          <div className="space-y-1">
            {validation.conflictingActivities.map((conflict, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 text-xs bg-red-100 rounded px-2 py-1"
              >
                <Calendar className="h-3 w-3 text-red-600" />
                <span className="text-red-800 font-medium truncate">
                  {conflict.name}
                </span>
                <span className="text-red-600">
                  {conflict.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Alternatives */}
      {validation.suggestedAlternatives && validation.suggestedAlternatives.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-gray-700 mb-2">
            Suggested times:
          </h5>
          <div className="grid grid-cols-2 gap-1">
            {validation.suggestedAlternatives.slice(0, 4).map((alternative, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onSelectAlternative?.(alternative)}
                className="h-7 text-xs justify-start bg-white hover:bg-blue-50"
              >
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(alternative.timeSlot)}
              </Button>
            ))}
          </div>
          
          {validation.suggestedAlternatives.length > 4 && (
            <p className="text-xs text-gray-500 mt-1">
              +{validation.suggestedAlternatives.length - 4} more times available
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Enhanced drop validation logic with comprehensive conflict detection
 */
export class DropValidator {
  private scheduledActivities: any[];
  private businessHours: { start: string; end: string; days: number[] };
  private travelTimeEnabled: boolean;
  
  constructor(
    scheduledActivities: any[] = [],
    businessHours = { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5, 6, 7] },
    travelTimeEnabled = true
  ) {
    this.scheduledActivities = scheduledActivities;
    this.businessHours = businessHours;
    this.travelTimeEnabled = travelTimeEnabled;
  }

  /**
   * Validate if a drop operation is allowed
   */
  validateDrop(
    draggedItem: DraggedItem,
    targetSlot: { date: Date; timeSlot: string },
    duration = 60
  ): DropValidation {
    const validations: Array<() => DropValidation | null> = [
      () => this.validateTimeSlotAvailability(targetSlot, duration),
      () => this.validateBusinessHours(targetSlot),
      () => this.validateConflicts(draggedItem, targetSlot, duration),
      () => this.validateTravelTime(draggedItem, targetSlot),
      () => this.validateDuration(targetSlot, duration),
      () => this.validateItemConstraints(draggedItem, targetSlot)
    ];

    // Run all validations
    for (const validation of validations) {
      const result = validation();
      if (result && !result.isValid) {
        // Add suggested alternatives for failed validations
        result.suggestedAlternatives = this.findAlternativeTimeSlots(
          draggedItem,
          targetSlot,
          duration
        );
        return result;
      }
    }

    return { isValid: true };
  }

  /**
   * Check if the time slot is available (not occupied)
   */
  private validateTimeSlotAvailability(
    targetSlot: { date: Date; timeSlot: string },
    duration: number
  ): DropValidation | null {
    const slotStart = this.parseTimeSlot(targetSlot.date, targetSlot.timeSlot);
    const slotEnd = addMinutes(slotStart, duration);

    const conflictingActivities = this.scheduledActivities.filter(activity => {
      const activityStart = parseISO(activity.startTime);
      const activityEnd = parseISO(activity.endTime);

      return (
        (slotStart < activityEnd && slotEnd > activityStart) ||
        (activityStart < slotEnd && activityEnd > slotStart)
      );
    });

    if (conflictingActivities.length > 0) {
      return {
        isValid: false,
        reason: 'Time slot overlaps with existing activities',
        conflictingActivities: conflictingActivities.map(activity => ({
          id: activity.id,
          name: activity.name || activity.activity?.name || 'Unknown Activity',
          time: `${format(parseISO(activity.startTime), 'h:mm a')} - ${format(parseISO(activity.endTime), 'h:mm a')}`
        }))
      };
    }

    return null;
  }

  /**
   * Check if the time falls within business hours
   */
  private validateBusinessHours(
    targetSlot: { date: Date; timeSlot: string }
  ): DropValidation | null {
    const dayOfWeek = targetSlot.date.getDay();
    const slotTime = targetSlot.timeSlot;

    // Check if day is within business days
    if (!this.businessHours.days.includes(dayOfWeek)) {
      return {
        isValid: false,
        reason: 'Selected day is outside business hours'
      };
    }

    // Check if time is within business hours
    const [hours, minutes] = slotTime.split(':').map(Number);
    const slotMinutes = hours * 60 + minutes;
    
    const [startHours, startMinutes] = this.businessHours.start.split(':').map(Number);
    const startMinutesTotal = startHours * 60 + startMinutes;
    
    const [endHours, endMinutes] = this.businessHours.end.split(':').map(Number);
    const endMinutesTotal = endHours * 60 + endMinutes;

    if (slotMinutes < startMinutesTotal || slotMinutes >= endMinutesTotal) {
      return {
        isValid: false,
        reason: `Activity scheduled outside business hours (${this.businessHours.start} - ${this.businessHours.end})`
      };
    }

    return null;
  }

  /**
   * Check for scheduling conflicts with buffer time
   */
  private validateConflicts(
    draggedItem: DraggedItem,
    targetSlot: { date: Date; timeSlot: string },
    duration: number
  ): DropValidation | null {
    const bufferTime = 15; // 15 minutes buffer between activities
    const slotStart = this.parseTimeSlot(targetSlot.date, targetSlot.timeSlot);
    const slotEnd = addMinutes(slotStart, duration + bufferTime);
    const slotStartWithBuffer = addMinutes(slotStart, -bufferTime);

    const nearbyActivities = this.scheduledActivities.filter(activity => {
      const activityStart = parseISO(activity.startTime);
      const activityEnd = addMinutes(parseISO(activity.endTime), bufferTime);

      return isWithinInterval(slotStart, { start: activityStart, end: activityEnd }) ||
             isWithinInterval(slotEnd, { start: activityStart, end: activityEnd }) ||
             isWithinInterval(activityStart, { start: slotStartWithBuffer, end: slotEnd });
    });

    if (nearbyActivities.length > 0) {
      return {
        isValid: false,
        reason: 'Not enough time between activities (requires 15-minute buffer)',
        conflictingActivities: nearbyActivities.map(activity => ({
          id: activity.id,
          name: activity.name || activity.activity?.name || 'Unknown Activity',
          time: `${format(parseISO(activity.startTime), 'h:mm a')} - ${format(parseISO(activity.endTime), 'h:mm a')}`
        }))
      };
    }

    return null;
  }

  /**
   * Validate travel time between activities
   */
  private validateTravelTime(
    draggedItem: DraggedItem,
    targetSlot: { date: Date; timeSlot: string }
  ): DropValidation | null {
    if (!this.travelTimeEnabled) return null;

    const slotTime = this.parseTimeSlot(targetSlot.date, targetSlot.timeSlot);
    
    // Find previous activity
    const previousActivity = this.findPreviousActivity(slotTime);
    if (previousActivity && previousActivity.location && draggedItem.data.activity?.location) {
      const estimatedTravelTime = this.estimateTravelTime(
        previousActivity.location,
        draggedItem.data.activity.location
      );

      const requiredGap = addMinutes(parseISO(previousActivity.endTime), estimatedTravelTime);
      
      if (slotTime < requiredGap) {
        return {
          isValid: false,
          reason: `Insufficient travel time from previous activity (${estimatedTravelTime} minutes needed)`
        };
      }
    }

    return null;
  }

  /**
   * Validate activity duration fits in the time slot
   */
  private validateDuration(
    targetSlot: { date: Date; timeSlot: string },
    duration: number
  ): DropValidation | null {
    const slotStart = this.parseTimeSlot(targetSlot.date, targetSlot.timeSlot);
    const slotEnd = addMinutes(slotStart, duration);
    
    // Check if activity extends beyond business hours
    const [endHours, endMinutes] = this.businessHours.end.split(':').map(Number);
    const businessEndTime = new Date(targetSlot.date);
    businessEndTime.setHours(endHours, endMinutes, 0, 0);

    if (slotEnd > businessEndTime) {
      return {
        isValid: false,
        reason: 'Activity duration extends beyond business hours'
      };
    }

    return null;
  }

  /**
   * Validate item-specific constraints
   */
  private validateItemConstraints(
    draggedItem: DraggedItem,
    targetSlot: { date: Date; timeSlot: string }
  ): DropValidation | null {
    // Check if item has specific time requirements
    const itemData = draggedItem.data;
    
    if (itemData.preferredTimeOfDay) {
      const slotHour = parseInt(targetSlot.timeSlot.split(':')[0]);
      
      switch (itemData.preferredTimeOfDay) {
        case 'morning':
          if (slotHour >= 12) {
            return {
              isValid: false,
              reason: 'This activity is preferred for morning hours'
            };
          }
          break;
        case 'afternoon':
          if (slotHour < 12 || slotHour >= 17) {
            return {
              isValid: false,
              reason: 'This activity is preferred for afternoon hours'
            };
          }
          break;
        case 'evening':
          if (slotHour < 17) {
            return {
              isValid: false,
              reason: 'This activity is preferred for evening hours'
            };
          }
          break;
      }
    }

    return null;
  }

  /**
   * Find alternative time slots when validation fails
   */
  private findAlternativeTimeSlots(
    draggedItem: DraggedItem,
    originalSlot: { date: Date; timeSlot: string },
    duration: number,
    maxAlternatives = 6
  ): Array<{ timeSlot: string; date: Date; score: number }> {
    const alternatives: Array<{ timeSlot: string; date: Date; score: number }> = [];
    const baseDate = originalSlot.date;
    
    // Generate time slots for the same day
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const testSlot = { date: baseDate, timeSlot };
        
        const validation = this.validateDrop(draggedItem, testSlot, duration);
        if (validation.isValid) {
          // Calculate score based on proximity to original time
          const originalMinutes = this.timeToMinutes(originalSlot.timeSlot);
          const testMinutes = this.timeToMinutes(timeSlot);
          const timeDiff = Math.abs(originalMinutes - testMinutes);
          const score = Math.max(0, 100 - timeDiff); // Higher score for closer times
          
          alternatives.push({
            timeSlot,
            date: baseDate,
            score
          });
        }
      }
    }

    // Sort by score and return top alternatives
    return alternatives
      .sort((a, b) => b.score - a.score)
      .slice(0, maxAlternatives);
  }

  // Helper methods
  private parseTimeSlot(date: Date, timeSlot: string): Date {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private findPreviousActivity(targetTime: Date): any | null {
    return this.scheduledActivities
      .filter(activity => parseISO(activity.endTime) <= targetTime)
      .sort((a, b) => parseISO(b.endTime).getTime() - parseISO(a.endTime).getTime())[0] || null;
  }

  private estimateTravelTime(from: any, to: any): number {
    // Simplified travel time estimation
    // In a real implementation, this would use Google Maps API
    const defaultTravelTime = 15; // 15 minutes default
    
    if (from.lat && from.lng && to.lat && to.lng) {
      // Calculate straight-line distance and estimate travel time
      const distance = this.calculateDistance(from.lat, from.lng, to.lat, to.lng);
      // Assume 30 km/h average speed in city
      return Math.max(10, Math.round(distance / 30 * 60));
    }
    
    return defaultTravelTime;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private timeToMinutes(timeSlot: string): number {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

// Utility function to format time
function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const period = hours >= 12 ? 'PM' : 'AM';
  
  if (minutes === 0) {
    return `${displayHour} ${period}`;
  }
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}