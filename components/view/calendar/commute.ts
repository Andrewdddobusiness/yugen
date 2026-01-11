"use client";

import type { TravelMode } from "@/actions/google/travelTime";
import type { Coordinates } from "@/types/database";

export type ActivityCoordinates = [number, number]; // Stored as [lng, lat]

export interface CommuteSegmentKeyParts {
  fromId: string;
  toId: string;
  origin: Coordinates;
  destination: Coordinates;
}

export interface CommuteSegment {
  key: string;
  dayIndex: number;
  from: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    coordinates: ActivityCoordinates;
    travelModeToNext?: TravelMode | null;
  };
  to: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    coordinates: ActivityCoordinates;
  };
  preferredMode: TravelMode;
  origin: Coordinates;
  destination: Coordinates;
  gapMinutes: number;
}

export interface CommuteTravelTime {
  durationSeconds: number;
  durationText: string;
  distanceText?: string;
  mode: TravelMode;
}

export function getCommuteOverlayId(segmentKey: string): string {
  return `commute:${segmentKey}`;
}

export function getCommuteRequestKey(segmentKey: string, mode: TravelMode): string {
  return `${segmentKey}::${mode}`;
}

export function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const parts = time.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

export function formatTimeFromMinutes(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export function toCoordinates(coords: ActivityCoordinates | null | undefined): Coordinates | null {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function buildCommuteSegmentKey(parts: CommuteSegmentKeyParts): string {
  const { fromId, toId, origin, destination } = parts;
  const round = (value: number) => Number(value.toFixed(5));
  return `${fromId}->${toId}:${round(origin.lat)},${round(origin.lng)}|${round(destination.lat)},${round(destination.lng)}`;
}
