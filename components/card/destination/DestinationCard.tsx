"use client";

import { motion } from "framer-motion";
import { MapPin, Clock, Users, Star } from "lucide-react";
import Image from "next/image";
import { getDestinationStockImageUrl } from "@/utils/images/destinationImages";

interface Destination {
  id: string;
  name: string;
  country: string;
  city: string;
  formatted_address: string;
  place_id: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timezone: string;
  photos?: string[];
  description?: string;
}

interface DestinationCardProps {
  destination: Destination;
  onClick: () => void;
  isSelected?: boolean;
  size?: "small" | "medium" | "large";
}

// Mock data for demonstration
const destinationStats: Record<string, { rating: number; timeToVisit: string }> = {
  "paris": { rating: 4.8, timeToVisit: "3-5 days" },
  "tokyo": { rating: 4.9, timeToVisit: "4-7 days" },
  "london": { rating: 4.7, timeToVisit: "3-5 days" },
  "new-york": { rating: 4.6, timeToVisit: "3-6 days" },
  "rome": { rating: 4.8, timeToVisit: "2-4 days" },
  "barcelona": { rating: 4.7, timeToVisit: "2-4 days" },
  "sydney": { rating: 4.8, timeToVisit: "3-5 days" },
  "dubai": { rating: 4.6, timeToVisit: "2-4 days" }
};

export default function DestinationCard({ 
  destination, 
  onClick, 
  isSelected = false,
  size = "medium" 
}: DestinationCardProps) {
  const stats = destinationStats[destination.id] || { travelers: "500K+", rating: 4.5, timeToVisit: "3-5 days" };
  const stockImageUrl = getDestinationStockImageUrl(
    { id: destination.id, city: destination.city, country: destination.country },
    { width: 400, height: 300 }
  );
  
  const sizeClasses = {
    small: "h-20",
    medium: "h-40", 
    large: "h-48"
  };

  return (
    <motion.button
      onClick={onClick}
      className={`relative w-full ${sizeClasses[size]} rounded-lg overflow-hidden group cursor-pointer transition-all duration-300 ${
        isSelected 
          ? "ring-2 ring-blue-500 shadow-lg bg-white border border-blue-200" 
          : "bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md"
      }`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      {size === 'small' ? (
        // Small card design - minimal with image background
        <div className="relative h-full w-full">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={stockImageUrl}
              alt={destination.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => {}}
            />
            {/* Dim overlay for text readability */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300"></div>
          </div>
          
          {/* Content */}
          <div className="relative h-full flex flex-col justify-center items-center text-white p-2">
            <h3 className="text-xs font-semibold text-center truncate w-full">{destination.name}</h3>
            <div className="flex items-center text-xs text-white/90 mt-1">
              <MapPin className="h-2 w-2 mr-1" />
              <span className="truncate">{destination.country}</span>
            </div>
          </div>

          {/* Selection Indicator */}
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
            >
              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </motion.div>
          )}
        </div>
      ) : (
        // Medium/Large card design
        <div className="h-full flex flex-col">
          {/* Image Section */}
          <div className="relative h-2/3">
            <Image
              src={stockImageUrl}
              alt={destination.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => {}}
            />
            {/* Rating Badge */}
            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span className="text-xs font-medium text-gray-800">{stats.rating}</span>
            </div>
          </div>
          
          {/* Content Section */}
          <div className="h-1/3 p-3 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 truncate text-sm">{destination.name}</h3>
              <div className="flex items-center text-gray-500 text-xs mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                <span className="truncate">{destination.country}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {stats.timeToVisit}
              </div>
            </div>
          </div>

          {/* Selection Indicator */}
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
            >
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </motion.div>
          )}
        </div>
      )}
    </motion.button>
  );
}
