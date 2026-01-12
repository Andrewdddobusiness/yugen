import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { fetchBuilderBootstrap } from "@/actions/supabase/builderBootstrap";
import { softDeleteTableData2 } from "@/actions/supabase/actions";
import { addPlaceToItinerary } from "@/actions/supabase/activities";
import { fetchCityCoordinates, fetchPlaceDetails, searchPlacesByText } from "@/actions/google/actions";
import { extractPlaceCandidatesFromSources, resolveLinkImportCandidates, LinkImportDraftSourcesSchema } from "@/lib/ai/linkImport";
import { planItineraryEdits } from "@/lib/ai/itinerary/planner";
import { openaiEmbed } from "@/lib/ai/itinerary/openai";
import { checkAiQuota, recordAiUsage } from "@/lib/ai/usage";
import { getAiAssistantAccessMode } from "@/lib/featureFlags";
import { ingestUrlsFromMessage } from "@/lib/linkImport/server/providers";
import { rateLimit, rateLimitHeaders } from "@/lib/security/rateLimit";
import { getClientIp, isSameOrigin } from "@/lib/security/requestGuards";
import {
  DestinationIdSchema,
  ItineraryAssistantRequestSchema,
  ItineraryIdSchema,
  OperationSchema,
  type ProposedOperation,
  type Operation,
  type PlanResponsePayload,
  type ImportResponsePayload,
  type ApplyResponsePayload,
} from "@/lib/ai/itinerary/schema";
import {
  finishAiItineraryRun,
  finishAiItineraryRunStep,
  getOrCreateAiItineraryThread,
  insertAiItineraryMessage,
  insertAiItineraryToolInvocation,
  listAiItineraryMessages,
  matchAiItineraryMessages,
  mergeChatContext,
  startAiItineraryRun,
  startAiItineraryRunStep,
  updateAiItineraryThreadDraftAndSources,
  updateAiItineraryThreadSummary,
} from "@/lib/ai/itinerary/chatStore";
import { summarizeItineraryChat } from "@/lib/ai/itinerary/summarizer";
import { recordApiRequestMetric } from "@/lib/telemetry/server";

const MAX_OPERATIONS = 25;
const CONFIRMATION_BATCH_THRESHOLD = 10;
const SHOULD_LOG_AI_ITINERARY = process.env.AI_ITINERARY_LOG === "1";

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

const requireAiAssistantAccess = async (supabase: ReturnType<typeof createClient>, userId: string) => {
  const mode = getAiAssistantAccessMode();
  if (mode === "off") {
    return {
      ok: false as const,
      response: jsonError(403, "ai_disabled", "AI features are currently unavailable."),
    };
  }

  const isPro = await isActiveProSubscriber(supabase, userId);
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

  const jsonErrorTimed = (code: number, errorCode: string, message: string, details?: unknown, headers?: HeadersInit) =>
    respond(jsonError(code, errorCode, message, details, headers));

  try {
    const itineraryId = request.nextUrl.searchParams.get("itineraryId") ?? "";
    const destinationId = request.nextUrl.searchParams.get("destinationId") ?? "";

    const parsedItineraryId = ItineraryIdSchema.safeParse(itineraryId);
    const parsedDestinationId = DestinationIdSchema.safeParse(destinationId);
    if (!parsedItineraryId.success || !parsedDestinationId.success) {
      return jsonErrorTimed(400, "invalid_request", "Invalid itinerary or destination id");
    }

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return jsonErrorTimed(401, "unauthorized", "You must be signed in to use the AI assistant.");
    }
    userId = auth.user.id;

    const ip = getClientIp(request);
    const limiter = rateLimit(`ai_itinerary:get:${auth.user.id}:${ip}`, { windowMs: 60_000, max: 60 });
    if (!limiter.allowed) {
      return jsonErrorTimed(
        429,
        "rate_limited",
        "Too many requests. Please slow down.",
        undefined,
        rateLimitHeaders(limiter)
      );
    }

    const access = await requireAiAssistantAccess(supabase, auth.user.id);
    if (!access.ok) return respond(access.response);

    const isMissingColumn = (err: any, column: string) => {
      if (!err) return false;
      const code = String(err.code ?? "");
      if (code !== "42703") return false;
      const message = String(err.message ?? "").toLowerCase();
      return message.includes(column.toLowerCase());
    };

    let thread:
      | { ai_itinerary_thread_id: string; summary: string | null; draft: unknown | null; draft_sources?: unknown | null }
      | null = null;
    try {
      const { data, error } = await supabase
        .from("ai_itinerary_thread")
        .select("ai_itinerary_thread_id,summary,draft,draft_sources")
        .eq("itinerary_id", Number(itineraryId))
        .eq("itinerary_destination_id", Number(destinationId))
        .maybeSingle();

      if (error && isMissingColumn(error, "draft_sources")) {
        const { data: fallbackData } = await supabase
          .from("ai_itinerary_thread")
          .select("ai_itinerary_thread_id,summary,draft")
          .eq("itinerary_id", Number(itineraryId))
          .eq("itinerary_destination_id", Number(destinationId))
          .maybeSingle();

        if (fallbackData?.ai_itinerary_thread_id) {
          thread = {
            ai_itinerary_thread_id: String((fallbackData as any).ai_itinerary_thread_id),
            summary: (fallbackData as any).summary ?? null,
            draft: (fallbackData as any).draft ?? null,
            draft_sources: null,
          };
        }
      }

      if (data?.ai_itinerary_thread_id) {
        thread = {
          ai_itinerary_thread_id: String((data as any).ai_itinerary_thread_id),
          summary: (data as any).summary ?? null,
          draft: (data as any).draft ?? null,
          draft_sources: (data as any).draft_sources ?? null,
        };
      }
    } catch {
      // ignore
    }

    if (!thread) {
      return respond(NextResponse.json({ ok: true, messages: [], summary: null }));
    }

    try {
      const rows = await listAiItineraryMessages({
        supabase,
        threadId: thread.ai_itinerary_thread_id,
        limit: 80,
      });

      const messages = rows
        .filter((row) => row.role === "user" || row.role === "assistant")
        .map((row) => ({ role: row.role, content: row.content }));

      const draftParsed = OperationSchema.array().max(25).safeParse(thread.draft);
      const draftSourcesParsed = LinkImportDraftSourcesSchema.safeParse(thread.draft_sources);
      const draftSources = draftSourcesParsed.success ? draftSourcesParsed.data : null;
      const draftSourcesPreview = draftSources
        ? {
            sources: draftSources.sources.map((source) => ({
              provider: source.provider,
              url: source.url,
              canonicalUrl: source.canonicalUrl,
              externalId: source.externalId,
              title: source.title,
              thumbnailUrl: source.thumbnailUrl,
              embedUrl: source.embedUrl,
              blocked: source.blocked,
              blockedReason: source.blockedReason,
            })),
            pendingClarificationsCount: (draftSources.pendingClarifications ?? []).length,
          }
        : null;

      return respond(
        NextResponse.json({
          ok: true,
          threadId: thread.ai_itinerary_thread_id,
          summary: thread.summary ?? null,
          messages,
          draftOperations: draftParsed.success ? draftParsed.data : null,
          draftSources: draftSourcesPreview,
        })
      );
    } catch (error) {
      console.error("Failed to load AI chat history:", error);
      return respond(NextResponse.json({ ok: true, messages: [], summary: thread.summary ?? null }));
    }
  } finally {
    void recordApiRequestMetric({
      userId,
      route: "/api/ai/itinerary",
      method: request.method,
      status,
      durationMs: performance.now() - startedAt,
    });
  }
}

