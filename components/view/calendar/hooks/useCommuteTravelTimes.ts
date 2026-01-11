"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { calculateTravelTime } from "@/actions/google/travelTime";
import type { TravelMode } from "@/actions/google/travelTime";
import { getCommuteRequestKey, type CommuteSegment, type CommuteTravelTime } from "../commute";

type CommuteTimesBySegmentKey = Record<
  string,
  Partial<Record<TravelMode, CommuteTravelTime | null>>
>;
type LoadingByRequestKey = Record<string, true>;

export function useCommuteTravelTimes(segments: CommuteSegment[], enabled: boolean) {
  const [travelTimesByKey, setTravelTimesByKey] = useState<CommuteTimesBySegmentKey>({});
  const [loadingByKey, setLoadingByKey] = useState<LoadingByRequestKey>({});

  const allowedKeys = useMemo(() => new Set(segments.map((segment) => segment.key)), [segments]);
  const allowedKeysRef = useRef(allowedKeys);
  const isMountedRef = useRef(true);
  const inflightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    allowedKeysRef.current = allowedKeys;
  }, [allowedKeys]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Prune stale travel times so the cache doesn't grow forever when navigating.
    setTravelTimesByKey((prev) => {
      const prevKeys = Object.keys(prev);
      const hasExtraneous = prevKeys.some((key) => !allowedKeys.has(key));
      if (!hasExtraneous) return prev;

      const next: typeof prev = {};
      for (const key of prevKeys) {
        if (allowedKeys.has(key)) next[key] = prev[key];
      }
      return next;
    });

    setLoadingByKey((prev) => {
      const prevKeys = Object.keys(prev);
      const hasExtraneous = prevKeys.some((key) => !allowedKeys.has(key.split("::")[0] ?? ""));
      if (!hasExtraneous) return prev;

      const next: LoadingByRequestKey = {};
      for (const key of prevKeys) {
        if (allowedKeys.has(key.split("::")[0] ?? "")) next[key] = true;
      }
      return next;
    });
  }, [allowedKeys]);

  useEffect(() => {
    if (!enabled) return;
    if (segments.length === 0) return;

    const requests: Array<{ segment: CommuteSegment; modes: TravelMode[] }> = [];

    for (const segment of segments) {
      const ensureModes = new Set<TravelMode>(["driving", "walking"]);
      ensureModes.add(segment.preferredMode);

      const existing = travelTimesByKey[segment.key] ?? {};
      const missingModes: TravelMode[] = [];

      for (const mode of ensureModes) {
        const requestKey = getCommuteRequestKey(segment.key, mode);
        if (mode in existing) continue;
        if (loadingByKey[requestKey] && inflightRef.current.has(requestKey)) continue;
        missingModes.push(mode);
      }

      if (missingModes.length > 0) {
        requests.push({ segment, modes: missingModes });
      }
    }

    if (requests.length === 0) return;

    setLoadingByKey((prev) => {
      const next: LoadingByRequestKey = { ...prev };
      for (const request of requests) {
        for (const mode of request.modes) {
          const requestKey = getCommuteRequestKey(request.segment.key, mode);
          inflightRef.current.add(requestKey);
          next[requestKey] = true;
        }
      }
      return next;
    });

    (async () => {
      const nextTimes: CommuteTimesBySegmentKey = {};
      const completedRequestKeys: string[] = [];

      await Promise.all(
        requests.map(async ({ segment, modes }) => {
          try {
            const result = await calculateTravelTime(segment.origin, segment.destination, modes);

            const entry: Partial<Record<TravelMode, CommuteTravelTime | null>> = {};

            if (!result.success || !result.data) {
              for (const mode of modes) entry[mode] = null;
            } else {
              for (const mode of modes) {
                const chosen = (result.data.results as any)?.[mode] ?? null;
                const durationValue = chosen?.duration?.value;

                if (!durationValue && durationValue !== 0) {
                  entry[mode] = null;
                } else {
                  entry[mode] = {
                    durationSeconds: Number(durationValue),
                    durationText: String(chosen.duration.text ?? ""),
                    distanceText: chosen.distance?.text ? String(chosen.distance.text) : undefined,
                    mode,
                  };
                }
              }
            }

            nextTimes[segment.key] = entry;
          } catch {
            nextTimes[segment.key] = modes.reduce<Partial<Record<TravelMode, CommuteTravelTime | null>>>(
              (acc, mode) => {
                acc[mode] = null;
                return acc;
              },
              {}
            );
          } finally {
            for (const mode of modes) {
              completedRequestKeys.push(getCommuteRequestKey(segment.key, mode));
            }
          }
        })
      );

      for (const requestKey of completedRequestKeys) {
        inflightRef.current.delete(requestKey);
      }

      if (!isMountedRef.current) return;

      setTravelTimesByKey((prev) => {
        const allowed = allowedKeysRef.current;
        const next: CommuteTimesBySegmentKey = { ...prev };
        for (const [segmentKey, times] of Object.entries(nextTimes)) {
          if (!allowed.has(segmentKey)) continue;
          next[segmentKey] = { ...(next[segmentKey] ?? {}), ...times };
        }
        return next;
      });

      setLoadingByKey((prev) => {
        const next: LoadingByRequestKey = { ...prev };
        for (const key of completedRequestKeys) {
          delete next[key];
        }
        return next;
      });
    })();
  }, [enabled, loadingByKey, segments, travelTimesByKey]);

  return {
    travelTimesByKey,
    loadingByKey,
  };
}
