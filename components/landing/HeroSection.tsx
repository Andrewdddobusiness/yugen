"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plane, Plus, Play, Loader2, ArrowRight, MapPin, Calendar, Heart } from "lucide-react";
import PopUpCreateItinerary from "@/components/popUp/popUpCreateItinerary";
import { motion } from "framer-motion";

interface HeroSectionProps {
  user: any;
  isUserLoading: boolean;
}

export default function HeroSection({ user, isUserLoading }: HeroSectionProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
      </div>

      {/* Floating Elements */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -12 }}
        animate={{ opacity: 1, y: 0, rotate: -12 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute top-20 left-10 lg:left-20 hidden md:block"
      >
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Paris, France</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">3 days • 12 places</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20, rotate: 8 }}
        animate={{ opacity: 1, y: 0, rotate: 8 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="absolute top-32 right-10 lg:right-20 hidden md:block"
      >
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Day 2</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">Louvre Museum</div>
          <div className="text-xs text-gray-500">9:00 AM - 12:00 PM</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -5 }}
        animate={{ opacity: 1, y: 0, rotate: -5 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="absolute bottom-32 left-16 hidden lg:block"
      >
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-500 fill-current" />
            <span className="text-sm font-medium text-gray-700">Wishlist</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">8 saved places</div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Plan Your Perfect Trip
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Like a Pro
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            The only travel planner that brings together
            <span className="font-semibold text-blue-600"> destination discovery</span>,
            <span className="font-semibold text-green-600"> wishlist building</span>, and
            <span className="font-semibold text-purple-600"> drag-and-drop scheduling</span>
            in one beautiful app.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
        >
          {isUserLoading ? (
            <Button size="lg" className="text-lg rounded-xl px-8 py-4 bg-blue-600 hover:bg-blue-700" disabled>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading...
            </Button>
          ) : user ? (
            <PopUpCreateItinerary>
              <Button
                size="lg"
                className="text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 py-4 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <Plus className="h-5 w-5 mr-2" />
                Start Planning Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </PopUpCreateItinerary>
          ) : (
            <Link href="/signUp">
              <Button
                size="lg"
                className="text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 py-4 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <Plane className="h-5 w-5 mr-2" />
                Start Planning Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          )}

          <Button
            variant="outline"
            size="lg"
            className="text-lg rounded-xl px-8 py-4 border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600 transition-all duration-300"
            onClick={() => setIsVideoPlaying(true)}
          >
            <Play className="h-5 w-5 mr-2" />
            See How It Works
          </Button>
        </motion.div>

        {/* Hero Image/Demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="relative max-w-5xl mx-auto"
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

            {/* Demo Image */}
            <div className="relative aspect-video bg-gradient-to-br from-blue-50 to-indigo-100">
              <Image
                src="/popup-itinerary-builder.jpg"
                alt="Journey App Demo - Travel Itinerary Planner"
                fill
                className="object-cover"
                priority
              />

              {/* Play Button Overlay */}
              {!isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <button
                    onClick={() => setIsVideoPlaying(true)}
                    className="bg-white/90 backdrop-blur-sm rounded-full p-6 hover:bg-white transition-all duration-300 hover:scale-110 shadow-xl"
                  >
                    <Play className="h-8 w-8 text-blue-600 ml-1" fill="currentColor" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Floating Stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 2.0 }}
            className="absolute -bottom-6 left-4 bg-white rounded-xl shadow-lg p-4 border border-gray-200 hidden lg:block"
          >
            <div className="text-2xl font-bold text-blue-600">50K+</div>
            <div className="text-sm text-gray-600">Trips Planned</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 2.2 }}
            className="absolute -bottom-6 right-4 bg-white rounded-xl shadow-lg p-4 border border-gray-200 hidden lg:block"
          >
            <div className="text-2xl font-bold text-green-600">4.9★</div>
            <div className="text-sm text-gray-600">User Rating</div>
          </motion.div>
        </motion.div>
      </div>

      {/* Video Modal */}
      {isVideoPlaying && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full aspect-video bg-black rounded-xl overflow-hidden">
            <button
              onClick={() => setIsVideoPlaying(false)}
              className="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
            >
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Replace with actual video */}
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <p className="text-white text-xl">Demo Video Coming Soon</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