export async function DELETE(request: NextRequest) {
  const startedAt = performance.now();
  let status = 500;
  let userId: string | null = null;

  const respond = <T extends Response>(response: T) => {
    status = response.status;
    return response;
  };

  const jsonErrorTimed = (code: number, errorCode: string, message: string, details?: unknown, headers?: HeadersInit) =>
    respond(jsonError(code, errorCode, message, details, headers));

  try {
    const itineraryId = request.nextUrl.searchParams.get("itineraryId") ?? "";
    const destinationId = request.nextUrl.searchParams.get("destinationId") ?? "";

    const parsedItineraryId = ItineraryIdSchema.safeParse(itineraryId);
    const parsedDestinationId = DestinationIdSchema.safeParse(destinationId);
    if (!parsedItineraryId.success || !parsedDestinationId.success) {
      return jsonErrorTimed(400, "invalid_request", "Invalid itinerary or destination id");
    }

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return jsonErrorTimed(401, "unauthorized", "You must be signed in to use the AI assistant.");
    }
    userId = auth.user.id;

    if (!isSameOrigin(request)) {
      return jsonErrorTimed(403, "forbidden", "Invalid request origin.");
    }

    const ip = getClientIp(request);
    const limiter = rateLimit(`ai_itinerary:delete:${auth.user.id}:${ip}`, { windowMs: 60_000, max: 30 });
    if (!limiter.allowed) {
      return jsonErrorTimed(
        429,
        "rate_limited",
        "Too many requests. Please slow down.",
        undefined,
        rateLimitHeaders(limiter)
      );
    }

    const access = await requireAiAssistantAccess(supabase, auth.user.id);
    if (!access.ok) return respond(access.response);

    const { error: clearError } = await supabase
      .from("ai_itinerary_thread")
      .update({ draft: null, draft_sources: null })
      .eq("itinerary_id", Number(itineraryId))
      .eq("itinerary_destination_id", Number(destinationId));

    const missingDraftSources =
      String((clearError as any)?.code ?? "") === "42703" &&
      String((clearError as any)?.message ?? "").toLowerCase().includes("draft_sources");
    if (missingDraftSources) {
      await supabase
        .from("ai_itinerary_thread")
        .update({ draft: null })
        .eq("itinerary_id", Number(itineraryId))
        .eq("itinerary_destination_id", Number(destinationId));
    }

    return respond(NextResponse.json({ ok: true }));
  } finally {
    void recordApiRequestMetric({
      userId,
      route: "/api/ai/itinerary",
      method: request.method,
      status,
      durationMs: performance.now() - startedAt,
    });
  }
}

const normalizeTimeToHHmmss = (value: string | null): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hh = Number(match[1]);
  const mm = Number(match[2]);
  const ss = Number(match[3] ?? 0);

  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  if (ss < 0 || ss > 59) return null;

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const isIsoDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isDateOutsideRange = (date: string, fromDate: string | null, toDate: string | null) => {
  if (!fromDate || !toDate) return false;
  // YYYY-MM-DD lexicographic compare is safe
  return date < fromDate || date > toDate;
};

const normalizePlaceId = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("places/") ? trimmed.slice("places/".length) : trimmed;
};

const extractPlaceIdFromText = (value: string): string | null => {
  const text = value.trim();
  if (!text) return null;

  const direct = normalizePlaceId(text);
  if (/^ChI[a-zA-Z0-9_-]{10,}$/.test(direct) && !/\s/.test(direct)) {
    return direct;
  }

  try {
    const url = new URL(text);
    const placeIdParam =
      url.searchParams.get("place_id") || url.searchParams.get("placeid") || url.searchParams.get("placeId");
    if (placeIdParam) return normalizePlaceId(placeIdParam);

    const q = url.searchParams.get("q") || "";
    const decodedQ = q ? decodeURIComponent(q) : "";
    const qMatch = decodedQ.match(/place_id[:=]([a-zA-Z0-9_-]+)/);
    if (qMatch?.[1]) return normalizePlaceId(qMatch[1]);
  } catch {
    // Not a URL; fall back to regex match below.
  }

  const match = text.match(/place_id[:=]([a-zA-Z0-9_-]+)/);
  if (match?.[1]) return normalizePlaceId(match[1]);

  return null;
};

const extractTextQueryFromGoogleMapsUrl = (value: string): string | null => {
  const text = value.trim();
  if (!text) return null;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const isGoogleHost =
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host.endsWith(".goo.gl");

  if (!isGoogleHost) return null;

  const queryParam = url.searchParams.get("query") || url.searchParams.get("q");
  if (queryParam) {
    return queryParam.replace(/\+/g, " ").trim();
  }

  const matchPlace = url.pathname.match(/\/maps\/place\/([^/]+)/i);
  if (matchPlace?.[1]) {
    return decodeURIComponent(matchPlace[1]).replace(/\+/g, " ").trim();
  }

  const matchSearch = url.pathname.match(/\/maps\/search\/([^/]+)/i);
  if (matchSearch?.[1]) {
    return decodeURIComponent(matchSearch[1]).replace(/\+/g, " ").trim();
  }

  return null;
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const scorePlaceMatch = (query: string, candidateName: string) => {
  const queryNormalized = query.toLowerCase().trim();
  const nameNormalized = candidateName.toLowerCase().trim();
  if (!queryNormalized || !nameNormalized) return 0;
  if (nameNormalized === queryNormalized) return 1;
  if (nameNormalized.includes(queryNormalized)) return 0.95;

  const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "in", "at", "to", "of", "for", "on", "near"]);
  const queryTokens = tokenize(queryNormalized).filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
  if (queryTokens.length === 0) return 0;

  const nameTokens = new Set(tokenize(nameNormalized).filter((token) => token.length >= 2 && !STOP_WORDS.has(token)));
  const hits = queryTokens.filter((token) => nameTokens.has(token)).length;
  return hits / queryTokens.length;
};

const makeAddPlaceClarification = (query: string, cityLabel: string, options: Array<{ name: string; address?: string }>) => {
  const header = `Which place did you mean for “${query}” in ${cityLabel}?`;
  if (options.length === 0) {
    return `${header}\n\nPlease reply with a specific place name, or paste a Google Maps link.`;
  }

  const lines = options
    .slice(0, 3)
    .map((opt, idx) => `${idx + 1}) ${opt.name}${opt.address ? ` — ${opt.address}` : ""}`)
    .join("\n");

  return `${header}\n\n${lines}\n\nReply with the correct option (or paste a Google Maps link).`;
};

