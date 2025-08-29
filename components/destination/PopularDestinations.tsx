"use client";

import { motion } from "framer-motion";
import { MapPin, Star, TrendingUp } from "lucide-react";
import DestinationCard from "@/components/card/destination/DestinationCard";

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

interface PopularDestinationsProps {
  onDestinationSelect: (destination: Destination) => void;
  selectedDestination?: Destination | null;
}

// Popular destinations data - in a real app, this would come from an API
const popularDestinations: Destination[] = [
  {
    id: "paris",
    name: "Paris",
    city: "Paris",
    country: "France",
    formatted_address: "Paris, France",
    place_id: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
    coordinates: { lat: 48.8566, lng: 2.3522 },
    timezone: "Europe/Paris",
    photos: ["/destinations/paris.jpg"],
    description: "The City of Light, known for its art, fashion, and romance"
  },
  {
    id: "tokyo",
    name: "Tokyo",
    city: "Tokyo",
    country: "Japan",
    formatted_address: "Tokyo, Japan",
    place_id: "ChIJ51cu8IcbXWARiRtXIothAS4",
    coordinates: { lat: 35.6762, lng: 139.6503 },
    timezone: "Asia/Tokyo",
    photos: ["/destinations/tokyo.jpg"],
    description: "Modern metropolis blending tradition with cutting-edge technology"
  },
  {
    id: "london",
    name: "London",
    city: "London",
    country: "United Kingdom",
    formatted_address: "London, UK",
    place_id: "ChIJdd4hrwug2EcRmSrV3Vo6llI",
    coordinates: { lat: 51.5074, lng: -0.1278 },
    timezone: "Europe/London",
    photos: ["/destinations/london.jpg"],
    description: "Historic capital with royal palaces, museums, and iconic landmarks"
  },
  {
    id: "new-york",
    name: "New York",
    city: "New York",
    country: "United States",
    formatted_address: "New York, NY, USA",
    place_id: "ChIJOwg_06VPwokRYv534QaPC8g",
    coordinates: { lat: 40.7128, lng: -74.0060 },
    timezone: "America/New_York",
    photos: ["/destinations/new-york.jpg"],
    description: "The city that never sleeps, home to Broadway and Central Park"
  },
  {
    id: "rome",
    name: "Rome",
    city: "Rome",
    country: "Italy",
    formatted_address: "Rome, Italy",
    place_id: "ChIJu46S-ZZhLxMROG5lkwZ3D7k",
    coordinates: { lat: 41.9028, lng: 12.4964 },
    timezone: "Europe/Rome",
    photos: ["/destinations/rome.jpg"],
    description: "The Eternal City with ancient history and incredible cuisine"
  },
  {
    id: "barcelona",
    name: "Barcelona",
    city: "Barcelona",
    country: "Spain",
    formatted_address: "Barcelona, Spain",
    place_id: "ChIJ5TCOcRaYpBIRCmZHTz37sEQ",
    coordinates: { lat: 41.3851, lng: 2.1734 },
    timezone: "Europe/Madrid",
    photos: ["/destinations/barcelona.jpg"],
    description: "Vibrant city with stunning architecture and Mediterranean charm"
  },
  {
    id: "sydney",
    name: "Sydney",
    city: "Sydney",
    country: "Australia",
    formatted_address: "Sydney NSW, Australia",
    place_id: "ChIJP3Sa8ziYEmsRUKgyFmh9AQM",
    coordinates: { lat: -33.8688, lng: 151.2093 },
    timezone: "Australia/Sydney",
    photos: ["/destinations/sydney.jpg"],
    description: "Harbor city with iconic Opera House and beautiful beaches"
  },
  {
    id: "dubai",
    name: "Dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    formatted_address: "Dubai, UAE",
    place_id: "ChIJRcbZaklDXz4RYlEphFBu5r0",
    coordinates: { lat: 25.2048, lng: 55.2708 },
    timezone: "Asia/Dubai",
    photos: ["/destinations/dubai.jpg"],
    description: "Futuristic city with luxury shopping and stunning architecture"
  }
];

const categories = [
  {
    id: "trending",
    name: "Trending Now",
    icon: <TrendingUp className="h-4 w-4" />,
    destinations: popularDestinations.slice(0, 4)
  },
  {
    id: "popular",
    name: "Most Popular",
    icon: <Star className="h-4 w-4" />,
    destinations: popularDestinations.slice(2, 6)
  },
  {
    id: "recommended",
    name: "Recommended for You",
    icon: <MapPin className="h-4 w-4" />,
    destinations: popularDestinations.slice(4, 8)
  }
];

export default function PopularDestinations({ 
  onDestinationSelect, 
  selectedDestination 
}: PopularDestinationsProps) {
  return (
    <div className="p-4 space-y-6">
      {categories.slice(0, 2).map((category, categoryIndex) => (
        <motion.div
          key={category.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: categoryIndex * 0.1 }}
        >
          <div className="flex items-center space-x-2 mb-3">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <div className="text-blue-600">
                {category.icon}
              </div>
            </div>
            <h3 className="text-base font-semibold text-gray-900">{category.name}</h3>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {category.destinations.slice(0, 4).map((destination, index) => (
              <motion.div
                key={destination.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: (categoryIndex * 0.1) + (index * 0.05) }}
              >
                <DestinationCard
                  destination={destination}
                  onClick={() => onDestinationSelect(destination)}
                  isSelected={selectedDestination?.id === destination.id}
                  size="small"
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-center"
      >
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Don&apos;t see your destination?
        </h3>
        <p className="text-xs text-gray-600 mb-3">
          Search from over 195 countries and thousands of cities worldwide
        </p>
        <div className="inline-flex items-center text-blue-600 text-xs font-medium">
          <MapPin className="h-3 w-3 mr-1" />
          195 countries available
        </div>
      </motion.div>
    </div>
  );
}