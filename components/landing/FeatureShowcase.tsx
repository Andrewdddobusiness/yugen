"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { 
  MapPin, 
  Search, 
  Heart, 
  Calendar, 
  Layers3, 
  MousePointer2,
  Smartphone,
  Download,
  Share2,
  Clock
} from "lucide-react";

const features = [
  {
    id: "discovery",
    title: "Smart Discovery",
    subtitle: "Find Your Perfect Places",
    description: "Discover amazing places with our intelligent search that covers every corner of your destination.",
    icon: <Search className="h-8 w-8" />,
    color: "blue",
    items: [
      {
        title: "Map-Based Search",
        description: "Explore visually with our interactive map interface",
        icon: <MapPin className="h-5 w-5" />,
        image: "map-search"
      },
      {
        title: "Smart Recommendations",
        description: "AI-powered suggestions based on your preferences",
        icon: <Search className="h-5 w-5" />,
        image: "smart-recommendations"
      },
      {
        title: "Area Discovery",
        description: "Find hidden gems in specific neighborhoods",
        icon: <Layers3 className="h-5 w-5" />,
        image: "area-search"
      }
    ]
  },
  {
    id: "organization",
    title: "Effortless Organization",
    subtitle: "Build Your Perfect Itinerary",
    description: "Organize your trip with the same ease as using Google Calendar. Drag, drop, and perfect your schedule.",
    icon: <Calendar className="h-8 w-8" />,
    color: "green",
    items: [
      {
        title: "Drag & Drop Planning",
        description: "Intuitive calendar interface for easy scheduling",
        icon: <MousePointer2 className="h-5 w-5" />,
        image: "drag-drop"
      },
      {
        title: "Smart Time Management",
        description: "Automatic travel time calculations between activities",
        icon: <Clock className="h-5 w-5" />,
        image: "time-management"
      },
      {
        title: "Multiple Views",
        description: "Switch between calendar, list, and map views",
        icon: <Layers3 className="h-5 w-5" />,
        image: "multiple-views"
      }
    ]
  },
  {
    id: "sharing",
    title: "Share & Export",
    subtitle: "Take Your Plans Anywhere",
    description: "Export your itinerary in multiple formats or share with travel companions effortlessly.",
    icon: <Share2 className="h-8 w-8" />,
    color: "purple",
    items: [
      {
        title: "PDF Export",
        description: "Beautiful, printable itineraries for offline use",
        icon: <Download className="h-5 w-5" />,
        image: "pdf-export"
      },
      {
        title: "Mobile Sync",
        description: "Access your plans on any device, anywhere",
        icon: <Smartphone className="h-5 w-5" />,
        image: "mobile-sync"
      },
      {
        title: "Team Collaboration",
        description: "Plan together with friends and family",
        icon: <Share2 className="h-5 w-5" />,
        image: "collaboration"
      }
    ]
  }
];

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-600",
    accent: "bg-blue-600",
    gradient: "from-blue-600 to-cyan-600"
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200", 
    text: "text-green-600",
    accent: "bg-green-600",
    gradient: "from-green-600 to-emerald-600"
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-600", 
    accent: "bg-purple-600",
    gradient: "from-purple-600 to-pink-600"
  }
};

export default function FeatureShowcase() {
  const [activeFeature, setActiveFeature] = useState("discovery");
  const [activeImage, setActiveImage] = useState("map-search");
  
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const currentFeature = features.find(f => f.id === activeFeature);
  const colors = colorClasses[currentFeature?.color as keyof typeof colorClasses];

  return (
    <section className="py-24 bg-gray-50" ref={sectionRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Everything You Need to
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Plan Like a Pro
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Journey combines powerful discovery tools, intuitive organization, and seamless sharing 
            to make trip planning actually enjoyable.
          </p>
        </motion.div>

        {/* Feature Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col lg:flex-row justify-center mb-12 space-y-4 lg:space-y-0 lg:space-x-4"
        >
          {features.map((feature) => {
            const isActive = activeFeature === feature.id;
            const featureColors = colorClasses[feature.color as keyof typeof colorClasses];
            
            return (
              <button
                key={feature.id}
                onClick={() => {
                  setActiveFeature(feature.id);
                  setActiveImage(feature.items[0].image);
                }}
                className={`p-6 rounded-2xl border-2 transition-all duration-300 text-left flex-1 max-w-sm mx-auto lg:mx-0 ${
                  isActive 
                    ? `${featureColors.bg} ${featureColors.border} shadow-lg scale-105` 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className={`inline-flex p-3 rounded-xl mb-4 ${
                  isActive ? featureColors.accent : 'bg-gray-100'
                }`}>
                  <div className={isActive ? 'text-white' : 'text-gray-600'}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${
                  isActive ? featureColors.text : 'text-gray-900'
                }`}>
                  {feature.title}
                </h3>
                <p className={`text-sm ${
                  isActive ? 'text-gray-700' : 'text-gray-600'
                }`}>
                  {feature.subtitle}
                </p>
              </button>
            );
          })}
        </motion.div>

        {/* Feature Content */}
        {currentFeature && (
          <motion.div
            key={activeFeature}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            {/* Left Side - Feature Details */}
            <div className="space-y-8">
              <div>
                <h3 className={`text-3xl font-bold mb-4 bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`}>
                  {currentFeature.title}
                </h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {currentFeature.description}
                </p>
              </div>

              <div className="space-y-4">
                {currentFeature.items.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                      activeImage === item.image
                        ? `${colors.bg} ${colors.border} shadow-md`
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    onClick={() => setActiveImage(item.image)}
                    onMouseEnter={() => setActiveImage(item.image)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-2 rounded-lg ${
                        activeImage === item.image ? colors.accent : 'bg-gray-100'
                      }`}>
                        <div className={activeImage === item.image ? 'text-white' : 'text-gray-600'}>
                          {item.icon}
                        </div>
                      </div>
                      <div>
                        <h4 className={`font-semibold mb-1 ${
                          activeImage === item.image ? colors.text : 'text-gray-900'
                        }`}>
                          {item.title}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Side - Feature Image */}
            <motion.div
              key={activeImage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
                {/* Browser Chrome */}
                <div className="bg-gray-100 px-4 py-3 flex items-center space-x-2 border-b border-gray-200">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 bg-white rounded-md px-3 py-1 mx-4">
                    <span className="text-sm text-gray-500">journey.app</span>
                  </div>
                </div>
                
                {/* Feature Image */}
                <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200">
                  <Image
                    src={`/features/${activeImage}.png`}
                    alt={`${currentFeature.title} Feature`}
                    fill
                    className="object-cover transition-all duration-500"
                    onError={() => {
                      // Fallback to placeholder if image doesn't exist
                    }}
                  />
                  
                  {/* Overlay gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-10`}></div>
                </div>
              </div>

              {/* Floating Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className={`absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg p-4 border-2 ${colors.border}`}
              >
                <div className={`text-2xl font-bold ${colors.text}`}>
                  {activeFeature === 'discovery' && '1000+'}
                  {activeFeature === 'organization' && '⚡️'}
                  {activeFeature === 'sharing' && '📱'}
                </div>
                <div className="text-sm text-gray-600">
                  {activeFeature === 'discovery' && 'Places'}
                  {activeFeature === 'organization' && 'Fast'}
                  {activeFeature === 'sharing' && 'Formats'}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
}