"use client";

import React, { useState } from 'react';
import { Grid, List, Map, Filter, SortAsc } from 'lucide-react';
import PlaceCard from '@/components/card/place/PlaceCard';
import type { ActivityWithDetails } from '@/types/database';

interface SearchResultsProps {
  results: any[];
  isLoading?: boolean;
  onPlaceSelect: (place: any) => void;
  onAddToWishlist?: (place: any) => void;
  onAddToItinerary?: (place: any) => void;
  onViewOnMap?: (place: any) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'relevance' | 'rating' | 'name' | 'distance';

export default function SearchResults({
  results,
  isLoading = false,
  onPlaceSelect,
  onAddToWishlist,
  onAddToItinerary,
  onViewOnMap,
  className = ""
}: SearchResultsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [ratingFilter, setRatingFilter] = useState<number>(0);

  // Get unique place types from results
  const availableTypes = Array.from(
    new Set(
      results
        .flatMap(place => place.types || [])
        .filter(type => !type.includes('establishment') && !type.includes('point_of_interest'))
    )
  ).sort();

  // Filter results
  const filteredResults = results.filter(place => {
    if (typeFilter && !place.types?.includes(typeFilter)) {
      return false;
    }
    if (ratingFilter > 0 && (!place.rating || place.rating < ratingFilter)) {
      return false;
    }
    return true;
  });

  // Sort results
  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'distance':
        // If we had coordinates, we could calculate distance
        return 0;
      default: // relevance
        return 0;
    }
  });

  const handlePlaceAction = (place: any, action: 'select' | 'wishlist' | 'itinerary' | 'map') => {
    switch (action) {
      case 'select':
        onPlaceSelect(place);
        break;
      case 'wishlist':
        onAddToWishlist?.(place);
        break;
      case 'itinerary':
        onAddToItinerary?.(place);
        break;
      case 'map':
        onViewOnMap?.(place);
        break;
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Searching for places...</p>
          </div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Map className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No places found</h3>
        <p className="text-gray-500">Try adjusting your search terms or filters.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Search Results ({sortedResults.length})
          </h2>
          
          {filteredResults.length < results.length && (
            <span className="text-sm text-gray-500">
              ({results.length - filteredResults.length} filtered out)
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="rating">Sort by Rating</option>
            <option value="name">Sort by Name</option>
            <option value="distance">Sort by Distance</option>
          </select>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 text-sm hover:bg-gray-50 ${
              showFilters ? 'bg-gray-50' : ''
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Place Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                {availableTypes.map(type => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Rating
              </label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Any Rating</option>
                <option value={3}>3+ Stars</option>
                <option value={4}>4+ Stars</option>
                <option value={4.5}>4.5+ Stars</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setTypeFilter('');
                  setRatingFilter(0);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid/List */}
      <div className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }>
        {sortedResults.map((place, index) => (
          <PlaceCard
            key={place.place_id || `${place.name}-${index}`}
            place={place}
            onAddToWishlist={() => handlePlaceAction(place, 'wishlist')}
            onAddToItinerary={() => handlePlaceAction(place, 'itinerary')}
            onViewOnMap={() => handlePlaceAction(place, 'map')}
            className={viewMode === 'list' ? 'max-w-none' : ''}
          />
        ))}
      </div>

      {/* Load More / Pagination */}
      {sortedResults.length >= 20 && (
        <div className="text-center mt-8">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Load More Results
          </button>
        </div>
      )}
    </div>
  );
}