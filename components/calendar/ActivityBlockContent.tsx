"use client";

import React from 'react';
import { Clock, MapPin, Star, DollarSign, Phone, Globe, CalendarCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityData {
  name: string;
  address?: string;
  coordinates?: [number, number];
  types?: string[];
  rating?: number;
  price_level?: string;
  phone_number?: string;
  website_url?: string;
  photo_names?: string[];
}

interface ScheduledActivity {
  id: string;
  activityId: string;
  placeId: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  position: { day: number; startSlot: number; span: number };
  activity?: ActivityData;
  notes?: string;
  is_booked?: boolean;
  cost?: number;
  priority?: number;
}

interface ActivityBlockContentProps {
  activity: ScheduledActivity;
  blockSize: 'compact' | 'standard' | 'extended';
  activityColor: string;
  isResizing?: boolean;
  isDragging?: boolean;
}

export function ActivityBlockContent({
  activity,
  blockSize,
  activityColor,
  isResizing,
  isDragging
}: ActivityBlockContentProps) {
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const minute = minutes;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute} ${ampm}`;
  };

  const getDurationText = (duration: number) => {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  const getPriceLevelDisplay = (priceLevel?: string) => {
    switch (priceLevel) {
      case 'PRICE_LEVEL_FREE':
        return 'Free';
      case 'PRICE_LEVEL_INEXPENSIVE':
        return '$';
      case 'PRICE_LEVEL_MODERATE':
        return '$$';
      case 'PRICE_LEVEL_EXPENSIVE':
        return '$$$';
      case 'PRICE_LEVEL_VERY_EXPENSIVE':
        return '$$$$';
      default:
        return null;
    }
  };

  const getCategoryIcon = (types?: string[]) => {
    if (!types || types.length === 0) return MapPin;
    
    const type = types[0];
    // Return appropriate icons based on activity type
    if (type.includes('restaurant') || type.includes('food')) return '🍴';
    if (type.includes('tourist_attraction') || type.includes('museum')) return '🏛️';
    if (type.includes('shopping')) return '🛍️';
    if (type.includes('park') || type.includes('natural')) return '🌳';
    if (type.includes('entertainment') || type.includes('amusement')) return '🎭';
    if (type.includes('lodging')) return '🏨';
    if (type.includes('transit')) return '🚗';
    
    return MapPin;
  };

  const formatCategory = (types?: string[]) => {
    if (!types || types.length === 0) return null;
    return types[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const categoryIcon = getCategoryIcon(activity.activity?.types);
  const priceLevel = getPriceLevelDisplay(activity.activity?.price_level);
  const category = formatCategory(activity.activity?.types);

  if (blockSize === 'compact') {
    // Compact block for < 1 hour activities
    return (
      <div className="p-1.5 flex items-center space-x-2 min-h-0">
        <div className="flex-shrink-0 text-xs">
          {typeof categoryIcon === 'string' ? (
            <span className="text-xs">{categoryIcon}</span>
          ) : (
            <MapPin className="h-3 w-3 text-gray-500" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs text-gray-900 truncate leading-tight">
            {activity.activity?.name || 'Untitled Activity'}
          </div>
          <div className="text-xs text-gray-600 truncate">
            {formatTime(activity.startTime)}
          </div>
        </div>

        {activity.priority && activity.priority >= 4 && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-red-500" />
          </div>
        )}
      </div>
    );
  }

  if (blockSize === 'standard') {
    // Standard block for 1-3 hour activities
    return (
      <div className="p-2 pr-6">
        {/* Header with name and status indicators */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-gray-900 leading-tight truncate">
              {activity.activity?.name || 'Untitled Activity'}
            </div>
            {category && blockSize !== 'compact' && (
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {category}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
            {activity.is_booked && (
              <CalendarCheck className="h-3 w-3 text-green-600" />
            )}
            {activity.priority && activity.priority >= 4 && (
              <div className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </div>
        </div>

        {/* Time and duration */}
        <div className="flex items-center text-xs text-gray-600 mb-1">
          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
          <span className="truncate">
            {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
          </span>
        </div>

        {/* Rating and price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {activity.activity?.rating && (
              <div className="flex items-center">
                <Star className="h-3 w-3 text-yellow-500 mr-0.5" />
                <span className="text-xs text-gray-600">
                  {activity.activity.rating.toFixed(1)}
                </span>
              </div>
            )}
            
            {priceLevel && (
              <span className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                activityColor.replace('bg-', 'bg-').replace('500', '100'),
                activityColor.replace('bg-', 'text-').replace('500', '700')
              )}>
                {priceLevel}
              </span>
            )}
          </div>

          <span className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
            activityColor.replace('bg-', 'bg-').replace('500', '100'),
            activityColor.replace('bg-', 'text-').replace('500', '700')
          )}>
            {getDurationText(activity.duration)}
          </span>
        </div>
      </div>
    );
  }

  // Extended block for 3+ hour activities
  return (
    <div className="p-3 pr-6">
      {/* Header with name, category, and status */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 leading-tight">
            {activity.activity?.name || 'Untitled Activity'}
          </div>
          {category && (
            <div className="flex items-center text-xs text-gray-500 mt-0.5">
              {typeof categoryIcon === 'string' ? (
                <span className="mr-1">{categoryIcon}</span>
              ) : (
                <MapPin className="h-3 w-3 mr-1" />
              )}
              {category}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
          {activity.is_booked && (
            <CalendarCheck className="h-4 w-4 text-green-600" />
          )}
          {activity.priority && activity.priority >= 4 && (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Time information */}
      <div className="flex items-center text-xs text-gray-600 mb-2">
        <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
        <span>
          {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
          <span className="ml-1 text-gray-500">({getDurationText(activity.duration)})</span>
        </span>
      </div>

      {/* Address */}
      {activity.activity?.address && (
        <div className="flex items-start text-xs text-gray-600 mb-2">
          <MapPin className="h-3 w-3 mr-1 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{activity.activity.address}</span>
        </div>
      )}

      {/* Rating, price, and contact info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {activity.activity?.rating && (
            <div className="flex items-center">
              <Star className="h-3 w-3 text-yellow-500 mr-0.5" />
              <span className="text-xs text-gray-600">
                {activity.activity.rating.toFixed(1)}
              </span>
            </div>
          )}
          
          {priceLevel && (
            <div className="flex items-center">
              <DollarSign className="h-3 w-3 text-gray-500 mr-0.5" />
              <span className="text-xs text-gray-600">{priceLevel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Contact information */}
      <div className="flex items-center space-x-3 text-xs">
        {activity.activity?.phone_number && (
          <div className="flex items-center text-gray-500">
            <Phone className="h-3 w-3 mr-1" />
            <span className="truncate">{activity.activity.phone_number}</span>
          </div>
        )}
        
        {activity.activity?.website_url && (
          <div className="flex items-center text-blue-600">
            <Globe className="h-3 w-3 mr-1" />
            <span className="truncate">Website</span>
          </div>
        )}
      </div>

      {/* User notes */}
      {activity.notes && (
        <div className="mt-2 text-xs text-gray-600 border-t border-gray-100 pt-1">
          <span className="italic">&quot;{activity.notes}&quot;</span>
        </div>
      )}

      {/* Cost information */}
      {activity.cost && (
        <div className="mt-1 text-xs text-green-700 font-medium">
          Budget: ${activity.cost}
        </div>
      )}
    </div>
  );
}