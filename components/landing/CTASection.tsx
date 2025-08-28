"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, Globe } from "lucide-react";
import Image from "next/image";

const features = [
  {
    icon: <Sparkles className="h-6 w-6" />,
    text: "AI-powered recommendations"
  },
  {
    icon: <Users className="h-6 w-6" />,
    text: "Collaborative planning"
  },
  {
    icon: <Globe className="h-6 w-6" />,
    text: "Worldwide destinations"
  }
];

export default function CTASection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden" ref={sectionRef}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')]"></div>
      </div>

      {/* Floating Elements */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -12 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20, rotate: isInView ? -12 : -12 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="absolute top-20 left-10 lg:left-20 hidden md:block"
      >
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="text-white text-sm font-medium">Paris, France</div>
          <div className="text-white/70 text-xs">Next adventure awaits</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20, rotate: 8 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20, rotate: isInView ? 8 : 8 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="absolute top-32 right-10 lg:right-20 hidden md:block"
      >
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="text-white text-sm font-medium">Tokyo, Japan</div>
          <div className="text-white/70 text-xs">14 days planned</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -5 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20, rotate: isInView ? -5 : -5 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="absolute bottom-32 left-16 hidden lg:block"
      >
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="text-white text-sm font-medium">Bali, Indonesia</div>
          <div className="text-white/70 text-xs">Ready to explore</div>
        </div>
      </motion.div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main CTA Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Start Your Next
            <br />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Adventure Today
            </span>
          </h2>
          
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Join over 50,000 travelers who&apos;ve discovered the joy of stress-free trip planning. 
            Your perfect itinerary is just a few clicks away.
          </p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 mb-8"
          >
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20"
              >
                <div className="text-yellow-400">{feature.icon}</div>
                <span className="text-white text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Button
              size="lg"
              className="text-lg bg-white text-blue-600 hover:bg-gray-50 rounded-xl px-8 py-4 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl font-semibold"
            >
              Start Planning Free
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="text-lg border-2 border-white/30 text-white hover:bg-white/10 rounded-xl px-8 py-4 backdrop-blur-sm transition-all duration-300"
            >
              Watch Demo
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8 text-blue-100"
          >
            <div className="flex items-center space-x-2">
              <div className="text-2xl">✓</div>
              <span className="text-sm">Free 14-day trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-2xl">✓</div>
              <span className="text-sm">No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-2xl">✓</div>
              <span className="text-sm">Cancel anytime</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-16 pt-8 border-t border-white/20"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">50K+</div>
              <div className="text-blue-200 text-sm">Happy Travelers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">2M+</div>
              <div className="text-blue-200 text-sm">Places Discovered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">4.9★</div>
              <div className="text-blue-200 text-sm">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">195</div>
              <div className="text-blue-200 text-sm">Countries Covered</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
    </section>
  );
}