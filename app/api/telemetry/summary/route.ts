import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";
import { getClientIp, isSameOrigin } from "@/lib/security/requestGuards";
import { rateLimit, rateLimitHeaders } from "@/lib/security/rateLimit";

const QuerySchema = z.object({
  windowDays: z.coerce.number().int().min(1).max(30).default(7),
});

type VitalRow = {
  metric_name: string;
  metric_value: number;
  rating: string | null;
};

type ApiRow = {
  route: string;
  method: string;
  status: number;
  duration_ms: number;
};

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const weight = idx - lo;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * weight;
};

export async function GET(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: { code: "forbidden", message: "Invalid request origin." } }, { status: 403 });
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ ok: false, error: { code: "unauthorized", message: "You must be signed in." } }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limiter = rateLimit(`telemetry:summary:${auth.user.id}:${ip}`, { windowMs: 60_000, max: 60 });
  if (!limiter.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "rate_limited", message: "Too many requests. Please slow down." } },
      { status: 429, headers: rateLimitHeaders(limiter) }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({ windowDays: searchParams.get("windowDays") });
  const windowDays = parsed.success ? parsed.data.windowDays : 7;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const [vitals, api] = await Promise.all([
    supabase
      .from("web_vitals_event")
      .select("metric_name,metric_value,rating")
      .eq("user_id", auth.user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("api_request_metric")
      .select("route,method,status,duration_ms")
      .eq("user_id", auth.user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const vitalRows = Array.isArray(vitals.data) ? (vitals.data as any as VitalRow[]) : [];
  const apiRows = Array.isArray(api.data) ? (api.data as any as ApiRow[]) : [];

  const vitalsByName = new Map<string, { values: number[]; good: number; total: number }>();
  for (const row of vitalRows) {
    const name = String(row.metric_name ?? "").trim();
    if (!name) continue;
    const value = Number(row.metric_value);
    if (!Number.isFinite(value)) continue;

    const entry = vitalsByName.get(name) ?? { values: [], good: 0, total: 0 };
    entry.values.push(value);
    entry.total += 1;
    if (row.rating === "good") entry.good += 1;
    vitalsByName.set(name, entry);
  }

  const vitalsSummary = Array.from(vitalsByName.entries())
    .map(([name, entry]) => {
      const p50 = percentile(entry.values, 0.5);
      const p95 = percentile(entry.values, 0.95);
      return {
        name,
        count: entry.total,
        p50,
        p95,
        goodPct: entry.total > 0 ? Math.round((entry.good / entry.total) * 100) : 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const apiByRoute = new Map<string, { route: string; method: string; values: number[]; errors: number; total: number }>();
  for (const row of apiRows) {
    const route = String(row.route ?? "").trim();
    const method = String(row.method ?? "").trim().toUpperCase();
    if (!route || !method) continue;

    const duration = Number(row.duration_ms);
    if (!Number.isFinite(duration) || duration < 0) continue;

    const key = `${method} ${route}`;
    const entry = apiByRoute.get(key) ?? { route, method, values: [], errors: 0, total: 0 };
    entry.values.push(duration);
    entry.total += 1;
    if (Number(row.status) >= 400) entry.errors += 1;
    apiByRoute.set(key, entry);
  }

  const apiSummary = Array.from(apiByRoute.values())
    .map((entry) => ({
      route: entry.route,
      method: entry.method,
      count: entry.total,
      p50: percentile(entry.values, 0.5),
      p95: percentile(entry.values, 0.95),
      errorPct: entry.total > 0 ? Math.round((entry.errors / entry.total) * 100) : 0,
    }))
    .sort((a, b) => {
      const p95a = a.p95 ?? -1;
      const p95b = b.p95 ?? -1;
      if (p95a !== p95b) return p95b - p95a;
      return a.route.localeCompare(b.route);
    });

  return NextResponse.json(
    {
      ok: true,
      windowDays,
      since,
      vitals: vitalsSummary,
      api: apiSummary,
    },
    { headers: rateLimitHeaders(limiter) }
  );
}

