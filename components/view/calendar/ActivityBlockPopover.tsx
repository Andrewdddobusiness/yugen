"use client";

import React from 'react';
import { Star, MapPin, Clock, Phone, Globe, DollarSign, Calendar, User } from 'lucide-react';
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
  description?: string;
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

interface ActivityBlockPopoverProps {
  activity: ScheduledActivity;
  isVisible: boolean;
  position: { x: number; y: number };
}

export function ActivityBlockPopover({
  activity,
  isVisible,
  position
}: ActivityBlockPopoverProps) {
  if (!isVisible) return null;

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
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  const getPriceLevelDisplay = (priceLevel?: string) => {
    switch (priceLevel) {
      case 'PRICE_LEVEL_FREE':
        return { text: 'Free', level: '$' };
      case 'PRICE_LEVEL_INEXPENSIVE':
        return { text: 'Inexpensive', level: '$' };
      case 'PRICE_LEVEL_MODERATE':
        return { text: 'Moderate', level: '$$' };
      case 'PRICE_LEVEL_EXPENSIVE':
        return { text: 'Expensive', level: '$$$' };
      case 'PRICE_LEVEL_VERY_EXPENSIVE':
        return { text: 'Very Expensive', level: '$$$$' };
      default:
        return null;
    }
  };

  const formatCategory = (types?: string[]) => {
    if (!types || types.length === 0) return 'Activity';
    return types
      .slice(0, 2)
      .map(type => type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
      .join(', ');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const priceInfo = getPriceLevelDisplay(activity.activity?.price_level);
  const category = formatCategory(activity.activity?.types);

  return (
    <div
      className="absolute z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      {/* Header */}
      <div className="mb-3">
        <div className="font-semibold text-gray-900 text-base leading-tight mb-1">
          {activity.activity?.name || 'Untitled Activity'}
        </div>
        <div className="text-sm text-gray-600">
          {category}
        </div>
      </div>

      {/* Date and Time */}
      <div className="flex items-center text-sm text-gray-700 mb-3">
        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
        <div>
          <div className="font-medium">{formatDate(activity.date)}</div>
          <div className="text-gray-600">
            {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
            <span className="ml-1">({getDurationText(activity.duration)})</span>
          </div>
        </div>
      </div>

      {/* Rating and Price */}
      <div className="flex items-center justify-between mb-3">
        {activity.activity?.rating && (
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-500 mr-1" />
            <span className="text-sm font-medium text-gray-900">
              {activity.activity.rating.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500 ml-1">rating</span>
          </div>
        )}
        
        {priceInfo && (
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
            <span className="text-sm text-gray-700">
              {priceInfo.level} - {priceInfo.text}
            </span>
          </div>
        )}
      </div>

      {/* Address */}
      {activity.activity?.address && (
        <div className="flex items-start mb-3">
          <MapPin className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            {activity.activity.address}
          </div>
        </div>
      )}

      {/* Description */}
      {activity.activity?.description && (
        <div className="mb-3">
          <p className="text-sm text-gray-600 line-clamp-3">
            {activity.activity.description}
          </p>
        </div>
      )}

      {/* Contact Information */}
      <div className="space-y-2 mb-3">
        {activity.activity?.phone_number && (
          <div className="flex items-center">
            <Phone className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm text-gray-700">
              {activity.activity.phone_number}
            </span>
          </div>
        )}
        
        {activity.activity?.website_url && (
          <div className="flex items-center">
            <Globe className="h-4 w-4 text-gray-500 mr-2" />
            <a
              href={activity.activity.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 pointer-events-auto"
            >
              Visit Website
            </a>
          </div>
        )}
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-3 mb-3">
        {activity.is_booked && (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Calendar className="h-3 w-3 mr-1" />
            Confirmed
          </div>
        )}
        
        {activity.priority && activity.priority >= 4 && (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            High Priority
          </div>
        )}
        
        {activity.cost && (
          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Budget: ${activity.cost}
          </div>
        )}
      </div>

      {/* User Notes */}
      {activity.notes && (
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-start">
            <User className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Your Notes</div>
              <p className="text-sm text-gray-700 italic">
                &quot;{activity.notes}&quot;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Arrow pointer */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-200"></div>
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-px"></div>
      </div>
    </div>
  );
}