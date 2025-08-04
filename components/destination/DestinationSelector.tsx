"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, Clock, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import DestinationSearch from "./DestinationSearch";
import PopularDestinations from "./PopularDestinations";
import DestinationPreview from "./DestinationPreview";

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

interface DestinationSelectorProps {
  onDestinationSelect: (destination: Destination) => void;
  onClose: () => void;
  initialDestination?: Destination | null;
}

export default function DestinationSelector({ 
  onDestinationSelect, 
  onClose, 
  initialDestination 
}: DestinationSelectorProps) {
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(
    initialDestination || null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  const handleDestinationClick = (destination: Destination) => {
    setSelectedDestination(destination);
    setShowPreview(true);
  };

  const handleConfirmDestination = () => {
    if (selectedDestination) {
      onDestinationSelect(selectedDestination);
      onClose();
    }
  };

  const handleBackToSelection = () => {
    setShowPreview(false);
    setSearchMode(false);
  };

  return (
    <div className="relative h-full flex flex-col max-h-[650px] overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex flex-col p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center mb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Choose Your Destination</h2>
              <p className="text-xs text-gray-500">Step 1 of 3 • Where would you like to go?</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-blue-600 h-1.5 rounded-full w-1/3 transition-all duration-300"></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {showPreview && selectedDestination ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <DestinationPreview
                destination={selectedDestination}
                onBack={handleBackToSelection}
                onConfirm={handleConfirmDestination}
              />
            </motion.div>
          ) : searchMode ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <DestinationSearch
                onDestinationSelect={handleDestinationClick}
                onBack={() => setSearchMode(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full flex flex-col min-h-0"
            >
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setSearchMode(true)}
                  className="w-full justify-start text-gray-500 h-10 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                >
                  <Search className="h-4 w-4 mr-3" />
                  Search for a destination...
                </Button>
              </div>

              {/* Popular Destinations */}
              <div className="flex-1 overflow-auto min-h-0 pb-4 rounded-b-xl">
                <PopularDestinations
                  onDestinationSelect={handleDestinationClick}
                  selectedDestination={selectedDestination}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}