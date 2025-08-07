"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Heart, 
  Search, 
  Filter, 
  X,
  ChevronDown,
  ChevronRight,
  MapPin,
  Star,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { useWishlistStore, type WishlistItem } from '@/store/wishlistStore';
import { useWishlist } from '@/hooks/useWishlist';
import { cn } from '@/components/lib/utils';
import WishlistCategories from './WishlistCategories';
import PlaceNotes from './PlaceNotes';

interface WishlistPanelProps {
  className?: string;
  onPlaceSelect?: (item: WishlistItem) => void;
  isCollapsed?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  'restaurant': '🍴 Restaurants',
  'tourist_attraction': '🏛️ Attractions',
  'shopping_mall': '🛍️ Shopping',
  'lodging': '🏨 Hotels',
  'museum': '🎭 Museums',
  'park': '🌳 Parks',
  'church': '⛪ Religious Sites',
  'night_club': '🌙 Nightlife',
  'food': '🍽️ Food & Dining',
  'entertainment': '🎪 Entertainment',
  'shopping': '🛒 Shopping',
  'transportation': '🚇 Transportation',
  'health': '🏥 Health & Wellness',
  'education': '🎓 Education',
  'government': '🏛️ Government',
  'finance': '🏦 Finance',
  'beauty_salon': '💄 Beauty & Spa',
  'gym': '💪 Fitness',
  'library': '📚 Library',
  'hospital': '🏥 Hospital'
};

export default function WishlistPanel({ 
  className = "",
  onPlaceSelect,
  isCollapsed = false
}: WishlistPanelProps) {
  const { itineraryId, destinationId } = useParams();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(!isCollapsed);
  const [showFilters, setShowFilters] = useState(false);

  const {
    wishlistItems,
    selectedCategory,
    selectedPriority,
    searchQuery,
    isLoading,
    setSelectedCategory,
    setSelectedPriority,
    setSearchQuery,
    getFilteredItems,
    getWishlistCount,
    getCategoryCounts,
    removeWishlistItem
  } = useWishlistStore();

  // Remove useWishlist from here to prevent multiple instances

  const filteredItems = getFilteredItems();
  const categoryCounts = getCategoryCounts();
  const wishlistCount = getWishlistCount();

  const handleRemoveItem = async (item: WishlistItem) => {
    try {
      // The actual removal will be handled by the SavePlaceButton component
      // This is just for UI feedback
      removeWishlistItem(item.searchHistoryId);
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  };

  const formatRating = (rating: number) => (
    <div className="flex items-center space-x-1">
      <Star className="h-3 w-3 text-yellow-400 fill-current" />
      <span className="text-xs font-medium">{rating.toFixed(1)}</span>
    </div>
  );

  const formatTypes = (types: string[]) => {
    return types
      .filter(type => !type.includes('establishment') && !type.includes('point_of_interest'))
      .slice(0, 2)
      .map(type => type.replace(/_/g, ' '))
      .join(', ');
  };

  if (isCollapsed && !isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className={cn("flex items-center space-x-2", className)}
      >
        <Heart className="h-4 w-4" />
        <span>Wishlist ({wishlistCount})</span>
      </Button>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border border-gray-200", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">
              Wishlist
            </h3>
            <Badge variant="secondary" className="text-xs">
              {wishlistCount}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 w-8 p-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
            
            {isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search saved places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        {/* Categories */}
        {wishlistCount > 0 && (
          <div className="mt-3">
            <WishlistCategories
              categories={categoryCounts}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 space-y-2">

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Priority
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            {(selectedCategory || selectedPriority || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedPriority('');
                  setSearchQuery('');
                }}
                className="w-full h-8 text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Wishlist Items */}
      <ScrollArea className="h-[400px]">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">
                {wishlistCount === 0 ? 'No places saved yet' : 'No places match your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item.placeId}
                  className="group bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors cursor-pointer"
                  onClick={() => onPlaceSelect?.(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {item.activity?.name}
                      </h4>
                      
                      {item.activity?.address && (
                        <div className="flex items-center space-x-1 mt-1">
                          <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <p className="text-xs text-gray-600 truncate">
                            {item.activity.address}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 mt-2">
                        {item.activity?.rating && formatRating(item.activity.rating)}
                        
                        {item.activity?.types && item.activity.types.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {formatTypes(item.activity.types)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mt-2">
                        {item.priority && (
                          <Badge
                            variant={
                              item.priority === 'high' ? 'destructive' :
                              item.priority === 'medium' ? 'default' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {item.priority} priority
                          </Badge>
                        )}
                        
                        {item.notes && (
                          <Badge variant="outline" className="text-xs">
                            📝 Has notes
                          </Badge>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <PlaceNotes 
                            item={item}
                            trigger={
                              <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Notes
                              </div>
                            }
                          />
                        </DropdownMenuItem>
                        {item.activity?.google_maps_url && (
                          <DropdownMenuItem asChild>
                            <a
                              href={item.activity.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View on Maps
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleRemoveItem(item);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {wishlistCount > 0 && (
        <div className="p-4 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              router.push(`/itinerary/${itineraryId}/${destinationId}/wishlist`);
            }}
          >
            Manage Wishlist
          </Button>
        </div>
      )}
    </div>
  );
}