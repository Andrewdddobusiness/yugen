"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TravelMode } from "@/actions/google/travelTime";

const MODE_OPTIONS: Array<{ value: TravelMode; label: string; icon: string }> = [
  { value: "walking", label: "Walk", icon: "🚶" },
  { value: "driving", label: "Drive", icon: "🚗" },
  { value: "transit", label: "Transit", icon: "🚌" },
  { value: "bicycling", label: "Bike", icon: "🚲" },
];

export function TravelModeSelect({
  value,
  onValueChange,
  placeholder = "Mode",
  disabled,
  className,
}: {
  value?: TravelMode | null;
  onValueChange: (mode: TravelMode) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(next) => onValueChange(next as TravelMode)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-7 w-[120px] text-xs", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {MODE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="mr-2" aria-hidden="true">
              {option.icon}
            </span>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default TravelModeSelect;

