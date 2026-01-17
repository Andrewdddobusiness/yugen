import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAiAssistantAccessMode, isDevBillingBypassEnabled } from "@/lib/featureFlags";
import { DestinationIdSchema, ItineraryIdSchema, ThreadKeySchema } from "@/lib/ai/itinerary/schema";
import { createAiItineraryThread, listAiItineraryThreads } from "@/lib/ai/itinerary/chatStore";
import { rateLimit, rateLimitHeaders } from "@/lib/security/rateLimit";
import { getClientIp, isSameOrigin } from "@/lib/security/requestGuards";
import { recordApiRequestMetric } from "@/lib/telemetry/server";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

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

const requireAiAssistantAccess = async (supabase: ReturnType<typeof createClient>, userId: string) => {
  const mode = getAiAssistantAccessMode();
  if (mode === "off") {
    return {
      ok: false as const,
      response: jsonError(403, "ai_disabled", "AI features are currently unavailable."),
    };
  }

  const isPro =
    isDevBillingBypassEnabled() ||
    (await isActiveProSubscriber(supabase, userId)) ||
    (await isActiveProGrant(supabase, userId));
  if (mode === "pro" && !isPro) {
    return {
      ok: false as const,
      response: jsonError(403, "upgrade_required", "Upgrade to Pro to use the AI assistant."),
    };
  }

  return { ok: true as const, tier: (isPro ? "pro" : "free") as "pro" | "free" };
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
    const itineraryId = request.nextUrl.searchParams.get("itineraryId") ?? "";
    const destinationId = request.nextUrl.searchParams.get("destinationId") ?? "";

    const parsedItineraryId = ItineraryIdSchema.safeParse(itineraryId);
    const parsedDestinationId = DestinationIdSchema.safeParse(destinationId);
    if (!parsedItineraryId.success || !parsedDestinationId.success) {
      return respond(jsonError(400, "invalid_request", "Invalid itinerary or destination id"));
    }

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return respond(jsonError(401, "unauthorized", "You must be signed in to use the AI assistant."));
    }
    userId = auth.user.id;

    const ip = getClientIp(request);
    const limiter = rateLimit(`ai_itinerary_threads:get:${auth.user.id}:${ip}`, { windowMs: 60_000, max: 60 });
    if (!limiter.allowed) {
      return respond(
        jsonError(429, "rate_limited", "Too many requests. Please slow down.", undefined, rateLimitHeaders(limiter))
      );
    }

    const access = await requireAiAssistantAccess(supabase, auth.user.id);
    if (!access.ok) return respond(access.response);

    const threads = await listAiItineraryThreads({
      supabase,
      itineraryId,
      destinationId,
      userId: auth.user.id,
      limit: 25,
    });

    return respond(NextResponse.json({ ok: true, threads }));
  } catch (error) {
    console.error("Failed to list AI itinerary threads:", error);
    return respond(jsonError(500, "threads_failed", "Failed to load chats. Please try again."));
  } finally {
    void recordApiRequestMetric({
      userId,
      route: "/api/ai/itinerary/threads",
      method: request.method,
      status,
      durationMs: performance.now() - startedAt,
    });
  }
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  let status = 500;
  let userId: string | null = null;

  const respond = <T extends Response>(response: T) => {
    status = response.status;
    return response;
  };

  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return respond(jsonError(401, "unauthorized", "You must be signed in to use the AI assistant."));
    }
    userId = auth.user.id;

    if (!isSameOrigin(request)) {
      return respond(jsonError(403, "forbidden", "Invalid request origin."));
    }

    const ip = getClientIp(request);
    const limiter = rateLimit(`ai_itinerary_threads:post:${auth.user.id}:${ip}`, { windowMs: 60_000, max: 30 });
    if (!limiter.allowed) {
      return respond(
        jsonError(429, "rate_limited", "Too many requests. Please slow down.", undefined, rateLimitHeaders(limiter))
      );
    }

    const access = await requireAiAssistantAccess(supabase, auth.user.id);
    if (!access.ok) return respond(access.response);

    const body = (await request.json().catch(() => null)) as any;
    const itineraryId = String(body?.itineraryId ?? "");
    const destinationId = String(body?.destinationId ?? "");
    const requestedThreadKey = String(body?.threadKey ?? "").trim();

    const parsedItineraryId = ItineraryIdSchema.safeParse(itineraryId);
    const parsedDestinationId = DestinationIdSchema.safeParse(destinationId);
    if (!parsedItineraryId.success || !parsedDestinationId.success) {
      return respond(jsonError(400, "invalid_request", "Invalid itinerary or destination id"));
    }

    const makeThreadKey = () => crypto.randomUUID();
    const threadKey = ThreadKeySchema.safeParse(requestedThreadKey || makeThreadKey());
    if (!threadKey.success) {
      return respond(jsonError(400, "invalid_request", threadKey.error.message));
    }

    const createOnce = async (key: string) =>
      createAiItineraryThread({
        supabase,
        itineraryId,
        destinationId,
        userId: auth.user.id,
        threadKey: key,
      });

    let created = await createOnce(threadKey.data);
    if (!created?.ai_itinerary_thread_id) {
      return respond(jsonError(500, "threads_failed", "Failed to create a new chat."));
    }

    return respond(NextResponse.json({ ok: true, thread: created }));
  } catch (error) {
    const message = String((error as any)?.message ?? "");
    if (message.includes("[ai_threads_not_supported]")) {
      return respond(jsonError(501, "threads_not_supported", message.replace("[ai_threads_not_supported] ", "")));
    }
    if (message.toLowerCase().includes("duplicate key")) {
      // This should be extremely rare; clients can retry.
      return respond(jsonError(409, "duplicate_thread", "Chat already exists. Please try again."));
    }

    console.error("Failed to create AI itinerary thread:", error);
    return respond(jsonError(500, "threads_failed", "Failed to create a new chat. Please try again."));
  } finally {
    void recordApiRequestMetric({
      userId,
      route: "/api/ai/itinerary/threads",
      method: request.method,
      status,
      durationMs: performance.now() - startedAt,
    });
  }
}
