"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TravelMode } from "@/actions/google/travelTime";
import { getTravelModeOption, TRAVEL_MODE_OPTIONS } from "./travelModeConfig";

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
  const selectedOption = value ? getTravelModeOption(value) : null;

  return (
    <Select
      value={value ?? undefined}
      onValueChange={(next) => onValueChange(next as TravelMode)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-7 w-[120px] text-xs", className)}>
        {selectedOption ? (
          <div className="flex items-center gap-2">
            <selectedOption.Icon className="h-4 w-4 text-ink-700" aria-hidden="true" />
            <span>{selectedOption.label}</span>
          </div>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {TRAVEL_MODE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-2">
              <option.Icon className="h-4 w-4 text-ink-700" aria-hidden="true" />
              <span>{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default TravelModeSelect;
