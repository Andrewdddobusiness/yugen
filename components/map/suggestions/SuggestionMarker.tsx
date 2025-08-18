"use client";

import React from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { Plus, Sparkles } from 'lucide-react';
import type { SuggestionMarkerProps } from './types';

/**
 * Individual marker component for map suggestions
 * Displays a purple sparkle marker with add indicator
 */
export function SuggestionMarker({ suggestion, onClick }: SuggestionMarkerProps) {
  return (
    <AdvancedMarker
      position={suggestion.geometry.location}
      onClick={onClick}
      className="cursor-pointer transform transition-transform hover:scale-110"
    >
      <div className="relative">
        {/* Main marker with gradient */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        
        {/* Add indicator badge */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-xs">
          <Plus className="h-2 w-2 text-yellow-800" />
        </div>
      </div>
    </AdvancedMarker>
  );
}