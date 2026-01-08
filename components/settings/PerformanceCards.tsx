"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type TelemetrySummaryResponse =
  | {
      ok: true;
      windowDays: number;
      since: string;
      vitals: Array<{ name: string; count: number; p50: number | null; p95: number | null; goodPct: number }>;
      api: Array<{
        route: string;
        method: string;
        count: number;
        p50: number | null;
        p95: number | null;
        errorPct: number;
      }>;
    }
  | { ok: false; error?: { code?: string; message?: string } };

const formatMs = (value: number | null) => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)} ms`;
};

const formatCls = (value: number | null) => {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(3);
};

const formatVital = (name: string, value: number | null) => {
  if (name.toUpperCase() === "CLS") return formatCls(value);
  return formatMs(value);
};

const VITAL_ORDER = ["LCP", "INP", "CLS", "FCP", "TTFB"];

export default function PerformanceCards() {
  const [data, setData] = useState<TelemetrySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/telemetry/summary?windowDays=7", { method: "GET" });
        const json = (await res.json()) as TelemetrySummaryResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ ok: false, error: { message: "Failed to load telemetry." } });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const ui = useMemo(() => {
    if (!data || !data.ok) {
      return {
        ok: false as const,
        error: data && !data.ok ? data.error?.message ?? "Failed to load telemetry." : null,
      };
    }

    return { ...data, error: null } as const;
  }, [data]);

  const vitalsByName = useMemo(() => {
    const map = new Map<string, { name: string; count: number; p50: number | null; p95: number | null; goodPct: number }>();
    if (ui.ok) {
      for (const row of ui.vitals) {
        map.set(row.name.toUpperCase(), row);
      }
    }
    return map;
  }, [ui]);

  const vitalsInOrder = useMemo(() => {
    return VITAL_ORDER.map((name) => ({
      name,
      row: vitalsByName.get(name) ?? null,
    }));
  }, [vitalsByName]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Performance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Web vitals + API latency summary (last 7 days).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vitalsInOrder.map(({ name, row }) => (
          <Card key={name}>
            <CardHeader>
              <CardDescription>Web Vitals</CardDescription>
              <CardTitle className="text-lg font-bold">{name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <>
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-48" />
                </>
              ) : !ui.ok ? (
                <div className="text-sm text-muted-foreground">{ui.error ?? "Failed to load telemetry."}</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">p50</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {formatVital(name, row?.p50 ?? null)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">p95</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {formatVital(name, row?.p95 ?? null)}
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{row?.count ?? 0} samples</span>
                    <span>{row ? `${row.goodPct}% good` : "—"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardDescription>API</CardDescription>
          <CardTitle className="text-lg font-bold">Slowest endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : !ui.ok ? (
            <div className="text-sm text-muted-foreground">{ui.error ?? "Failed to load telemetry."}</div>
          ) : ui.api.length === 0 ? (
            <div className="text-sm text-muted-foreground">No API timing data yet.</div>
          ) : (
            <div className="space-y-2">
              {ui.api.slice(0, 8).map((row) => (
                <div
                  key={`${row.method}-${row.route}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      <span className="text-muted-foreground mr-2">{row.method}</span>
                      {row.route}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.count} req • {row.errorPct}% errors
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted-foreground">p95</div>
                    <div className="font-semibold text-gray-900">{formatMs(row.p95)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
