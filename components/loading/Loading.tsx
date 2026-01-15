"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import LoadingSpinner from "@/components/loading/LoadingSpinner";

export default function Loading() {
  const textOptions = [
    "Loading your itinerary…",
    "Syncing activities and time slots…",
    "Preparing exports and navigation…",
  ];

  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % textOptions.length);
    }, 3000); // Change text every 3 seconds
    return () => clearInterval(interval);
  }, [textOptions.length]);

  return (
    <div className="flex flex-col justify-center items-center w-full h-screen bg-bg-50">
      <div className="glass rounded-2xl px-7 py-6 flex flex-col items-center gap-4 max-w-sm w-[92%] text-center">
        <div className="relative w-20 h-20">
        <Image
          src="/assets/yugi-mascot-1.png"
          alt="Loading"
          fill
          priority
          sizes="80px"
          className="object-contain animate-pulse"
        />
        </div>
        <div className="text-xl font-semibold text-ink-900 font-logo">Planaway</div>
        <div className="text-sm text-ink-500 h-5">{textOptions[currentTextIndex]}</div>
        <LoadingSpinner />
      </div>
    </div>
  );
}
