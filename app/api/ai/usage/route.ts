import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { checkAiQuota, type AiPlanTier } from "@/lib/ai/usage";
import { getAiAssistantAccessMode } from "@/lib/featureFlags";
import { rateLimit, rateLimitHeaders } from "@/lib/security/rateLimit";
import { getClientIp, isSameOrigin } from "@/lib/security/requestGuards";

const jsonError = (status: number, code: string, message: string, details?: unknown, headers?: HeadersInit) => {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, details },
    },
    { status, headers }
  );
};

const isActiveProSubscriber = async (supabase: ReturnType<typeof createClient>, userId: string) => {
  try {
    const { data, error } = await supabase
      .rpc("get_user_subscription", {
        user_uuid: userId,
      })
      .single();

    if (error || !data) return false;
    const subscriptionId = (data as any)?.out_subscription_id;
    const periodEndRaw = (data as any)?.out_current_period_end;
    if (!subscriptionId || !periodEndRaw) return false;

    const periodEnd = new Date(periodEndRaw);
    if (Number.isNaN(periodEnd.getTime())) return false;
    return new Date() < periodEnd;
  } catch {
    return false;
  }
};

export async function GET(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "forbidden", "Invalid request origin.");
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return jsonError(401, "unauthorized", "You must be signed in.");
  }

  const ip = getClientIp(request);
  const limiter = rateLimit(`ai_usage:get:${auth.user.id}:${ip}`, { windowMs: 60_000, max: 60 });
  if (!limiter.allowed) {
    return jsonError(429, "rate_limited", "Too many requests. Please slow down.", undefined, rateLimitHeaders(limiter));
  }

  const isPro = await isActiveProSubscriber(supabase, auth.user.id);
  const tier: AiPlanTier = isPro ? "pro" : "free";
  const quota = await checkAiQuota({ supabase, userId: auth.user.id, tier });
  const accessMode = getAiAssistantAccessMode();

  const percentUsed = quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;

  return NextResponse.json({
    ok: true,
    accessMode,
    tier,
    ...quota,
    percentUsed,
  });
}

