"use client";

import React, { useState } from 'react';
import { Search, Plus, MapPin, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QuickAddPlaceProps {
  onPlaceAdded?: () => void;
  className?: string;
}

interface SearchResult {
  id: string;
  name: string;
  address: string;
  rating?: number;
  category: string;
  price_level?: string;
}

export function QuickAddPlace({ onPlaceAdded, className }: QuickAddPlaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // TODO: Implement actual place search using Google Places API
    // For now, showing mock results
    setTimeout(() => {
      setSearchResults([
        {
          id: '1',
          name: 'Central Park',
          address: '5th Ave, New York, NY',
          rating: 4.6,
          category: 'Park',
          price_level: 'PRICE_LEVEL_FREE'
        },
        {
          id: '2',
          name: 'Museum of Modern Art',
          address: '11 W 53rd St, New York, NY',
          rating: 4.5,
          category: 'Museum',
          price_level: 'PRICE_LEVEL_EXPENSIVE'
        }
      ]);
      setIsSearching(false);
    }, 1000);
  };

  const handleAddToWishlist = async (place: SearchResult) => {
    // TODO: Implement add to wishlist functionality
    console.log('Adding to wishlist:', place);
    onPlaceAdded?.();
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

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-gray-900">Quick Add Place</h3>
        </div>
        
        <div className="flex space-x-2">
          <Input
            placeholder="Search for places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            size="sm"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Popular Suggestions */}
      {!searchResults.length && !isSearching && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
            Popular Places
          </h4>
          
          <div className="space-y-2">
            {[
              { name: 'Times Square', category: 'Landmark' },
              { name: 'Brooklyn Bridge', category: 'Bridge' },
              { name: 'High Line', category: 'Park' }
            ].map((place, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start p-2 h-auto"
                onClick={() => setSearchQuery(place.name)}
              >
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                <div className="text-left">
                  <div className="text-sm font-medium">{place.name}</div>
                  <div className="text-xs text-gray-500">{place.category}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Searching...</span>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
            Search Results
          </h4>
          
          <div className="space-y-2">
            {searchResults.map((place) => (
              <Card key={place.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {place.name}
                      </div>
                      
                      <div className="flex items-center mt-1 space-x-2">
                        {place.rating && (
                          <div className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-500 mr-0.5" />
                            <span className="text-xs text-gray-600">
                              {place.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                        
                        <Badge variant="secondary" className="text-xs">
                          {place.category}
                        </Badge>
                        
                        {getPriceLevelDisplay(place.price_level) && (
                          <span className="text-xs text-gray-500">
                            {getPriceLevelDisplay(place.price_level)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="truncate">{place.address}</span>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => handleAddToWishlist(place)}
                      className="ml-2 shrink-0"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {!isSearching && searchResults.length === 0 && searchQuery && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
            No Results Found
          </h4>
          <p className="text-sm text-gray-500">
            Try searching for restaurants, attractions, or landmarks in your destination.
          </p>
        </div>
      )}
    </div>
  );
}