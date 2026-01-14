import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { checkAiQuota, type AiPlanTier } from "@/lib/ai/usage";
import { getAiAssistantAccessMode, isDevBillingBypassEnabled } from "@/lib/featureFlags";
import { rateLimit, rateLimitHeaders } from "@/lib/security/rateLimit";
import { getClientIp, isSameOrigin } from "@/lib/security/requestGuards";
import { recordApiRequestMetric } from "@/lib/telemetry/server";

const jsonError = (status: number, code: string, message: string, details?: unknown, headers?: HeadersInit) => {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, details },
    },
    { status, headers }
  );
};

const isActiveProGrant = async (supabase: ReturnType<typeof createClient>, userId: string) => {
  try {
    const { data, error } = await supabase
      .from("pro_grants")
      .select("enabled,expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return false;
    if (!data.enabled) return false;
    if (!data.expires_at) return true;

    const expiresAt = new Date(data.expires_at as any);
    if (Number.isNaN(expiresAt.getTime())) return false;
    return new Date() < expiresAt;
  } catch {
    return false;
  }
};

const isActiveProSubscriber = async (supabase: ReturnType<typeof createClient>, userId: string) => {
  try {
    const { data, error } = await supabase
      .rpc("get_user_subscription", {
        user_uuid: userId,
      })
      .single();

    if (!error && data) {
      const subscriptionId = (data as any)?.out_subscription_id;
      const periodEndRaw = (data as any)?.out_current_period_end;
      if (subscriptionId && periodEndRaw) {
        const periodEnd = new Date(periodEndRaw);
        if (!Number.isNaN(periodEnd.getTime())) {
          return new Date() < periodEnd;
        }
      }
    }

    // Fallback: read directly from the subscriptions table (handles trialing and avoids RPC drift).
    const { data: row, error: tableError } = await supabase
      .from("subscriptions")
      .select("status,current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tableError || !row?.current_period_end) return false;
    const periodEnd = new Date(row.current_period_end as any);
    if (Number.isNaN(periodEnd.getTime())) return false;
    const statusRaw = String(row.status ?? "");
    const isPaidStatus = statusRaw === "active" || statusRaw === "trialing";
    return isPaidStatus && new Date() < periodEnd;
  } catch {
    return false;
  }
};

export async function GET(request: NextRequest) {
  const startedAt = performance.now();
  let status = 500;
  let userId: string | null = null;

  const respond = <T extends Response>(response: T) => {
    status = response.status;
    return response;
  };

  try {
    if (!isSameOrigin(request)) {
      return respond(jsonError(403, "forbidden", "Invalid request origin."));
    }

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return respond(jsonError(401, "unauthorized", "You must be signed in."));
    }
    userId = auth.user.id;

    const ip = getClientIp(request);
    const limiter = rateLimit(`ai_usage:get:${auth.user.id}:${ip}`, { windowMs: 60_000, max: 60 });
    if (!limiter.allowed) {
      return respond(
        jsonError(429, "rate_limited", "Too many requests. Please slow down.", undefined, rateLimitHeaders(limiter))
      );
    }

    const isPro =
      isDevBillingBypassEnabled() ||
      (await isActiveProSubscriber(supabase, auth.user.id)) ||
      (await isActiveProGrant(supabase, auth.user.id));
    const tier: AiPlanTier = isPro ? "pro" : "free";
    const quota = await checkAiQuota({ supabase, userId: auth.user.id, tier });
    const accessMode = getAiAssistantAccessMode();

    const percentUsed = quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;

    const response = NextResponse.json({
      ok: true,
      accessMode,
      tier,
      ...quota,
      percentUsed,
    });

    return respond(response);
  } finally {
    void recordApiRequestMetric({
      userId,
      route: "/api/ai/usage",
      method: request.method,
      status,
      durationMs: performance.now() - startedAt,
    });
  }
}
