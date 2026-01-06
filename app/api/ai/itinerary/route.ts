import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { fetchBuilderBootstrap } from "@/actions/supabase/builderBootstrap";
import { softDeleteTableData2 } from "@/actions/supabase/actions";
import { addPlaceToItinerary } from "@/actions/supabase/activities";
import { fetchCityCoordinates, fetchPlaceDetails, searchPlacesByText } from "@/actions/google/actions";
import { planItineraryEdits } from "@/lib/ai/itinerary/planner";
import {
  ItineraryAssistantRequestSchema,
  type ProposedOperation,
  type Operation,
  type PlanResponsePayload,
  type ApplyResponsePayload,
} from "@/lib/ai/itinerary/schema";

const MAX_OPERATIONS = 25;
const CONFIRMATION_BATCH_THRESHOLD = 10;

const jsonError = (status: number, code: string, message: string, details?: unknown) => {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, details },
    },
    { status }
  );
};

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
  const query = args.proposed.query.trim();
  const displayQuery = extractTextQueryFromGoogleMapsUrl(query) || query;
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "bad_json", "Request body must be valid JSON");
  }

  const parsed = ItineraryAssistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "invalid_request", "Invalid request payload", parsed.error.format());
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return jsonError(401, "unauthorized", "You must be signed in to use the AI assistant.");
  }

  const { itineraryId, destinationId } = parsed.data;

  const bootstrap = await fetchBuilderBootstrap(itineraryId, destinationId);
  if (!bootstrap.success) {
    return jsonError(500, "bootstrap_failed", "Failed to load itinerary context", bootstrap.error ?? bootstrap.message);
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
    try {
      let chatHistory = parsed.data.chatHistory?.slice(-20);
      const last = chatHistory?.[chatHistory.length - 1];
      if (last?.role === "user" && last.content.trim() === parsed.data.message.trim()) {
        chatHistory = chatHistory?.slice(0, -1);
      }

      const plan = await planItineraryEdits({
        message: parsed.data.message,
        chatHistory,
        itinerary,
        destination,
        activities: activeActivities,
      });

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

      console.info("[ai-itinerary] plan", {
        itineraryId,
        destinationId,
        userId: auth.user.id,
        proposedCount: plan.operations.length,
        resolvedCount: resolvedOperations.length,
        droppedCount: dropped,
        clarificationCount: clarifications.length,
      });

      if (resolvedOperations.length > MAX_OPERATIONS) {
        const payload: PlanResponsePayload = {
          assistantMessage: `${plan.assistantMessage}\n\nThat request would change ${resolvedOperations.length} items, which exceeds the limit of ${MAX_OPERATIONS} changes per request. Please narrow it down (for example, one day or one activity at a time).`,
          operations: [],
          previewLines: [
            `Too many changes (${resolvedOperations.length}). Please narrow the request (max ${MAX_OPERATIONS} per request).`,
          ],
          requiresConfirmation: true,
        };

        return NextResponse.json({ ok: true, mode: "plan", ...payload });
      }

      const requiresConfirmation =
        resolvedOperations.some((op) => op.op === "remove_activity") ||
        resolvedOperations.length > CONFIRMATION_BATCH_THRESHOLD ||
        resolvedOperations.some(
          (op) =>
            op.op === "update_activity" &&
            typeof op.date === "string" &&
            isDateOutsideRange(op.date, fromDate, toDate)
        ) ||
        resolvedOperations.some(
          (op) =>
            op.op === "add_place" &&
            typeof op.date === "string" &&
            isDateOutsideRange(op.date, fromDate, toDate)
        );

      const previewLines = buildPreviewLines(resolvedOperations, activityById);

      const messageParts = [plan.assistantMessage];
      if (dropped > 0) {
        messageParts.push(`Note: I ignored ${dropped} edit(s) because I couldn't find the referenced activity.`);
      }
      if (clarifications.length > 0) {
        messageParts.push(...clarifications);
      }

      const payload: PlanResponsePayload = {
        assistantMessage: messageParts.join("\n\n"),
        operations: resolvedOperations,
        previewLines,
        requiresConfirmation,
      };

      return NextResponse.json({ ok: true, mode: "plan", ...payload });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to plan edits";
      const isMissingApiKey = /OPENAI_API_KEY/i.test(message);
      const code = isMissingApiKey ? "missing_api_key" : "plan_failed";
      const safeMessage = "Something went wrong. Please try again.";
      return jsonError(500, code, safeMessage);
    }
  }

  // apply
  const operations = parsed.data.operations;
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
    return jsonError(
      409,
      "confirmation_required",
      "These changes require confirmation. Please confirm and retry."
    );
  }

  console.info("[ai-itinerary] apply", {
    itineraryId,
    destinationId,
    userId: auth.user.id,
    operationCount: operations.length,
    confirmed: parsed.data.confirmed === true,
  });

  const applied: ApplyResponsePayload["applied"] = [];
  let halted = false;

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

        applied.push({ ok: true, operation });
        continue;
      }

      if (!activityById.has(operation.itineraryActivityId)) {
        applied.push({
          ok: false,
          operation,
          error: "Activity not found (or already removed).",
        });
        halted = true;
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
      }
    } catch (error) {
      applied.push({
        ok: false,
        operation,
        error: error instanceof Error ? error.message : "Operation failed",
      });
      halted = true;
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

  console.info("[ai-itinerary] apply_result", {
    itineraryId,
    destinationId,
    userId: auth.user.id,
    okCount,
    failedCount: applied.length - okCount,
    skippedCount,
  });

  return NextResponse.json({ ok: true, mode: "apply", ...payload });
}
