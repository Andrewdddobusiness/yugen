"use client";

import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Users, Star, Calendar, Thermometer, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import DestinationMap from "./DestinationMap";

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

interface DestinationPreviewProps {
  destination: Destination;
  onBack: () => void;
  onConfirm: () => void;
}

// Mock data for destination details
const destinationDetails: Record<string, {
  description: string;
  highlights: string[];
  bestTime: string;
  avgTemp: string;
  currency: string;
  language: string;
  timeZone: string;
  photos: string[];
  tips: string[];
}> = {
  "paris": {
    description: "Paris, the City of Light, is the capital of France and one of the world's most romantic and culturally rich destinations. Known for its iconic landmarks like the Eiffel Tower and Louvre Museum, world-class cuisine, and charming neighborhoods.",
    highlights: ["Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral", "Champs-Élysées", "Montmartre", "Seine River"],
    bestTime: "April-June, September-October",
    avgTemp: "15°C (59°F)",
    currency: "Euro (EUR)",
    language: "French",
    timeZone: "Central European Time (UTC+1)",
    photos: ["/destinations/paris-1.jpg", "/destinations/paris-2.jpg", "/destinations/paris-3.jpg"],
    tips: ["Book museum tickets in advance", "Learn basic French phrases", "Try authentic French cuisine"]
  },
  "tokyo": {
    description: "Tokyo is a fascinating blend of ultramodern and traditional, from neon-lit skyscrapers to historic temples. Japan's capital offers incredible cuisine, cutting-edge technology, and unique cultural experiences.",
    highlights: ["Senso-ji Temple", "Tokyo Skytree", "Shibuya Crossing", "Tsukiji Fish Market", "Imperial Palace", "Harajuku"],
    bestTime: "March-May, September-November",
    avgTemp: "16°C (61°F)",
    currency: "Japanese Yen (JPY)",
    language: "Japanese",
    timeZone: "Japan Standard Time (UTC+9)",
    photos: ["/destinations/tokyo-1.jpg", "/destinations/tokyo-2.jpg", "/destinations/tokyo-3.jpg"],
    tips: ["Get a JR Pass for transportation", "Carry cash (many places don't accept cards)", "Bow when greeting people"]
  }
};

export default function DestinationPreview({ destination, onBack, onConfirm }: DestinationPreviewProps) {
  const details = destinationDetails[destination.id] || {
    description: destination.description || "A wonderful destination to explore.",
    highlights: ["Historic landmarks", "Local cuisine", "Cultural sites"],
    bestTime: "Year-round",
    avgTemp: "20°C (68°F)",
    currency: "Local currency",
    language: "Local language",
    timeZone: destination.timezone,
    photos: [],
    tips: ["Research local customs", "Pack appropriate clothing", "Try local food"]
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="p-2 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to destinations
        </Button>
        <Button
          onClick={onConfirm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          Choose {destination.name}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Hero Section */}
        <div className="relative h-64">
          <Image
            src={details.photos[0] || `/destinations/${destination.id}.jpg`}
            alt={destination.name}
            fill
            className="object-cover"
            onError={() => {}}
          />
          {/* Fallback gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600"></div>
          <div className="absolute inset-0 bg-black/30"></div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-5 w-5" />
              <span className="text-lg font-semibold">{destination.formatted_address}</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{destination.name}</h1>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span>4.8</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>2.1M travelers</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>3-5 days recommended</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">About {destination.name}</h2>
            <p className="text-gray-600 leading-relaxed">{details.description}</p>
          </div>

          {/* Key Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Info</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">Best Time to Visit</div>
                    <div className="text-gray-600">{details.bestTime}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Thermometer className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="font-medium text-gray-900">Average Temperature</div>
                    <div className="text-gray-600">{details.avgTemp}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-gray-900">Time Zone</div>
                    <div className="text-gray-600">{details.timeZone}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Local Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="font-medium text-gray-900">Currency</div>
                  <div className="text-gray-600">{details.currency}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Language</div>
                  <div className="text-gray-600">{details.language}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Attractions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Attractions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {details.highlights.map((highlight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="bg-blue-50 rounded-lg p-3 text-center"
                >
                  <div className="text-sm font-medium text-blue-900">{highlight}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Map */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
            <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
              <DestinationMap
                coordinates={destination.coordinates}
                name={destination.name}
              />
            </div>
          </div>

          {/* Travel Tips */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Tips</h3>
            <div className="bg-amber-50 rounded-lg p-4">
              <ul className="space-y-2">
                {details.tips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2 text-amber-800">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Photo Gallery */}
          {details.photos.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Gallery
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {details.photos.slice(0, 3).map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                    <Image
                      src={photo}
                      alt={`${destination.name} ${index + 1}`}
                      fill
                      className="object-cover hover:scale-110 transition-transform duration-300"
                      onError={() => {}}
                    />
                    {/* Fallback gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}