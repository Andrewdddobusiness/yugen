"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Travel Blogger",
    location: "San Francisco, CA",
    avatar: "/testimonials/sarah.jpg",
    rating: 5,
    text: "Journey completely transformed how I plan my trips. The drag-and-drop calendar is so intuitive - it's like having Google Calendar for travel planning. I saved 10+ hours on my last Europe trip.",
    trip: "3-week Europe Adventure",
    highlight: "Saved 10+ hours"
  },
  {
    id: 2,
    name: "Michael Rodriguez",
    role: "Software Engineer",
    location: "Austin, TX",
    avatar: "/testimonials/michael.jpg", 
    rating: 5,
    text: "As someone who loves detailed planning, Journey is perfect. The area search helped me discover hidden gems in Tokyo that I never would have found otherwise. The export features are incredibly useful.",
    trip: "2-week Japan Discovery",
    highlight: "Found hidden gems"
  },
  {
    id: 3,
    name: "Emma Thompson",
    role: "Marketing Manager",
    location: "London, UK",
    avatar: "/testimonials/emma.jpg",
    rating: 5,
    text: "Planning our family vacation used to be stressful, but Journey made it enjoyable. The wishlist feature let everyone contribute ideas, and organizing everything was so smooth.",
    trip: "Family Trip to Thailand",
    highlight: "Made planning enjoyable"
  }
];

const stats = [
  { number: "50K+", label: "Trips Planned" },
  { number: "4.9", label: "Average Rating", suffix: "★" },
  { number: "95%", label: "Would Recommend" },
  { number: "2M+", label: "Places Discovered" }
];

export default function TestimonialsSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

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
            Loved by
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Travel Enthusiasts
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join thousands of travelers who've discovered the joy of stress-free trip planning
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16"
        >
          {stats.map((stat, index) => (
            <div key={stat.label} className="text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0.5 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2"
              >
                {stat.number}{stat.suffix}
              </motion.div>
              <div className="text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 relative hover:shadow-xl transition-all duration-300"
            >
              {/* Quote Icon */}
              <div className="absolute -top-4 left-8">
                <div className="bg-blue-600 rounded-full p-3">
                  <Quote className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center mb-6 mt-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Testimonial Text */}
              <blockquote className="text-gray-700 leading-relaxed mb-6">
                "{testimonial.text}"
              </blockquote>

              {/* Trip Info */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="text-sm font-semibold text-blue-900 mb-1">
                  {testimonial.trip}
                </div>
                <div className="text-sm text-blue-600">
                  ✨ {testimonial.highlight}
                </div>
              </div>

              {/* Author */}
              <div className="flex items-center">
                <div className="relative w-12 h-12 rounded-full bg-gray-200 mr-4 overflow-hidden">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                    onError={() => {
                      // Fallback to initials if image fails
                    }}
                  />
                  {/* Fallback initials */}
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-600 text-white font-semibold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                  <div className="text-sm text-gray-500">{testimonial.location}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 30 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Join the Journey Community?
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Start planning your next adventure with the tool that's already helped 50,000+ travelers create unforgettable trips.
            </p>
            <button className="bg-white text-blue-600 font-semibold px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors duration-300">
              Start Planning Free
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}