"use client";

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Heart, Loader2, Plus, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useWishlistStore } from '@/store/wishlistStore';
import { addToUserWishlist, removeFromUserWishlist } from '@/actions/supabase/userWishlist';
import { useWishlist } from '@/hooks/useWishlist';
import { cn } from '@/components/lib/utils';

interface SavePlaceButtonProps {
  placeId: string;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
  onSaved?: () => void;
  onRemoved?: () => void;
}

export default function SavePlaceButton({
  placeId,
  variant = 'icon',
  size = 'md',
  className = "",
  showText = false,
  onSaved,
  onRemoved
}: SavePlaceButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Use wishlist hook for state synchronization
  const { invalidate: invalidateWishlist } = useWishlist();

  const {
    isInWishlist,
    getItemByPlaceId,
    addWishlistItem,
    removeWishlistItem
  } = useWishlistStore();

  const isSaved = isInWishlist(placeId);
  const wishlistItem = getItemByPlaceId(placeId);

  // Add to wishlist mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      return await addToUserWishlist({
        place_id: placeId,
        priority: 3, // Default priority (medium)
        visit_status: 'want_to_go',
        categories: [],
        tags: []
      });
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Add to local store
        addWishlistItem({
          searchHistoryId: data.data.wishlist_id,
          placeId: placeId,
          savedAt: new Date(data.data.saved_at),
          priority: 'medium',
          categories: data.data.categories || [],
          notes: data.data.notes,
          tags: data.data.tags,
          visitStatus: data.data.visit_status as 'want_to_go' | 'been_there' | 'not_interested'
        });

        // Invalidate wishlist query to refetch latest data
        invalidateWishlist();

        onSaved?.();
      }
    },
    onError: (error) => {
      console.error('Failed to add to wishlist:', error);
    }
  });

  // Remove from wishlist mutation
  const removeMutation = useMutation({
    mutationFn: async () => {
      return await removeFromUserWishlist(placeId);
    },
    onSuccess: (data) => {
      if (data.success && wishlistItem) {
        // Remove from local store
        removeWishlistItem(wishlistItem.searchHistoryId);

        // Invalidate wishlist query
        invalidateWishlist();

        onRemoved?.();
      }
    },
    onError: (error) => {
      console.error('Failed to remove from wishlist:', error);
    }
  });

  const isLoading = addMutation.isPending || removeMutation.isPending;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    if (isSaved) {
      removeMutation.mutate();
    } else {
      addMutation.mutate();
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'h-3 w-3';
      case 'lg': return 'h-5 w-5';
      default: return 'h-4 w-4';
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'sm';
      case 'lg': return 'lg';
      default: return 'default';
    }
  };

  if (variant === 'button') {
    return (
      <Button
        variant={isSaved ? "default" : "outline"}
        size={getButtonSize()}
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "flex items-center space-x-2",
          isSaved && "bg-red-600 hover:bg-red-700 text-white",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isLoading ? (
          <Loader2 className={cn("animate-spin", getIconSize())} />
        ) : isSaved ? (
          <>
            <Check className={getIconSize()} />
            {showText && <span>{isHovered ? 'Remove' : 'Saved'}</span>}
          </>
        ) : (
          <>
            <Plus className={getIconSize()} />
            {showText && <span>Save</span>}
          </>
        )}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            disabled={isLoading}
            className={cn(
              "rounded-full transition-all duration-200",
              size === 'sm' && "h-7 w-7 p-0",
              size === 'lg' && "h-10 w-10 p-0",
              size === 'md' && "h-8 w-8 p-0",
              className
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {isLoading ? (
              <Loader2 className={cn("animate-spin", getIconSize())} />
            ) : (
              <Heart
                className={cn(
                  getIconSize(),
                  "transition-all duration-200",
                  isSaved 
                    ? "text-red-500 fill-red-500" 
                    : "text-gray-400 hover:text-red-500",
                  isHovered && !isSaved && "scale-110"
                )}
              />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isLoading 
              ? (isSaved ? 'Removing...' : 'Saving...') 
              : (isSaved ? 'Remove from wishlist' : 'Save to wishlist')
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}