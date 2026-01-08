import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/security/rateLimit";
import { getClientIp, isSameOrigin } from "@/lib/security/requestGuards";
import { recordWebVitalsEvent } from "@/lib/telemetry/server";

const MetricSchema = z.object({
  name: z.string().trim().min(1).max(40),
  value: z.number().finite().min(0),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  delta: z.number().finite().min(0).optional(),
  id: z.string().trim().max(120).optional(),
  navigationType: z.string().trim().max(40).optional(),
});

const BodySchema = z.object({
  pathname: z.string().trim().min(1).max(500),
  metric: MetricSchema,
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: { code: "forbidden", message: "Invalid request origin." } }, { status: 403 });
  }

  const ip = getClientIp(request);
  const limiter = rateLimit(`telemetry:vitals:${ip}`, { windowMs: 60_000, max: 240 });
  if (!limiter.allowed) {
    return NextResponse.json(
      { ok: false, error: { code: "rate_limited", message: "Too many requests. Please slow down." } },
      { status: 429, headers: rateLimitHeaders(limiter) }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 10_000) {
    return NextResponse.json(
      { ok: false, error: { code: "payload_too_large", message: "Payload too large." } },
      { status: 413 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "invalid_json", message: "Invalid JSON." } }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_request", message: "Invalid telemetry payload." } },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id ?? null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

  await recordWebVitalsEvent({
    userId,
    pathname: parsed.data.pathname,
    metricName: parsed.data.metric.name,
    metricValue: parsed.data.metric.value,
    rating: parsed.data.metric.rating ?? null,
    delta: parsed.data.metric.delta ?? null,
    metricId: parsed.data.metric.id ?? null,
    navigationType: parsed.data.metric.navigationType ?? null,
    userAgent,
  });

  return new NextResponse(null, { status: 204, headers: rateLimitHeaders(limiter) });
}

