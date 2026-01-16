import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAiAssistantAccessMode, isDevBillingBypassEnabled } from "@/lib/featureFlags";
import { isSameOrigin } from "@/lib/security/requestGuards";
import { recordApiRequestMetric } from "@/lib/telemetry/server";

const parseDateish = (value: unknown) => {
  const str = String(value ?? "");
  const candidates: string[] = [str];

  const withT = str.includes(" ") ? str.replace(" ", "T") : str;
  candidates.push(withT);
  candidates.push(
    withT
      .replace(/([+-]\d{2})(\d{2})$/, "$1:$2")
      .replace(/([+-]\d{2})$/, "$1:00")
  );

  for (const candidate of candidates) {
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return new Date(NaN);
};

const isActiveProGrant = async (supabase: ReturnType<typeof createClient>, userId: string) => {
  const { data, error } = await supabase.from("pro_grants").select("enabled,expires_at").eq("user_id", userId).maybeSingle();
  if (error || !data) return false;
  if (!data.enabled) return false;
  if (!data.expires_at) return true;
  const expiresAt = parseDateish(data.expires_at);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return new Date() < expiresAt;
};

const isActiveProSubscription = async (supabase: ReturnType<typeof createClient>, userId: string) => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.current_period_end) return false;
  const status = String(data.status ?? "");
  const isPaidStatus = status === "active" || status === "trialing";
  if (!isPaidStatus) return false;
  const periodEnd = parseDateish(data.current_period_end);
  if (Number.isNaN(periodEnd.getTime())) return true;
  return new Date() < periodEnd;
};

export async function GET(request: NextRequest) {
  const startedAt = performance.now();
  let status = 500;
  let userId: string | null = null;

  const respond = (response: Response) => {
    status = response.status;
    return response;
  };

  try {
    if (!isSameOrigin(request)) {
      return respond(NextResponse.json({ ok: false, error: { code: "forbidden", message: "Invalid request origin." } }, { status: 403 }));
    }

    const mode = getAiAssistantAccessMode();
    if (mode === "off") {
      return respond(NextResponse.json({ ok: true, aiAccessMode: mode, isPro: false }));
    }

    const supabase = createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
      return respond(NextResponse.json({ ok: true, aiAccessMode: mode, isPro: false }));
    }
    userId = auth.user.id;

    const isPro =
      isDevBillingBypassEnabled() ||
      (await isActiveProSubscription(supabase, userId)) ||
      (await isActiveProGrant(supabase, userId));

    return respond(NextResponse.json({ ok: true, aiAccessMode: mode, isPro }));
  } catch (error) {
    console.error("Failed to fetch billing entitlements:", error);
    return respond(NextResponse.json({ ok: false, error: { code: "server_error", message: "Failed to load entitlements." } }, { status: 500 }));
  } finally {
    void recordApiRequestMetric({
      userId,
      route: "/api/billing/entitlements",
      method: request.method,
      status,
      durationMs: performance.now() - startedAt,
    });
  }
}

