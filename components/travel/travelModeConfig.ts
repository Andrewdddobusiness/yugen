import type { ComponentType } from "react";
import { Bike, Car, PersonStanding, Train } from "lucide-react";

import type { TravelMode } from "@/actions/google/travelTime";

export type TravelModeOption = {
  value: TravelMode;
  label: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
};

export const TRAVEL_MODE_OPTIONS: TravelModeOption[] = [
  {
    value: "walking",
    label: "Walk",
    description: "Walking directions",
    Icon: PersonStanding,
  },
  {
    value: "driving",
    label: "Drive",
    description: "Driving directions",
    Icon: Car,
  },
  {
    value: "transit",
    label: "Transit",
    description: "Public transportation",
    Icon: Train,
  },
  {
    value: "bicycling",
    label: "Bike",
    description: "Bicycle directions",
    Icon: Bike,
  },
];

export const TRAVEL_MODE_ICON_BY_MODE: Record<TravelMode, TravelModeOption["Icon"]> = {
  walking: PersonStanding,
  driving: Car,
  transit: Train,
  bicycling: Bike,
};

export function getTravelModeOption(mode: TravelMode): TravelModeOption {
  return (
    TRAVEL_MODE_OPTIONS.find((option) => option.value === mode) ?? TRAVEL_MODE_OPTIONS[0]
  );
}

