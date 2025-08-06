"use client";

import React, { useState } from 'react';
import { 
  MapPin, 
  Star, 
  Clock, 
  Phone, 
  Globe, 
  Plus, 
  Heart,
  ExternalLink,
  Camera,
  Navigation
} from 'lucide-react';
import { getPlacePhotos } from '@/actions/google/maps';
import type { ActivityWithDetails } from '@/types/database';
import SavePlaceButton from '@/components/wishlist/SavePlaceButton';

interface PlaceCardProps {
  place: any; // Can be from Google API or database
  onAddToWishlist?: () => void;
  onAddToItinerary?: () => void;
  onViewOnMap?: () => void;
  showActions?: boolean;
  className?: string;
}

export default function PlaceCard({
  place,
  onAddToWishlist,
  onAddToItinerary,
  onViewOnMap,
  showActions = true,
  className = ""
}: PlaceCardProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  const loadPhotos = async () => {
    if (!place.photo_names || place.photo_names.length === 0 || photosLoaded || isLoadingPhotos) {
      return;
    }

    setIsLoadingPhotos(true);
    try {
      const result = await getPlacePhotos(place.photo_names.slice(0, 3), 400, 300);
      if (result.success) {
        setPhotos(result.data || []);
      }
    } catch (error) {
      console.error("Error loading photos:", error);
    } finally {
      setIsLoadingPhotos(false);
      setPhotosLoaded(true);
    }
  };

  const formatRating = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        <Star className="h-4 w-4 text-yellow-400 fill-current" />
        <span className="text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const formatPriceLevel = (priceLevel: string) => {
    const levels: { [key: string]: string } = {
      'PRICE_LEVEL_INEXPENSIVE': '$',
      'PRICE_LEVEL_MODERATE': '$$',
      'PRICE_LEVEL_EXPENSIVE': '$$$',
      'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
    };
    return levels[priceLevel] || '';
  };

  const formatTypes = (types: string[]) => {
    return types
      .filter(type => !type.includes('establishment') && !type.includes('point_of_interest'))
      .slice(0, 3)
      .map(type => type.replace(/_/g, ' '))
      .map(type => type.charAt(0).toUpperCase() + type.slice(1))
      .join(' • ');
  };

  const formatOpeningHours = (openHours: any[]) => {
    if (!openHours || openHours.length === 0) return null;
    
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const todayHours = openHours.find(h => h.day === today);
    
    if (!todayHours) return "Hours not available";
    
    if (!todayHours.open_hour && !todayHours.close_hour) {
      return "Closed today";
    }
    
    const openTime = `${todayHours.open_hour?.toString().padStart(2, '0')}:${todayHours.open_minute?.toString().padStart(2, '0')}`;
    const closeTime = `${todayHours.close_hour?.toString().padStart(2, '0')}:${todayHours.close_minute?.toString().padStart(2, '0')}`;
    
    return `${openTime} - ${closeTime}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${className}`}>
      {/* Photo Section */}
      {place.photo_names && place.photo_names.length > 0 && (
        <div className="relative h-48 bg-gray-100">
          {photos.length > 0 ? (
            <img
              src={photos[0]}
              alt={place.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {isLoadingPhotos ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              ) : (
                <button
                  onClick={loadPhotos}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Camera className="h-4 w-4" />
                  <span>Load Photos</span>
                </button>
              )}
            </div>
          )}
          
          {photos.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              +{photos.length - 1} more
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {place.name}
          </h3>
          {showActions && (
            <div className="flex space-x-1 ml-2">
              <SavePlaceButton 
                placeId={place.place_id}
                variant="icon"
                size="sm"
                onSaved={onAddToWishlist}
              />
              <button
                onClick={onAddToItinerary}
                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="Add to itinerary"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Address */}
        {(place.address || place.formatted_address) && (
          <div className="flex items-start space-x-2 mb-3">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600 line-clamp-2">
              {place.address || place.formatted_address}
            </p>
          </div>
        )}

        {/* Rating and Price */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {place.rating && formatRating(place.rating)}
            {place.price_level && (
              <span className="text-sm font-medium text-green-600">
                {formatPriceLevel(place.price_level)}
              </span>
            )}
          </div>
          
          {place.source && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              {place.source.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Types */}
        {place.types && place.types.length > 0 && (
          <p className="text-sm text-gray-500 mb-3">
            {formatTypes(place.types)}
          </p>
        )}

        {/* Description */}
        {place.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {place.description}
          </p>
        )}

        {/* Opening Hours */}
        {place.open_hours && place.open_hours.length > 0 && (
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {formatOpeningHours(place.open_hours)}
            </span>
          </div>
        )}

        {/* Contact Info */}
        <div className="flex items-center space-x-4 mb-4">
          {place.phone_number && (
            <a
              href={`tel:${place.phone_number}`}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Phone className="h-4 w-4" />
              <span>Call</span>
            </a>
          )}
          
          {place.website_url && (
            <a
              href={place.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Globe className="h-4 w-4" />
              <span>Website</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          
          {place.google_maps_url && (
            <a
              href={place.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Navigation className="h-4 w-4" />
              <span>Directions</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex space-x-2">
            <button
              onClick={onAddToItinerary}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              Add to Itinerary
            </button>
            <button
              onClick={onViewOnMap}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
            >
              View on Map
            </button>
          </div>
        )}

        {/* Reviews Preview */}
        {place.reviews && place.reviews.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Review</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                {place.reviews[0].rating && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-xs font-medium">{place.reviews[0].rating}</span>
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  by {place.reviews[0].author || 'Anonymous'}
                </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">
                {place.reviews[0].description}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}