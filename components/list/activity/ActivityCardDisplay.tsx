"use client";

import React from 'react';
import { MapPin, Star, Phone, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCategoryType } from '@/utils/formatting/types';
import Link from 'next/link';
import { HighlightedText } from '@/components/ui/highlighted-text';

interface ActivityData {
  activity_id?: string;
  name: string;
  address?: string;
  types?: string[];
  rating?: number;
  price_level?: string;
  phone_number?: string;
  website_url?: string;
}

interface ActivityCardDisplayProps {
  activity?: ActivityData;
  searchTerm?: string;
  getPriceDisplay: (priceLevel?: string) => string | null;
  isMobile: boolean;
  onEditName: () => void;
}

export const ActivityCardDisplay = React.memo(({
  activity,
  searchTerm = '',
  getPriceDisplay,
  isMobile,
  onEditName
}: ActivityCardDisplayProps) => {
  return (
    <div className="flex-1 space-y-2">
      {/* Title and metadata */}
      <div>
        <h3 
          className="font-medium text-gray-900 mb-1 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
          onClick={onEditName}
          title="Click to edit activity name"
        >
          <HighlightedText 
            text={activity?.name || 'Unnamed Activity'}
            searchTerm={searchTerm}
          />
        </h3>
        
        <div className="flex items-center gap-2 flex-wrap">
          {activity?.types && activity.types.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {formatCategoryType(activity.types[0])}
            </Badge>
          )}
          
          {activity?.rating && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span>{activity.rating.toFixed(1)}</span>
            </div>
          )}
          
          {activity?.price_level && (
            <div className="text-xs text-gray-600">
              {getPriceDisplay(activity.price_level)}
            </div>
          )}
        </div>
      </div>

      {/* Address */}
      {activity?.address && (
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <HighlightedText 
            text={activity.address}
            searchTerm={searchTerm}
          />
        </div>
      )}

      {/* Contact information */}
      {(activity?.phone_number || activity?.website_url) && (
        <div className={cn("flex items-center text-sm", isMobile ? "gap-3 flex-wrap" : "gap-4")}>
          {activity.phone_number && (
            <Link 
              href={`tel:${activity.phone_number}`}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
            >
              <Phone className="h-3 w-3" />
              <span>{activity.phone_number}</span>
            </Link>
          )}
          
          {activity.website_url && (
            <Link 
              href={activity.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline truncate", isMobile ? "max-w-36" : "max-w-48")}
            >
              <Globe className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">Visit website</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
});

ActivityCardDisplay.displayName = 'ActivityCardDisplay';