"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Plane, Plus, Play, Loader2, ArrowRight, MapPin, Calendar, Heart } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  user: any;
  isUserLoading: boolean;
}

const PopUpCreateItinerary = dynamic(() => import("@/components/dialog/itinerary/CreateItineraryDialog"), {
  ssr: false,
  loading: () => (
    <Button size="lg" className="text-lg px-8 py-4 shadow-pressable" disabled>
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      Loading...
    </Button>
  ),
});

export default function HeroSection({ user, isUserLoading }: HeroSectionProps) {
  const SHOW_DEMO_VIDEO = false;
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Prefetch the create-itinerary dialog chunk so the CTA feels instant.
    const preload = () => {
      void import("@/components/dialog/itinerary/CreateItineraryDialog");
    };

    if (typeof window === "undefined") return;
    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(preload, { timeout: 1000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }

    const id: ReturnType<typeof setTimeout> = setTimeout(preload, 0);
    return () => clearTimeout(id);
  }, [user]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-bg-50 via-white to-bg-100">
        <div className="absolute inset-0 route-pattern" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/10 via-white to-bg-50" />
      </div>

      {/* Floating Elements */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -12 }}
        animate={{ opacity: 1, y: 0, rotate: -12 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute top-20 left-10 lg:left-20 hidden md:block"
      >
        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-teal-500" />
            <span className="text-sm font-medium text-ink-700">Paris, France</span>
          </div>
          <div className="mt-2 text-xs text-ink-500">3 days • 12 places</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20, rotate: 8 }}
        animate={{ opacity: 1, y: 0, rotate: 8 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="absolute top-32 right-10 lg:right-20 hidden md:block"
      >
        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-brand-500" />
            <span className="text-sm font-medium text-ink-700">Day 2</span>
          </div>
          <div className="mt-2 text-xs text-ink-500">Louvre Museum</div>
          <div className="text-xs text-ink-500">9:00 AM - 12:00 PM</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -5 }}
        animate={{ opacity: 1, y: 0, rotate: -5 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="absolute bottom-32 left-16 hidden lg:block"
      >
        <div className="glass rounded-2xl p-4 shadow-card">
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-coral-500 fill-current" />
            <span className="text-sm font-medium text-ink-700">Wishlist</span>
          </div>
          <div className="mt-2 text-xs text-ink-500">8 saved places</div>
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
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-ink-900 mb-4 leading-tight font-logo">
            Plan every day with precision.
          </h1>

          <p className="text-xl sm:text-2xl text-ink-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            Drag activities onto a calendar, keep backup options for uncertain slots, see hours/closures before you commit,
            collaborate live, and export or navigate on mobile.
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
          <Button size="lg" className="text-lg px-8 py-4 shadow-pressable" disabled>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading...
          </Button>
          ) : user ? (
            <PopUpCreateItinerary>
                <Button size="lg" className="text-lg px-8 py-4 shadow-pressable hover:-translate-y-0">
                <Plus className="h-5 w-5 mr-2" />
                Start planning with Planaway
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </PopUpCreateItinerary>
          ) : (
            <Link href="/signUp">
              <Button size="lg" className="text-lg px-8 py-4 shadow-pressable">
                <Plane className="h-5 w-5 mr-2" />
                Start planning with Planaway
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          )}

          {SHOW_DEMO_VIDEO && (
            <Button
              variant="secondary"
              size="lg"
              className="text-lg px-8 py-4 border border-stroke-200 text-brand-700 hover:bg-white/80"
              onClick={() => setIsVideoPlaying(true)}
            >
              <Play className="h-5 w-5 mr-2" />
              See how it works
            </Button>
          )}
        </motion.div>

        {/* Hero Image/Demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="relative rounded-[20px] overflow-hidden shadow-float border border-stroke-200/70 bg-white">
            {/* Browser Chrome */}
            <div className="bg-bg-100 px-4 py-3 flex items-center space-x-2 border-b border-stroke-200/70">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-coral-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-lime-500"></div>
              </div>
              <div className="flex-1 bg-white rounded-md px-3 py-1 mx-4 shadow-inner">
                <span className="text-sm text-ink-500">planaway.website</span>
              </div>
            </div>

            {/* Demo Image */}
            <div className="relative aspect-video bg-gradient-to-br from-brand-300/20 via-white to-teal-500/10">
              <Image
                src="/popup-itinerary-builder.jpg"
                alt="Planaway App Demo - Soft Navigator Travel Planner"
                fill
                className="object-cover"
                priority
              />

              {/* Play Button Overlay */}
              {SHOW_DEMO_VIDEO && !isVideoPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <button
                    onClick={() => setIsVideoPlaying(true)}
                    className="bg-white/90 backdrop-blur-sm rounded-full p-6 hover:bg-white transition-all duration-300 hover:scale-110 shadow-float"
                  >
                    <Play className="h-8 w-8 text-brand-500 ml-1" fill="currentColor" />
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
            className="absolute -bottom-6 left-4 glass rounded-xl p-4 hidden lg:block"
          >
            <div className="text-2xl font-bold text-brand-500">50K+</div>
            <div className="text-sm text-ink-600">Trips planned</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 2.2 }}
            className="absolute -bottom-6 right-4 glass rounded-xl p-4 hidden lg:block"
          >
            <div className="text-2xl font-bold text-teal-500">4.9★</div>
            <div className="text-sm text-ink-600">User rating</div>
          </motion.div>
        </motion.div>
      </div>

      {/* Video Modal */}
      {SHOW_DEMO_VIDEO && isVideoPlaying && (
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
