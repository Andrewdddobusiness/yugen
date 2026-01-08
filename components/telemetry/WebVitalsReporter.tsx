"use client";

import { useEffect } from "react";

type WebVitalsMetric = {
  name: string;
  value: number;
  delta?: number;
  id?: string;
  rating?: "good" | "needs-improvement" | "poor";
  navigationType?: string;
};

const DEFAULT_SAMPLE_RATE = 0.2;

const getSampleRate = () => {
  const raw = process.env.NEXT_PUBLIC_WEB_VITALS_SAMPLE_RATE;
  if (!raw) return DEFAULT_SAMPLE_RATE;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_SAMPLE_RATE;
  return Math.min(1, Math.max(0, parsed));
};

const sendMetric = (metric: WebVitalsMetric) => {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const payload = {
    pathname,
    metric: {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    },
  };

  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/telemetry/vitals", blob);
    return;
  }

  void fetch("/api/telemetry/vitals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
};

export function WebVitalsReporter() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sampleRate = getSampleRate();
    if (sampleRate <= 0) return;
    if (sampleRate < 1 && Math.random() > sampleRate) return;

    let cancelled = false;

    const init = async () => {
      try {
        const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import("web-vitals");
        if (cancelled) return;

        const report = (metric: any) => sendMetric(metric as WebVitalsMetric);

        onCLS(report);
        onFCP(report);
        onINP(report);
        onLCP(report);
        onTTFB(report);
      } catch {
        // Ignore vitals init failures.
      }
    };

    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(init, { timeout: 1500 });
      return () => {
        cancelled = true;
        (window as any).cancelIdleCallback?.(id);
      };
    }

    const id: ReturnType<typeof setTimeout> = setTimeout(init, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  return null;
}