const resolveAddPlaceOperation = async (args: {
  proposed: Extract<ProposedOperation, { op: "add_place" }>;
  destination: any;
}): Promise<{ resolved?: Operation; clarification?: string }> => {
  const proposedPlaceId =
    typeof (args.proposed as any).placeId === "string" ? normalizePlaceId((args.proposed as any).placeId) : "";
  const rawQuery = typeof (args.proposed as any).query === "string" ? String((args.proposed as any).query) : "";
  const query = rawQuery.trim();
  const displayQuery =
    extractTextQueryFromGoogleMapsUrl(query) ||
    (typeof (args.proposed as any).name === "string" ? String((args.proposed as any).name).trim() : "") ||
    query ||
    proposedPlaceId;
  const touchesTime = args.proposed.startTime !== undefined || args.proposed.endTime !== undefined;
  if (touchesTime && args.proposed.date === undefined) {
    return { clarification: `What date should I schedule “${displayQuery}” for?` };
  }
  if (args.proposed.date === null) {
    const bothNull = args.proposed.startTime === null && args.proposed.endTime === null;
    if (touchesTime && !bothNull) {
      return {
        clarification: `To unschedule “${displayQuery}”, should I clear the time as well? If so, reply “yes, clear the time” (or give a new date/time).`,
      };
    }
  }

  const city = typeof args.destination?.city === "string" ? args.destination.city : "";
  const country = typeof args.destination?.country === "string" ? args.destination.country : "";
  const cityLabel = city && country ? `${city}, ${country}` : city || country || "this destination";

  if (proposedPlaceId) {
    let placeName: string | undefined = typeof (args.proposed as any).name === "string" ? (args.proposed as any).name : undefined;
    try {
      if (!placeName) {
        const place = await fetchPlaceDetails(proposedPlaceId);
        placeName = (place as any)?.name || undefined;
      }
    } catch {
      // ignore, still allow using placeId
    }

    return {
      resolved: {
        op: "add_place",
        placeId: proposedPlaceId,
        query: query ? displayQuery : undefined,
        name: placeName,
        date: args.proposed.date,
        startTime: args.proposed.startTime,
        endTime: args.proposed.endTime,
        notes: args.proposed.notes,
      },
    };
  }

  const extractedPlaceId = extractPlaceIdFromText(query);
  if (extractedPlaceId) {
    try {
      const place = await fetchPlaceDetails(extractedPlaceId);
      return {
        resolved: {
          op: "add_place",
          placeId: extractedPlaceId,
          query: displayQuery,
          name: (place as any)?.name || undefined,
          date: args.proposed.date,
          startTime: args.proposed.startTime,
          endTime: args.proposed.endTime,
          notes: args.proposed.notes,
        },
      };
    } catch {
      return {
        clarification: makeAddPlaceClarification(displayQuery, cityLabel, []),
      };
    }
  }

  if (!query) {
    return {
      clarification: makeAddPlaceClarification(displayQuery || "that place", cityLabel, []),
    };
  }

  if (!city || !country) {
    return {
      clarification: `I can add a place, but I need a specific place name or a Google Maps link.\n\nWhat place should I add?`,
    };
  }

  try {
    const textQuery = extractTextQueryFromGoogleMapsUrl(query) || query;
    const { latitude, longitude } = await fetchCityCoordinates(city, country);
    const results = await searchPlacesByText(textQuery, latitude, longitude, 20000);

    if (!Array.isArray(results) || results.length === 0) {
      return { clarification: makeAddPlaceClarification(displayQuery, cityLabel, []) };
    }

    if (results.length === 1) {
      const best = results[0] as any;
      const placeId = normalizePlaceId(String(best?.place_id ?? ""));
      if (!placeId) return { clarification: makeAddPlaceClarification(displayQuery, cityLabel, []) };
      return {
        resolved: {
          op: "add_place",
          placeId,
          query: displayQuery,
          name: typeof best?.name === "string" ? best.name : undefined,
          date: args.proposed.date,
          startTime: args.proposed.startTime,
          endTime: args.proposed.endTime,
          notes: args.proposed.notes,
        },
      };
    }

    const ranked = results
      .slice(0, 6)
      .map((candidate) => ({
        candidate: candidate as any,
        score: scorePlaceMatch(displayQuery, String((candidate as any)?.name ?? "")),
      }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    const second = ranked[1];
    const bestScore = best?.score ?? 0;
    const secondScore = second?.score ?? 0;

    const bestPlaceId = normalizePlaceId(String(best?.candidate?.place_id ?? ""));
    const isClearBest = bestScore >= 0.75 && bestScore - secondScore >= 0.2;

    if (bestPlaceId && isClearBest) {
      return {
        resolved: {
          op: "add_place",
          placeId: bestPlaceId,
          query: displayQuery,
          name: typeof best?.candidate?.name === "string" ? best.candidate.name : undefined,
          date: args.proposed.date,
          startTime: args.proposed.startTime,
          endTime: args.proposed.endTime,
          notes: args.proposed.notes,
        },
      };
    }

    return {
      clarification: makeAddPlaceClarification(
        displayQuery,
        cityLabel,
        results.slice(0, 3).map((candidate: any) => ({
          name: String(candidate?.name ?? "Unknown"),
          address: typeof candidate?.address === "string" ? candidate.address : undefined,
        }))
      ),
    };
  } catch {
    return {
      clarification: `I couldn't look up places right now. Please paste a Google Maps link for the place you want to add.`,
    };
  }
};

const formatTimeHHmm = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
};

const formatTimeRange = (start: unknown, end: unknown): string | null => {
  const s = formatTimeHHmm(start);
  const e = formatTimeHHmm(end);
  if (s && e) return `${s}–${e}`;
  if (s) return s;
  if (e) return `—–${e}`;
  return null;
};

const buildPreviewLines = (
  operations: Operation[],
  activityById: Map<string, any>
): string[] => {
  const lines: string[] = [];
  for (const operation of operations) {
    if (operation.op === "add_place") {
      const name = operation.name || operation.query || "New place";
      const date = typeof operation.date === "string" ? operation.date : null;
      const time = formatTimeRange(operation.startTime, operation.endTime);
      const when = date || time ? ` (${[date, time].filter(Boolean).join(" ")})` : "";
      lines.push(`Add "${name}"${when}`);
      continue;
    }

    const row = activityById.get(operation.itineraryActivityId);
    const name = row?.activity?.name ?? `Activity ${operation.itineraryActivityId}`;
    const beforeDate = isIsoDate(row?.date) ? row.date : row?.date ?? null;
    const beforeTime = formatTimeRange(row?.start_time, row?.end_time);
    const beforeSchedule =
      beforeDate || beforeTime
        ? `${beforeDate ?? "unscheduled"}${beforeTime ? ` ${beforeTime}` : ""}`
        : null;

    if (operation.op === "remove_activity") {
      lines.push(`Remove "${name}"${beforeSchedule ? ` (was ${beforeSchedule})` : ""}`);
      continue;
    }

    if (operation.op === "update_activity") {
      if (operation.date !== undefined) {
        if (operation.date === null) {
          lines.push(`Unschedule "${name}"${beforeSchedule ? ` (was ${beforeSchedule})` : ""}`);
        } else {
          lines.push(`Date for "${name}": ${beforeDate ?? "unscheduled"} → ${operation.date}`);
        }
      }
      if (operation.startTime !== undefined || operation.endTime !== undefined) {
        const afterTime = formatTimeRange(operation.startTime, operation.endTime);
        lines.push(`Time for "${name}": ${beforeTime ?? "none"} → ${afterTime ?? "none"}`);
      }
      if (operation.notes !== undefined) {
        const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);
        const beforeNotes = typeof row?.notes === "string" ? row.notes : row?.notes ?? null;
        const afterNotes = operation.notes;
        const beforeLabel = beforeNotes ? `"${truncate(String(beforeNotes), 60)}"` : "none";
        const afterLabel =
          typeof afterNotes === "string" && afterNotes.trim()
            ? `"${truncate(afterNotes.trim(), 60)}"`
            : "none";
        lines.push(`Notes for "${name}": ${beforeLabel} → ${afterLabel}`);
      }
    }
  }

  return lines.slice(0, 30);
};

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  let status = 500;
  let userId: string | null = null;

  const respond = <T extends Response>(response: T) => {
    status = response.status;
    return response;
  };

  const jsonErrorTimed = (code: number, errorCode: string, message: string, details?: unknown, headers?: HeadersInit) =>
    respond(jsonError(code, errorCode, message, details, headers));

  try {
    if (!isSameOrigin(request)) {
      return jsonErrorTimed(403, "forbidden", "Invalid request origin.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonErrorTimed(400, "bad_json", "Request body must be valid JSON");
    }

    const parsed = ItineraryAssistantRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonErrorTimed(400, "invalid_request", "Invalid request payload", parsed.error.format());
    }

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return jsonErrorTimed(401, "unauthorized", "You must be signed in to use the AI assistant.");
    }
    userId = auth.user.id;

    const ip = getClientIp(request);
    const limiter = rateLimit(`ai_itinerary:post:${parsed.data.mode}:${auth.user.id}:${ip}`, {
      windowMs: 60_000,
      max: parsed.data.mode === "apply" ? 10 : 20,
    });
    if (!limiter.allowed) {
      return jsonErrorTimed(
        429,
        "rate_limited",
        "Too many requests. Please slow down.",
        undefined,
        rateLimitHeaders(limiter)
      );
    }

    const access = await requireAiAssistantAccess(supabase, auth.user.id);
    if (!access.ok) return respond(access.response);

    const { itineraryId, destinationId } = parsed.data;
    const quota = await checkAiQuota({ supabase, userId: auth.user.id, tier: access.tier });

    const bootstrap = await fetchBuilderBootstrap(itineraryId, destinationId);
    if (!bootstrap.success) {
      return jsonErrorTimed(
        500,
        "bootstrap_failed",
        "Failed to load itinerary context",
        bootstrap.error ?? bootstrap.message
      );
    }

    let threadId: string;
    let threadSummary: string | null = null;
    let threadDraft: Operation[] = [];
    let threadDraftSources: unknown | null = null;
    try {
      const thread = await getOrCreateAiItineraryThread({
        supabase,
        itineraryId,
        destinationId,
        userId: auth.user.id,
      });
      threadId = thread.ai_itinerary_thread_id;
      threadSummary = thread.summary ?? null;
      threadDraft = OperationSchema.array().max(25).safeParse(thread.draft).success
        ? (OperationSchema.array().max(25).parse(thread.draft) as any)
        : [];
      threadDraftSources = (thread as any).draft_sources ?? null;
    } catch (error) {
      console.error("Failed to create AI chat thread:", error);
      return jsonErrorTimed(500, "chat_store_failed", "Something went wrong. Please try again.");
    }

    let runId: string | null = null;
    try {
      const run = await startAiItineraryRun({
        supabase,
        threadId,
        mode: parsed.data.mode,
      });
      runId = run.ai_itinerary_run_id;
    } catch (error) {
      console.error("Failed to start AI run:", error);
    }

    const destination = (bootstrap.data as any)?.destination ?? null;
    const itinerary = (bootstrap.data as any)?.itinerary ?? null;
    const fromDate = isIsoDate(destination?.from_date) ? destination.from_date : null;
    const toDate = isIsoDate(destination?.to_date) ? destination.to_date : null;
    const rawActivities = Array.isArray((bootstrap.data as any)?.activities) ? (bootstrap.data as any).activities : [];
    const activeActivities = rawActivities.filter((row: any) => row?.deleted_at == null);

    const activityById = new Map<string, any>();
    for (const row of activeActivities) {
      const id = String(row?.itinerary_activity_id ?? "");
      if (!id) continue;
      activityById.set(id, row);
    }

    if (parsed.data.mode === "plan") {
      const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
      const userText = parsed.data.message.trim();

      if (!quota.allowed) {
        if (runId) {
          await finishAiItineraryRun({
            supabase,
            runId,
            status: "failed",
            error: { code: "quota_exceeded" },
          });
        }

        return jsonErrorTimed(429, "ai_quota_exceeded", "You’ve reached your monthly AI usage limit.", {
          periodStart: quota.periodStart,
          periodEnd: quota.periodEnd,
          limit: quota.limit,
          used: quota.used,
        });
      }

    let planStepId: number | null = null;
    if (runId) {
      try {
        const step = await startAiItineraryRunStep({
          supabase,
          runId,
          kind: "plan",
          input: { itineraryId, destinationId },
        });
        planStepId = step.ai_itinerary_run_step_id;
      } catch {
        // best-effort telemetry only
      }
    }

    try {
      let userEmbedding: number[] | null = null;
      try {
        const embedded = await openaiEmbed({ input: userText, model: embeddingModel });
        userEmbedding = embedded.embedding;
        await recordAiUsage({ userId: auth.user.id, feature: "itinerary_assistant", usage: embedded.usage });
      } catch (error) {
        console.warn("Failed to create embedding (continuing without semantic retrieval):", error);
      }

      let userMessageId: number | null = null;
      try {
        userMessageId = await insertAiItineraryMessage({
          supabase,
          threadId,
          role: "user",
          content: userText,
          embedding: userEmbedding,
          embeddingModel,
        });
      } catch (error) {
        console.error("Failed to persist user chat message:", error);
      }

      const contextStep =
        runId
          ? await startAiItineraryRunStep({
              supabase,
              runId,
              kind: "context",
              input: { userMessageId, hasEmbedding: !!userEmbedding },
            }).catch(() => null)
          : null;

      const recentRows = await listAiItineraryMessages({ supabase, threadId, limit: 30 }).catch(() => []);
      const recentWithoutCurrent = userMessageId
        ? recentRows.filter((row) => Number(row.ai_itinerary_message_id) !== userMessageId)
        : recentRows;

      const matched =
        userEmbedding
          ? await matchAiItineraryMessages({
              supabase,
              threadId,
              queryEmbedding: userEmbedding,
              matchCount: 10,
            }).catch(() => [])
          : [];

      const matchedWithoutCurrent = userMessageId
        ? matched.filter((row) => Number(row.ai_itinerary_message_id) !== userMessageId)
        : matched;

      const { chatHistory, retrievedHistory } = mergeChatContext({
        recent: recentWithoutCurrent as any,
        retrieved: matchedWithoutCurrent as any,
      });

      const draftOperations =
        Array.isArray((parsed.data as any)?.draftOperations) && (parsed.data as any).draftOperations.length > 0
          ? ((parsed.data as any).draftOperations as Operation[])
          : threadDraft;

      const planResult = await planItineraryEdits({
        message: userText,
        chatHistory,
        retrievedHistory,
        summary: threadSummary,
        draftOperations,
        maxTokens: Math.max(1, Math.min(800, quota.remaining)),
        itinerary,
        destination,
        activities: activeActivities,
      });

      await recordAiUsage({ userId: auth.user.id, feature: "itinerary_assistant", usage: planResult.usage });
      const plan = planResult.data;

      const resolvedOperations: Operation[] = [];
      let dropped = 0;
      const clarifications: string[] = [];

      for (const operation of plan.operations) {
        if (operation.op === "add_place") {
          const resolved = await resolveAddPlaceOperation({ proposed: operation, destination });
          if (resolved.resolved) {
            resolvedOperations.push(resolved.resolved);
          } else if (resolved.clarification) {
            clarifications.push(resolved.clarification);
          }
          continue;
        }

        if (!activityById.has(operation.itineraryActivityId)) {
          dropped += 1;
          continue;
        }

        resolvedOperations.push(operation as Operation);
      }

      if (SHOULD_LOG_AI_ITINERARY) {
        console.info("[ai-itinerary] plan", {
          itineraryId,
          destinationId,
          userId: auth.user.id,
          proposedCount: plan.operations.length,
          resolvedCount: resolvedOperations.length,
          droppedCount: dropped,
          clarificationCount: clarifications.length,
        });
      }

      let payload: PlanResponsePayload;

      if (resolvedOperations.length > MAX_OPERATIONS) {
        const previewLines = buildPreviewLines(draftOperations, activityById);
        payload = {
          assistantMessage: `${plan.assistantMessage}\n\nThat request would change ${resolvedOperations.length} items, which exceeds the limit of ${MAX_OPERATIONS} changes per request. Please narrow it down (for example, one day or one activity at a time).`,
          operations: draftOperations,
          previewLines: [
            `Too many changes (${resolvedOperations.length}). Please narrow the request (max ${MAX_OPERATIONS} per request).`,
            ...(previewLines.length > 0 ? ["Draft unchanged:"] : []),
            ...previewLines,
          ],
          requiresConfirmation: true,
        };
      } else {
        const draftToReturn =
          resolvedOperations.length > 0 ? resolvedOperations : draftOperations;

        const requiresConfirmation =
          draftToReturn.some((op) => op.op === "remove_activity") ||
          draftToReturn.length > CONFIRMATION_BATCH_THRESHOLD ||
          draftToReturn.some(
            (op) =>
              op.op === "update_activity" &&
              typeof op.date === "string" &&
              isDateOutsideRange(op.date, fromDate, toDate)
          ) ||
          draftToReturn.some(
            (op) =>
              op.op === "add_place" &&
              typeof op.date === "string" &&
              isDateOutsideRange(op.date, fromDate, toDate)
          );

        const previewLines = buildPreviewLines(draftToReturn, activityById);

        const messageParts = [plan.assistantMessage];
        if (dropped > 0) {
          messageParts.push(`Note: I ignored ${dropped} edit(s) because I couldn't find the referenced activity.`);
        }
        if (clarifications.length > 0) {
          messageParts.push(...clarifications);
        }

        payload = {
          assistantMessage: messageParts.join("\n\n"),
          operations: draftToReturn,
          previewLines,
          requiresConfirmation,
        };
      }

      // Persist the draft only if the model produced a concrete updated plan.
      if (resolvedOperations.length > 0 && resolvedOperations.length <= MAX_OPERATIONS) {
        try {
          await updateAiItineraryThreadDraftAndSources({
            supabase,
            threadId,
            draft: resolvedOperations,
            draftSources: null,
          });
          threadDraft = resolvedOperations;
          threadDraftSources = null;
        } catch (error) {
          console.warn("Failed to persist AI chat draft:", error);
        }
      }

      try {
        let assistantEmbedding: number[] | null = null;
        try {
          const embedded = await openaiEmbed({ input: payload.assistantMessage, model: embeddingModel });
          assistantEmbedding = embedded.embedding;
          await recordAiUsage({ userId: auth.user.id, feature: "itinerary_assistant", usage: embedded.usage });
        } catch {
          assistantEmbedding = null;
        }

        await insertAiItineraryMessage({
          supabase,
          threadId,
          role: "assistant",
          content: payload.assistantMessage,
          metadata: {
            mode: "plan",
            requiresConfirmation: payload.requiresConfirmation,
            previewLines: payload.previewLines,
            operationCount: payload.operations.length,
          },
          embedding: assistantEmbedding,
          embeddingModel,
        });
      } catch (error) {
        console.error("Failed to persist assistant chat message:", error);
      }

      // Best-effort rolling summary (non-blocking).
      try {
        const summarySource = [
          ...chatHistory,
          { role: "user" as const, content: userText },
          { role: "assistant" as const, content: payload.assistantMessage },
        ];
        const summaryResult = await summarizeItineraryChat({
          previousSummary: threadSummary,
          messages: summarySource.slice(-20),
        });
        await recordAiUsage({ userId: auth.user.id, feature: "itinerary_assistant", usage: summaryResult.usage });

        threadSummary = summaryResult.summary;
        await updateAiItineraryThreadSummary({ supabase, threadId, summary: summaryResult.summary });
      } catch (error) {
        console.warn("Failed to update AI chat summary:", error);
      }

      if (contextStep?.ai_itinerary_run_step_id) {
        await finishAiItineraryRunStep({
          supabase,
          stepId: contextStep.ai_itinerary_run_step_id,
          status: "succeeded",
          output: {
            recentCount: recentWithoutCurrent.length,
            retrievedCount: matchedWithoutCurrent.length,
            summaryPresent: !!threadSummary,
          },
        });
      }
      if (planStepId) {
        await finishAiItineraryRunStep({
          supabase,
          stepId: planStepId,
          status: "succeeded",
          output: { resolvedCount: payload.operations.length, requiresConfirmation: payload.requiresConfirmation },
        });
      }
      if (runId) {
        await finishAiItineraryRun({ supabase, runId, status: "succeeded" });
      }

      return respond(NextResponse.json({ ok: true, mode: "plan", ...payload }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to plan edits";
      const isMissingApiKey = /OPENAI_API_KEY/i.test(message);
      const code = isMissingApiKey ? "missing_api_key" : "plan_failed";
      const safeMessage = "Something went wrong. Please try again.";

      if (planStepId) {
        await finishAiItineraryRunStep({
          supabase,
          stepId: planStepId,
          status: "failed",
          error: { message: safeMessage },
        });
      }
      if (runId) {
        await finishAiItineraryRun({ supabase, runId, status: "failed", error: { code } });
      }

      return jsonErrorTimed(500, code, safeMessage);
    }
  }

  if (parsed.data.mode === "import") {
    const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
    const userText = parsed.data.message.trim();

    if (!quota.allowed) {
      if (runId) {
        await finishAiItineraryRun({
          supabase,
          runId,
          status: "failed",
          error: { code: "quota_exceeded" },
        });
      }

      return jsonErrorTimed(429, "ai_quota_exceeded", "You’ve reached your monthly AI usage limit.", {
        periodStart: quota.periodStart,
        periodEnd: quota.periodEnd,
        limit: quota.limit,
        used: quota.used,
      });
    }

    const destinationContext = {
      city: typeof destination?.city === "string" ? destination.city : null,
      country: typeof destination?.country === "string" ? destination.country : null,
    };

    const existingDraftSourcesParsed = LinkImportDraftSourcesSchema.safeParse(threadDraftSources);
    const existingDraftSources = existingDraftSourcesParsed.success ? existingDraftSourcesParsed.data : null;

    let contextStepId: number | null = null;
    let fetchStepId: number | null = null;
    let extractStepId: number | null = null;
    let resolveStepId: number | null = null;

    try {
      let userEmbedding: number[] | null = null;
      try {
        const embedded = await openaiEmbed({ input: userText, model: embeddingModel });
        userEmbedding = embedded.embedding;
        await recordAiUsage({ userId: auth.user.id, feature: "itinerary_assistant", usage: embedded.usage });
      } catch {
        userEmbedding = null;
      }

      let userMessageId: number | null = null;
      try {
        userMessageId = await insertAiItineraryMessage({
          supabase,
          threadId,
          role: "user",
          content: userText,
          metadata: { mode: "import" },
          embedding: userEmbedding,
          embeddingModel,
        });
      } catch (error) {
        console.error("Failed to persist user import message:", error);
      }

      if (runId) {
        const step = await startAiItineraryRunStep({
          supabase,
          runId,
          kind: "context",
          input: { userMessageId, hasEmbedding: !!userEmbedding },
        }).catch(() => null);
        contextStepId = step?.ai_itinerary_run_step_id ?? null;
      }

      if (runId) {
        const step = await startAiItineraryRunStep({
          supabase,
          runId,
          kind: "import_fetch",
          input: { maxUrls: 3 },
        }).catch(() => null);
        fetchStepId = step?.ai_itinerary_run_step_id ?? null;
      }

      const ingested = await ingestUrlsFromMessage({ message: userText, maxUrls: 3 });

      const providerCounts: Record<string, number> = {};
      let blockedCount = 0;
      for (const row of ingested) {
        providerCounts[row.source.provider] = (providerCounts[row.source.provider] ?? 0) + 1;
        if (row.debug?.blocked) blockedCount += 1;
      }

      if (fetchStepId) {
        await finishAiItineraryRunStep({
          supabase,
          stepId: fetchStepId,
          status: "succeeded",
          output: {
            ingestedCount: ingested.length,
            providerCounts,
            blockedCount,
          },
        });
      }

      const sourcesForPreview: ImportResponsePayload["sources"] = (existingDraftSources?.sources ?? []).map((source) => ({
        provider: source.provider,
        url: source.url,
        canonicalUrl: source.canonicalUrl,
        externalId: source.externalId,
        title: source.title,
        thumbnailUrl: source.thumbnailUrl,
        embedUrl: source.embedUrl,
        blocked: source.blocked,
        blockedReason: source.blockedReason,
      }));

      const respondImport = async (payload: ImportResponsePayload, draftSourcesToPersist: unknown | null) => {
        try {
          let assistantEmbedding: number[] | null = null;
          try {
            const embedded = await openaiEmbed({ input: payload.assistantMessage, model: embeddingModel });
            assistantEmbedding = embedded.embedding;
            await recordAiUsage({ userId: auth.user.id, feature: "itinerary_assistant", usage: embedded.usage });
          } catch {
            assistantEmbedding = null;
          }

          await insertAiItineraryMessage({
            supabase,
            threadId,
            role: "assistant",
            content: payload.assistantMessage,
            metadata: {
              mode: "import",
              previewLines: payload.previewLines,
              operationCount: payload.operations.length,
              sourceCount: payload.sources.length,
            },
            embedding: assistantEmbedding,
            embeddingModel,
          });
        } catch (error) {
          console.error("Failed to persist assistant import message:", error);
        }

        try {
          const draftToPersist = payload.operations.length > 0 ? payload.operations : null;
          await updateAiItineraryThreadDraftAndSources({
            supabase,
            threadId,
            draft: draftToPersist,
            draftSources: draftSourcesToPersist,
          });
          threadDraft = payload.operations;
          threadDraftSources = draftSourcesToPersist;
        } catch (error) {
          console.warn("Failed to persist import draft:", error);
        }

        if (contextStepId) {
          await finishAiItineraryRunStep({
            supabase,
            stepId: contextStepId,
            status: "succeeded",
            output: { hasDraft: payload.operations.length > 0 },
          });
        }

        if (runId) {
          await finishAiItineraryRun({ supabase, runId, status: "succeeded" });
        }

        return respond(NextResponse.json({ ok: true, mode: "import", ...payload }));
      };

      // Follow-up clarification flow: user replies with an option number or a more specific query.
      const followupText = userText.trim();
      const followupNumberMatch = followupText.match(/^(\d{1,2})$/);
      const followupPlaceId = extractPlaceIdFromText(followupText);
      const hasPendingClarifications = (existingDraftSources?.pendingClarifications?.length ?? 0) > 0;
      const isClarificationReply = !!followupNumberMatch || !!followupPlaceId || ingested.length === 0;

      if (hasPendingClarifications && isClarificationReply) {
        const pending = existingDraftSources!.pendingClarifications![0]!;
        const remainingPending = (existingDraftSources?.pendingClarifications ?? []).slice(1);

        const trimmed = followupText;
        const numberMatch = followupNumberMatch;

        const pickByIndex = (idx: number) => {
          const option = pending.options[idx];
          if (!option) return null;
          return { placeId: normalizePlaceId(option.placeId), name: option.name };
        };

        const directPlaceId = followupPlaceId;

        let resolvedOp: Extract<Operation, { op: "add_place" }> | null = null;
        let resolvedAttributions: any[] = [];
        let newPending: any[] = [];
        const clarifications: string[] = [];

        if (numberMatch) {
          const idx = Number(numberMatch[1]) - 1;
          const picked = Number.isFinite(idx) ? pickByIndex(idx) : null;
          if (picked?.placeId) {
            resolvedOp = {
              op: "add_place",
              placeId: picked.placeId,
              query: pending.query,
              name: picked.name,
              date: null,
            };
            resolvedAttributions = [
              {
                placeId: picked.placeId,
                sourceCanonicalUrl: pending.sourceCanonicalUrl,
                snippet: pending.evidence,
                timestampSeconds: null,
              },
            ];
          } else {
            clarifications.push(
              `Please reply with 1–${pending.options.length} for “${pending.query}”, or paste a Google Maps link.`
            );
          }
        } else if (directPlaceId) {
          const normalized = normalizePlaceId(directPlaceId);
          resolvedOp = {
            op: "add_place",
            placeId: normalized,
            query: pending.query,
            date: null,
          };
          resolvedAttributions = [
            {
              placeId: normalized,
              sourceCanonicalUrl: pending.sourceCanonicalUrl,
              snippet: pending.evidence,
              timestampSeconds: null,
            },
          ];
        } else {
          if (runId) {
            const step = await startAiItineraryRunStep({
              supabase,
              runId,
              kind: "resolve",
              input: { kind: "clarification_query", query: trimmed },
            }).catch(() => null);
            resolveStepId = step?.ai_itinerary_run_step_id ?? null;
          }

          const followupResolved = await resolveLinkImportCandidates({
            destination: destinationContext,
            candidates: [
              {
                sourceCanonicalUrl: pending.sourceCanonicalUrl,
                query: trimmed,
                evidence: pending.evidence ?? trimmed,
                confidence: 1,
              },
            ],
            maxOperations: 1,
          });

          resolvedOp = followupResolved.operations[0] ?? null;
          resolvedAttributions = followupResolved.attributions;
          newPending = followupResolved.pendingClarifications ?? [];
          clarifications.push(...(followupResolved.clarifications ?? []));

          if (resolveStepId) {
            await finishAiItineraryRunStep({
              supabase,
              stepId: resolveStepId,
              status: "succeeded",
              output: {
                resolvedCount: followupResolved.operations.length,
                clarificationCount: followupResolved.clarifications.length,
              },
            });
          }
        }

        const existingOps = Array.isArray(threadDraft) ? threadDraft : [];
        const mergedOps: Array<Extract<Operation, { op: "add_place" }>> = [];
        const seenPlaceIds = new Set<string>();

        for (const op of existingOps) {
          if (op.op !== "add_place") continue;
          const pid = normalizePlaceId(String(op.placeId ?? ""));
          if (!pid) continue;
          if (seenPlaceIds.has(pid)) continue;
          seenPlaceIds.add(pid);
          mergedOps.push({ ...op, placeId: pid } as any);
        }

        if (resolvedOp?.placeId) {
          const pid = normalizePlaceId(String(resolvedOp.placeId));
          if (!seenPlaceIds.has(pid)) {
            seenPlaceIds.add(pid);
            mergedOps.push({ ...resolvedOp, placeId: pid });
          }
        }

        if (mergedOps.length > 15) {
          return respondImport(
            {
              assistantMessage: `That would add ${mergedOps.length} places, which exceeds the limit of 15. Please remove some items from the draft first.`,
              operations: existingOps.filter((op) => op.op === "add_place").slice(0, 15) as any,
              previewLines: buildPreviewLines(existingOps, activityById),
              requiresConfirmation: true,
              sources: sourcesForPreview,
              pendingClarificationsCount: (existingDraftSources?.pendingClarifications ?? []).length,
            },
            existingDraftSources
          );
        }

        const mergedAttributions = [
          ...((existingDraftSources?.attributions ?? []) as any[]),
          ...(Array.isArray(resolvedAttributions) ? resolvedAttributions : []),
        ];

        const draftSourcesToPersist = {
          version: 1,
          sources: existingDraftSources?.sources ?? [],
          attributions: mergedAttributions,
          pendingClarifications: resolvedOp ? [...remainingPending, ...newPending] : [...existingDraftSources!.pendingClarifications!],
        };

        const assistantParts: string[] = [];
        if (resolvedOp?.placeId) {
          assistantParts.push(
            `Got it — I’ll add ${resolvedOp.name ?? resolvedOp.query ?? "that place"} as an unscheduled draft activity.`
          );
        }
        if (clarifications.length > 0) assistantParts.push(...clarifications);
        if (assistantParts.length === 0) assistantParts.push("Please reply with an option number, or paste a Google Maps link.");

        const payload: ImportResponsePayload = {
          assistantMessage: assistantParts.join("\n\n"),
          operations: mergedOps,
          previewLines: buildPreviewLines(mergedOps, activityById),
          requiresConfirmation: mergedOps.length > CONFIRMATION_BATCH_THRESHOLD,
          sources: sourcesForPreview,
          pendingClarificationsCount: (draftSourcesToPersist.pendingClarifications ?? []).length,
        };

        return respondImport(payload, draftSourcesToPersist);
      }

      if (ingested.length === 0) {
        const payload: ImportResponsePayload = {
          assistantMessage:
            "Paste up to 3 links (YouTube Shorts, TikTok, Instagram Reels, TripAdvisor, or a travel webpage) and I’ll extract places to add as unscheduled draft activities.",
          operations: [],
          previewLines: [],
          requiresConfirmation: false,
          sources: sourcesForPreview,
          pendingClarificationsCount: (existingDraftSources?.pendingClarifications ?? []).length,
        };
        return respondImport(payload, existingDraftSources);
      }

      if (runId) {
        const step = await startAiItineraryRunStep({
          supabase,
          runId,
          kind: "extract",
          input: { sourceCount: ingested.length },
        }).catch(() => null);
        extractStepId = step?.ai_itinerary_run_step_id ?? null;
      }

      const extracted = await extractPlaceCandidatesFromSources({
        destination: destinationContext,
        sources: ingested,
        maxTokens: Math.max(1, Math.min(800, quota.remaining)),
      });
      await recordAiUsage({ userId: auth.user.id, feature: "itinerary_assistant", usage: extracted.usage });

      const allowedCanonicalUrls = new Set(ingested.map((row) => row.source.canonicalUrl));
      const candidates = extracted.data.candidates.filter((c) => allowedCanonicalUrls.has(c.sourceCanonicalUrl));

      if (extractStepId) {
        await finishAiItineraryRunStep({
          supabase,
          stepId: extractStepId,
          status: "succeeded",
          output: { candidateCount: candidates.length },
        });
      }

      if (runId) {
        const step = await startAiItineraryRunStep({
          supabase,
          runId,
          kind: "resolve",
          input: { candidateCount: candidates.length, maxOperations: 15 },
        }).catch(() => null);
        resolveStepId = step?.ai_itinerary_run_step_id ?? null;
      }

      const resolved = await resolveLinkImportCandidates({
        destination: destinationContext,
        candidates,
        maxOperations: 15,
      });

      if (resolveStepId) {
        await finishAiItineraryRunStep({
          supabase,
          stepId: resolveStepId,
          status: "succeeded",
          output: {
            resolvedCount: resolved.operations.length,
            dropped: resolved.dropped,
            clarificationCount: resolved.clarifications.length,
          },
        });
      }

      const draftSourcesToPersist = {
        version: 1,
        sources: ingested.map((row) => ({
          provider: row.source.provider,
          url: row.source.url,
          canonicalUrl: row.source.canonicalUrl,
          externalId: row.source.externalId,
          title: row.source.title,
          thumbnailUrl: row.source.thumbnailUrl,
          embedUrl: row.source.embedUrl,
          rawMetadata: row.source.rawMetadata,
          blocked: row.debug?.blocked,
          blockedReason: row.debug?.reason,
        })),
        attributions: resolved.attributions,
        pendingClarifications: resolved.pendingClarifications,
      };

      const messageParts = [extracted.data.assistantMessage];
      if (resolved.dropped > 0) {
        messageParts.push(`Note: I skipped ${resolved.dropped} item(s) I couldn't confidently match to a place.`);
      }
      if (resolved.clarifications.length > 0) {
        messageParts.push(...resolved.clarifications);
      }
      if (resolved.operations.length === 0 && resolved.clarifications.length === 0) {
        messageParts.push("I couldn't find any specific places to add. If you can, paste the caption/description text.");
      }

      const sourcesPreview: ImportResponsePayload["sources"] = draftSourcesToPersist.sources.map((source) => ({
        provider: source.provider,
        url: source.url,
        canonicalUrl: source.canonicalUrl,
        externalId: source.externalId,
        title: source.title,
        thumbnailUrl: source.thumbnailUrl,
        embedUrl: source.embedUrl,
        blocked: source.blocked,
        blockedReason: source.blockedReason,
      }));

      const payload: ImportResponsePayload = {
        assistantMessage: messageParts.join("\n\n"),
        operations: resolved.operations,
        previewLines: buildPreviewLines(resolved.operations, activityById),
        requiresConfirmation: resolved.operations.length > CONFIRMATION_BATCH_THRESHOLD,
        sources: sourcesPreview,
        pendingClarificationsCount: (draftSourcesToPersist.pendingClarifications ?? []).length,
      };

      return respondImport(payload, draftSourcesToPersist);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import places from link(s)";
      const isMissingApiKey = /OPENAI_API_KEY/i.test(message);
      const code = isMissingApiKey ? "missing_api_key" : "import_failed";
      const safeMessage = "Something went wrong. Please try again.";

      if (fetchStepId) {
        await finishAiItineraryRunStep({
          supabase,
          stepId: fetchStepId,
          status: "failed",
          error: { message: safeMessage },
        });
      }
      if (extractStepId) {
        await finishAiItineraryRunStep({
          supabase,
          stepId: extractStepId,
          status: "failed",
          error: { message: safeMessage },
        });
      }
      if (resolveStepId) {
        await finishAiItineraryRunStep({
          supabase,
          stepId: resolveStepId,
          status: "failed",
          error: { message: safeMessage },
        });
      }
      if (runId) {
        await finishAiItineraryRun({ supabase, runId, status: "failed", error: { code } });
      }

      return jsonErrorTimed(500, code, safeMessage);
    }
  }

  if (parsed.data.mode !== "apply") {
    return jsonErrorTimed(400, "invalid_request", "Invalid request payload");
  }

  // apply
  const operations = parsed.data.operations;
  const importDraftSourcesParsed = LinkImportDraftSourcesSchema.safeParse(threadDraftSources);
  const importDraftSources = importDraftSourcesParsed.success ? importDraftSourcesParsed.data : null;

  const importSourceByCanonicalUrl = new Map<string, any>();
  for (const source of importDraftSources?.sources ?? []) {
    importSourceByCanonicalUrl.set(String(source.canonicalUrl), source);
  }

  const importAttributionsByPlaceId = new Map<string, any[]>();
  for (const attribution of importDraftSources?.attributions ?? []) {
    const pid = normalizePlaceId(String((attribution as any)?.placeId ?? ""));
    const src = String((attribution as any)?.sourceCanonicalUrl ?? "");
    if (!pid || !src) continue;
    const list = importAttributionsByPlaceId.get(pid) ?? [];
    list.push({ ...attribution, placeId: pid, sourceCanonicalUrl: src });
    importAttributionsByPlaceId.set(pid, list);
  }

  const itinerarySourceIdByCanonicalUrl = new Map<string, string>();
  let canWriteAttributions: boolean | null = null;

  const applyRequiresConfirmation =
    operations.some((op) => op.op === "remove_activity") ||
    operations.length > CONFIRMATION_BATCH_THRESHOLD ||
    operations.some(
      (op) =>
        op.op === "update_activity" &&
        typeof op.date === "string" &&
        isDateOutsideRange(op.date, fromDate, toDate)
    ) ||
    operations.some(
      (op) =>
        op.op === "add_place" &&
        typeof op.date === "string" &&
        isDateOutsideRange(op.date, fromDate, toDate)
    );

  if (applyRequiresConfirmation && parsed.data.confirmed !== true) {
    if (runId) {
      await finishAiItineraryRun({
        supabase,
        runId,
        status: "failed",
        error: { code: "confirmation_required" },
      });
    }
    return jsonErrorTimed(409, "confirmation_required", "These changes require confirmation. Please confirm and retry.");
  }

  if (SHOULD_LOG_AI_ITINERARY) {
    console.info("[ai-itinerary] apply", {
      itineraryId,
      destinationId,
      userId: auth.user.id,
      operationCount: operations.length,
      confirmed: parsed.data.confirmed === true,
    });
  }

  const applied: ApplyResponsePayload["applied"] = [];
  let halted = false;

  const executeStep =
    runId
      ? await startAiItineraryRunStep({
          supabase,
          runId,
          kind: "execute",
          input: { operationCount: operations.length },
        }).catch(() => null)
      : null;

  for (const operation of operations) {
    if (halted) {
      applied.push({
        ok: false,
        operation,
        error: "Skipped due to a previous failure.",
      });
      continue;
    }

    try {
      if (operation.op === "add_place") {
        const result = await addPlaceToItinerary({
          itineraryId,
          destinationId,
          placeId: operation.placeId,
          date: operation.date,
          startTime: operation.startTime,
          endTime: operation.endTime,
          notes: operation.notes,
        });

        if (!result.success) {
          throw new Error(result.error?.message || "Failed to add place");
        }

        // Best-effort: write attribution rows for link-import drafts.
        if (canWriteAttributions !== false && importDraftSources) {
          const itineraryActivityId = Number((result.data as any)?.itineraryActivity?.itinerary_activity_id ?? "");
          const placeId = normalizePlaceId(String(operation.placeId ?? ""));

          const attributions = placeId ? importAttributionsByPlaceId.get(placeId) ?? [] : [];
          if (itineraryActivityId && attributions.length > 0) {
            for (const attribution of attributions) {
              const canonicalUrl = String((attribution as any)?.sourceCanonicalUrl ?? "");
              const source = canonicalUrl ? importSourceByCanonicalUrl.get(canonicalUrl) : null;
              if (!source) continue;

              const cachedSourceId = itinerarySourceIdByCanonicalUrl.get(canonicalUrl);
              let itinerarySourceId = cachedSourceId ?? null;

              if (!itinerarySourceId) {
                const payload: Record<string, any> = {
                  itinerary_id: Number(itineraryId),
                  itinerary_destination_id: Number(destinationId),
                  provider: source.provider,
                  url: source.url,
                  canonical_url: source.canonicalUrl,
                  external_id: source.externalId ?? null,
                  title: source.title ?? null,
                  thumbnail_url: source.thumbnailUrl ?? null,
                  embed_url: source.embedUrl ?? null,
                  raw_metadata: source.rawMetadata ?? {},
                  created_by: auth.user.id,
                };

                const { data: upserted, error: upsertError } = await supabase
                  .from("itinerary_source")
                  .upsert(payload, { onConflict: "itinerary_id,canonical_url" })
                  .select("itinerary_source_id")
                  .single();

                if (upsertError || !upserted) {
                  const code = String((upsertError as any)?.code ?? "");
                  const isMissingTable = code === "42P01";
                  const isMissingColumn = code === "42703";
                  const forbidden = code === "42501";
                  if (isMissingTable || isMissingColumn || forbidden) {
                    canWriteAttributions = false;
                    break;
                  }
                  console.warn("Failed to upsert itinerary_source:", upsertError);
                  break;
                }

                itinerarySourceId = String((upserted as any).itinerary_source_id ?? "");
                if (!itinerarySourceId) continue;
                itinerarySourceIdByCanonicalUrl.set(canonicalUrl, itinerarySourceId);
                canWriteAttributions = true;
              }

              const joinPayload: Record<string, any> = {
                itinerary_activity_id: itineraryActivityId,
                itinerary_source_id: itinerarySourceId,
                snippet: (attribution as any)?.snippet ?? null,
                timestamp_seconds: (attribution as any)?.timestampSeconds ?? null,
              };

              const { error: joinError } = await supabase
                .from("itinerary_activity_source")
                .upsert(joinPayload, { onConflict: "itinerary_activity_id,itinerary_source_id" });

              if (joinError) {
                const code = String((joinError as any)?.code ?? "");
                const isMissingTable = code === "42P01";
                const forbidden = code === "42501";
                if (isMissingTable || forbidden) {
                  canWriteAttributions = false;
                  break;
                }
                console.warn("Failed to upsert itinerary_activity_source:", joinError);
                break;
              }
            }
          }
        }

        applied.push({ ok: true, operation });

        if (executeStep?.ai_itinerary_run_step_id) {
          await insertAiItineraryToolInvocation({
            supabase,
            stepId: executeStep.ai_itinerary_run_step_id,
            toolName: operation.op,
            status: "succeeded",
            toolArgs: operation,
          });
        }
        continue;
      }

      if (!activityById.has(operation.itineraryActivityId)) {
        applied.push({
          ok: false,
          operation,
          error: "Activity not found (or already removed).",
        });
        halted = true;

        if (executeStep?.ai_itinerary_run_step_id) {
          await insertAiItineraryToolInvocation({
            supabase,
            stepId: executeStep.ai_itinerary_run_step_id,
            toolName: operation.op,
            status: "failed",
            toolArgs: operation,
            result: { error: "Activity not found (or already removed)." },
          });
        }
        continue;
      }

      if (operation.op === "remove_activity") {
        const result = await softDeleteTableData2("itinerary_activity", {
          itinerary_activity_id: operation.itineraryActivityId,
        });
        if (!result.success) {
          throw new Error(result.message || "Failed to remove activity");
        }
        applied.push({ ok: true, operation });

        if (executeStep?.ai_itinerary_run_step_id) {
          await insertAiItineraryToolInvocation({
            supabase,
            stepId: executeStep.ai_itinerary_run_step_id,
            toolName: operation.op,
            status: "succeeded",
            toolArgs: operation,
          });
        }
        continue;
      }

      if (operation.op === "update_activity") {
        const update: Record<string, any> = {};

        if (operation.date !== undefined) {
          update.date = operation.date;
          if (operation.date === null) {
            update.start_time = null;
            update.end_time = null;
          }
        }

        const isUnscheduling = operation.date === null;

        if (!isUnscheduling && operation.startTime !== undefined) {
          const normalized = normalizeTimeToHHmmss(operation.startTime);
          if (operation.startTime !== null && normalized == null) {
            throw new Error("Invalid startTime format");
          }
          update.start_time = normalized;
        }

        if (!isUnscheduling && operation.endTime !== undefined) {
          const normalized = normalizeTimeToHHmmss(operation.endTime);
          if (operation.endTime !== null && normalized == null) {
            throw new Error("Invalid endTime format");
          }
          update.end_time = normalized;
        }

        if (operation.notes !== undefined) {
          update.notes = operation.notes;
        }

        const start = typeof update.start_time === "string" ? update.start_time : null;
        const end = typeof update.end_time === "string" ? update.end_time : null;
        if (start && end && start >= end) {
          throw new Error("Start time must be before end time");
        }

        if (Object.keys(update).length === 0) {
          throw new Error("No changes provided");
        }

        const { error } = await supabase
          .from("itinerary_activity")
          .update(update)
          .eq("itinerary_activity_id", operation.itineraryActivityId);

        if (error) {
          throw new Error(error.message || "Database update failed");
        }

        applied.push({ ok: true, operation });

        if (executeStep?.ai_itinerary_run_step_id) {
          await insertAiItineraryToolInvocation({
            supabase,
            stepId: executeStep.ai_itinerary_run_step_id,
            toolName: operation.op,
            status: "succeeded",
            toolArgs: operation,
          });
        }
      }
    } catch (error) {
      applied.push({
        ok: false,
        operation,
        error: error instanceof Error ? error.message : "Operation failed",
      });
      halted = true;

      if (executeStep?.ai_itinerary_run_step_id) {
        await insertAiItineraryToolInvocation({
          supabase,
          stepId: executeStep.ai_itinerary_run_step_id,
          toolName: operation.op,
          status: "failed",
          toolArgs: operation,
          result: { error: error instanceof Error ? error.message : "Operation failed" },
        });
      }
    }
  }

  const anyFailed = applied.some((entry) => !entry.ok);
  const okCount = applied.filter((entry) => entry.ok).length;
  const skippedCount = applied.filter((entry) => entry.error === "Skipped due to a previous failure.").length;

  const refreshed = await fetchBuilderBootstrap(itineraryId, destinationId);
  const payload: ApplyResponsePayload = {
    assistantMessage: anyFailed
      ? `Applied ${okCount} change(s). Some changes failed${skippedCount ? ` (skipped ${skippedCount}).` : " — please review the details."}`
      : `Applied ${okCount} change(s).`,
    applied,
    bootstrap: refreshed.success ? refreshed.data : undefined,
  };

  if (SHOULD_LOG_AI_ITINERARY) {
    console.info("[ai-itinerary] apply_result", {
      itineraryId,
      destinationId,
      userId: auth.user.id,
      okCount,
      failedCount: applied.length - okCount,
      skippedCount,
    });
  }

  try {
    const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
    let assistantEmbedding: number[] | null = null;
    if (quota.allowed) {
      try {
        const embedded = await openaiEmbed({ input: payload.assistantMessage, model: embeddingModel });
        assistantEmbedding = embedded.embedding;
        await recordAiUsage({ userId: auth.user.id, feature: "itinerary_assistant", usage: embedded.usage });
      } catch {
        assistantEmbedding = null;
      }
    }
    await insertAiItineraryMessage({
      supabase,
      threadId,
      role: "assistant",
      content: payload.assistantMessage,
      metadata: { mode: "apply", okCount, failedCount: applied.length - okCount },
      embedding: assistantEmbedding,
      embeddingModel,
    });
  } catch (error) {
    console.error("Failed to persist assistant apply message:", error);
  }

  // Clear the saved draft only if everything applied successfully.
  if (!anyFailed) {
    try {
      await updateAiItineraryThreadDraftAndSources({ supabase, threadId, draft: null, draftSources: null });
      threadDraftSources = null;
    } catch (error) {
      console.warn("Failed to clear AI chat draft after apply:", error);
    }
  }

  if (executeStep?.ai_itinerary_run_step_id) {
    await finishAiItineraryRunStep({
      supabase,
      stepId: executeStep.ai_itinerary_run_step_id,
      status: anyFailed ? "failed" : "succeeded",
      output: { okCount, failedCount: applied.length - okCount, skippedCount },
    });
  }
  if (runId) {
    await finishAiItineraryRun({
      supabase,
      runId,
      status: anyFailed ? "failed" : "succeeded",
      error: anyFailed ? { failedCount: applied.length - okCount } : null,
    });
  }

  return respond(NextResponse.json({ ok: true, mode: "apply", ...payload }));
  } finally {
    void recordApiRequestMetric({
      userId,
      route: "/api/ai/itinerary",
      method: request.method,
      status,
      durationMs: performance.now() - startedAt,
    });
  }
}
