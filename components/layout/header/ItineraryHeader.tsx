"use client";

import React from "react";

interface ItineraryHeaderProps {
  itineraryName: string;
  destination: string;
  dateRange: { from: Date; to: Date };
  onNameChange: (name: string) => void;
  onDateChange: (dates: { from: Date; to: Date }) => void;
}

export default function ItineraryHeader({
  itineraryName,
  destination,
  dateRange,
  onNameChange,
  onDateChange,
}: ItineraryHeaderProps) {
  return (
    <div className="h-16 border-b bg-white px-4 flex items-center justify-between">
      <div>
        <h1 className="font-semibold">{itineraryName}</h1>
        <p className="text-sm text-gray-500">{destination}</p>
      </div>
      <div>
        {/* Date picker placeholder */}
        <span className="text-sm">
          {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
