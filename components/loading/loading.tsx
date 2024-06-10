"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "@/components/loading/loadingSpinner";

export default function Loading() {
  const textOptions = [
    "Create itineraries with ease.",
    "You can always update your itineraries later.",
    "Share your itineraries with your buddies.",
  ];

  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % textOptions.length);
    }, 3000); // Change text every 3 seconds
    return () => clearInterval(interval);
  }, [textOptions.length]);

  return (
    <div className="flex flex-col justify-center items-center w-full h-screen gap-4">
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop" }}
        className="flex flex-col justify-center items-center w-10 h-10"
      >
        <Image
          src="/smile.svg"
          alt="smile"
          width={50}
          height={50}
          className="w-12 h-12"
        />
      </motion.div>
      <div className="text-sm text-zinc-500 h-6 flex items-center justify-center">
        <AnimatePresence>
          <motion.div
            key={currentTextIndex}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
            className="absolute"
          >
            {textOptions[currentTextIndex]}
          </motion.div>
        </AnimatePresence>
      </div>
      <LoadingSpinner />
    </div>
  );
}
