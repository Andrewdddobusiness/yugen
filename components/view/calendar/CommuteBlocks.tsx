"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Bike, Car, Clock, Train } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { TravelModeSelect } from "@/components/travel/TravelModeSelect";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import type { TravelMode } from "@/actions/google/travelTime";
import type { CommuteSegment, CommuteTravelTime } from "./commute";
import { formatTimeFromMinutes, getCommuteOverlayId, getCommuteRequestKey, parseTimeToMinutes } from "./commute";

type CommuteState = "ok" | "tight" | "conflict" | "unknown";

function getModeIcon(mode: TravelMode) {
  switch (mode) {
    case "walking":
      return <Clock className="h-3 w-3" />;
    case "transit":
      return <Train className="h-3 w-3" />;
    case "bicycling":
      return <Bike className="h-3 w-3" />;
    case "driving":
    default:
      return <Car className="h-3 w-3" />;
  }
}

function classifyCommute(
  availableMinutes: number,
  travelMinutes: number | null,
  bufferMinutes: number,
  includeBuffer: boolean
): CommuteState {
  if (travelMinutes == null) return "unknown";
  const required = travelMinutes + (includeBuffer ? bufferMinutes : 0);
  if (required > availableMinutes) return "conflict";
  if (availableMinutes > 0 && required > availableMinutes * 0.8) return "tight";
  return "ok";
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

export function CommuteBlocks({
  segments,
  travelTimesByKey,
  loadingByKey,
  overlapLayoutById,
  gridStartMinutes,
  minutesPerSlot,
  slotHeightPx,
  gridHeightPx,
  includeBuffer,
  bufferMinutes,
}: {
  segments: CommuteSegment[];
  travelTimesByKey: Record<string, Partial<Record<TravelMode, CommuteTravelTime | null>>>;
  loadingByKey: Record<string, true>;
  overlapLayoutById?: Record<string, { column: number; columnCount: number }>;
  gridStartMinutes: number;
  minutesPerSlot: number;
  slotHeightPx: number;
  gridHeightPx: number;
  includeBuffer: boolean;
  bufferMinutes: number;
}) {
  const { toast } = useToast();
  const optimisticUpdateItineraryActivity = useItineraryActivityStore((s) => s.optimisticUpdateItineraryActivity);
  const [updatingActivityId, setUpdatingActivityId] = useState<string | null>(null);

  const sortedSegments = useMemo(
    () =>
      [...segments].sort((a, b) => {
        const aEnd = parseTimeToMinutes(a.from.endTime) ?? 0;
        const bEnd = parseTimeToMinutes(b.from.endTime) ?? 0;
        if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
        if (aEnd !== bEnd) return aEnd - bEnd;
        return a.key.localeCompare(b.key);
      }),
    [segments]
  );

  if (sortedSegments.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {sortedSegments.map((segment) => {
        const travel = travelTimesByKey[segment.key]?.[segment.preferredMode] ?? null;
        const isLoading =
          Boolean(loadingByKey[getCommuteRequestKey(segment.key, segment.preferredMode)]) && travel === null;

        const fromEnd = parseTimeToMinutes(segment.from.endTime);
        const toStart = parseTimeToMinutes(segment.to.startTime);
        if (fromEnd == null || toStart == null) return null;

        const gapMinutes = segment.gapMinutes;
        const travelMinutes = travel ? Math.max(0, Math.round(travel.durationSeconds / 60)) : null;
        const displayTravelMinutes =
          travelMinutes != null ? travelMinutes : isLoading ? minutesPerSlot : minutesPerSlot;
        const state = classifyCommute(gapMinutes, travelMinutes, bufferMinutes, includeBuffer);

        const startMinutes = fromEnd;
        const topPx = ((startMinutes - gridStartMinutes) / minutesPerSlot) * slotHeightPx;
        const heightPx = (Math.max(1, displayTravelMinutes) / minutesPerSlot) * slotHeightPx;
        const blockHeightPx = Math.max(22, heightPx);
        const clampedTopPx = Math.max(2, Math.min(topPx, gridHeightPx - blockHeightPx - 2));

        const label =
          isLoading ? "…" : travel ? travel.durationText : "N/A";

        const containerClassName = cn(
          "w-full h-full rounded-md border shadow-sm",
          "flex items-center justify-between px-2 text-[11px] leading-none min-w-0 overflow-hidden",
          state === "ok" && "bg-blue-50/80 border-blue-200 text-blue-900",
          state === "tight" && "bg-amber-50/80 border-amber-200 text-amber-900",
          state === "conflict" && "bg-red-50/80 border-red-200 text-red-900",
          state === "unknown" && "bg-bg-50/90 border-stroke-200 text-ink-700"
        );

        const canShift = state === "conflict" && travelMinutes != null;
        const requiredMinutes = travelMinutes != null ? travelMinutes + (includeBuffer ? bufferMinutes : 0) : null;
        const rawDelta = requiredMinutes != null ? Math.max(0, requiredMinutes - gapMinutes) : 0;
        const snappedDelta =
          rawDelta > 0 ? Math.ceil(rawDelta / minutesPerSlot) * minutesPerSlot : 0;

        const overlap = overlapLayoutById?.[getCommuteOverlayId(segment.key)] ?? {
          column: 0,
          columnCount: 1,
        };
        const columnCount = Math.max(1, overlap.columnCount);
        const column = Math.max(0, overlap.column);

        const gutterPx = 4; // left+right padding (2px each)
        const gapPx = columnCount > 1 ? 4 : 0;
        const totalGapPx = gapPx * (columnCount - 1);
        const columnWidth = `calc((100% - ${gutterPx + totalGapPx}px) / ${columnCount})`;
        const left =
          columnCount > 1
            ? `calc(2px + (${columnWidth} + ${gapPx}px) * ${column})`
            : "2px";

        return (
          <div
            key={segment.key}
            className="absolute pointer-events-auto"
            style={{
              top: `${clampedTopPx}px`,
              height: `${blockHeightPx}px`,
              zIndex: 7,
              ...(columnCount > 1 ? { left, width: columnWidth } : { left: "2px", right: "2px" }),
            }}
          >
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className={containerClassName}>
                  <span className="flex items-center gap-1 min-w-0">
                    {getModeIcon(segment.preferredMode)}
                    <span className="font-medium truncate text-[10px] tracking-tight">
                      {label}
                    </span>
                  </span>
                  {state === "conflict" && (
                    <AlertTriangle className="h-3 w-3" aria-label="Travel time conflict" />
                  )}
                </button>
              </PopoverTrigger>

              <PopoverContent align="start" className="w-80">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">Travel time</div>
                    <div className="text-xs text-ink-600">
                      {segment.from.name} → {segment.to.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-stroke-200 bg-bg-0 p-2">
                      <div className="text-ink-500">Commute</div>
                      <div className="font-medium text-ink-900">
                        {isLoading ? "Loading…" : travel ? travel.durationText : "Unavailable"}
                      </div>
                      {travel?.distanceText ? (
                        <div className="text-ink-500">{travel.distanceText}</div>
                      ) : null}
                    </div>
                    <div className="rounded-md border border-stroke-200 bg-bg-0 p-2">
                      <div className="text-ink-500">Gap</div>
                      <div className="font-medium text-ink-900">{formatMinutes(Math.max(0, gapMinutes))}</div>
                      {includeBuffer ? (
                        <div className="text-ink-500">+ {formatMinutes(bufferMinutes)} buffer</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-ink-600">Mode</div>
                    <TravelModeSelect
                      value={segment.preferredMode}
                      disabled={updatingActivityId === segment.from.id}
                      onValueChange={async (mode) => {
                        setUpdatingActivityId(segment.from.id);
                        const result = await optimisticUpdateItineraryActivity(segment.from.id, {
                          travel_mode_to_next: mode,
                        });
                        setUpdatingActivityId(null);

                        if (!result.success) {
                          toast({
                            title: "Could not update travel mode",
                            description: result.error ?? "Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  </div>

                  {canShift ? (
                    <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-900">
                      <div className="flex items-center gap-2 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Not enough time between activities
                      </div>
                      <div className="mt-1 text-red-800/80">
                        Shift the next activity by {formatMinutes(snappedDelta)} to fit commute + buffer.
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updatingActivityId === segment.to.id || snappedDelta <= 0}
                          onClick={async () => {
                            const toStartMinutes = parseTimeToMinutes(segment.to.startTime);
                            const toEndMinutes = parseTimeToMinutes(segment.to.endTime);
                            if (toStartMinutes == null || toEndMinutes == null) {
                              toast({
                                title: "Could not shift activity",
                                description: "Invalid activity time range.",
                                variant: "destructive",
                              });
                              return;
                            }

                            const duration = Math.max(0, toEndMinutes - toStartMinutes);
                            const nextStart = toStartMinutes + snappedDelta;
                            const nextEnd = nextStart + duration;

                            if (nextEnd >= 24 * 60) {
                              toast({
                                title: "Could not shift activity",
                                description: "The shift would move the activity past midnight.",
                                variant: "destructive",
                              });
                              return;
                            }

                            setUpdatingActivityId(segment.to.id);
                            const result = await optimisticUpdateItineraryActivity(segment.to.id, {
                              start_time: formatTimeFromMinutes(nextStart),
                              end_time: formatTimeFromMinutes(nextEnd),
                            });
                            setUpdatingActivityId(null);

                            if (!result.success) {
                              toast({
                                title: "Could not shift activity",
                                description: result.error ?? "Please try again.",
                                variant: "destructive",
                              });
                            } else {
                              toast({
                                title: "Activity shifted",
                                description: `Moved ${segment.to.name} by ${formatMinutes(snappedDelta)}.`,
                              });
                            }
                          }}
                        >
                          Shift next activity
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );
      })}
    </div>
  );
}
