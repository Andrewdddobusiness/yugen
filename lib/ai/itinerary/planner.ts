import { PlanResultSchema, type Operation, type PlanResult } from "@/lib/ai/itinerary/schema";
import { openaiChatJSON, type OpenAiUsage } from "@/lib/ai/itinerary/openai";
import type { ChatMessage } from "@/lib/ai/itinerary/schema";

type ActivitySnapshotRow = {
  itinerary_activity_id: unknown;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  activity?: {
    name?: string | null;
    address?: string | null;
    types?: string[] | null;
  } | null;
};

type DestinationSnapshot = {
  city?: string | null;
  country?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  time_zone?: string | null;
  accommodation_notes?: string | null;
  transportation_notes?: string | null;
};

type ItinerarySnapshot = {
  title?: string | null;
  description?: string | null;
  adults?: number | null;
  kids?: number | null;
  budget?: number | string | null;
  currency?: string | null;
};

const normalize = (value: unknown) => String(value ?? "").toLowerCase();

const tokenize = (text: string) =>
  Array.from(
    new Set(
      normalize(text)
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3)
    )
  );

const relevanceScore = (messageTokens: string[], row: ActivitySnapshotRow) => {
  const name = normalize(row.activity?.name);
  const address = normalize(row.activity?.address);
  const types = normalize((row.activity?.types ?? []).join(" "));
  const notes = normalize(row.notes);

  let score = 0;
  for (const token of messageTokens) {
    if (name.includes(token)) score += 5;
    if (address.includes(token)) score += 2;
    if (types.includes(token)) score += 1;
    if (notes.includes(token)) score += 1;
  }

  return score;
};

const pickRelevantActivities = (message: string, activities: ActivitySnapshotRow[], limit = 80) => {
  if (activities.length <= limit) return activities;

  const tokens = tokenize(message);
  if (tokens.length === 0) return activities.slice(0, limit);

  const scored = activities
    .map((row) => ({ row, score: relevanceScore(tokens, row) }))
    .sort((a, b) => b.score - a.score);

  const best = scored.filter((entry) => entry.score > 0).slice(0, limit).map((entry) => entry.row);
  if (best.length > 0) return best;

  return activities.slice(0, limit);
};

const formatActivityLine = (row: ActivitySnapshotRow) => {
  const id = String(row.itinerary_activity_id ?? "");
  const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);
  const rawName = row.activity?.name ?? "Unknown";
  const name = truncate(rawName, 60);
  const date = row.date ?? "unscheduled";
  const start = row.start_time ? String(row.start_time).slice(0, 5) : "";
  const end = row.end_time ? String(row.end_time).slice(0, 5) : "";
  const time = start && end ? `${start}-${end}` : start || end ? `${start}${end ? `-${end}` : ""}` : "";
  const address = truncate(row.activity?.address ?? "", 72);
  const types = Array.isArray(row.activity?.types) ? row.activity?.types?.slice(0, 4).join(", ") : "";
  return `- ${id}: ${name} | date: ${date} | time: ${time || "none"} | types: ${types || "n/a"} | address: ${address}`;
};

const formatDraftOperationLine = (operation: Operation, index: number) => {
  const number = index + 1;

  if (operation.op === "add_place") {
    const nameOrQuery = operation.name || operation.query || operation.placeId;
    const date = operation.date === undefined ? "unspecified" : operation.date ?? "unscheduled";
    const start = operation.startTime ? String(operation.startTime).slice(0, 5) : "";
    const end = operation.endTime ? String(operation.endTime).slice(0, 5) : "";
    const time = start && end ? `${start}-${end}` : start || end ? `${start}${end ? `-${end}` : ""}` : "none";
    const notes = typeof operation.notes === "string" && operation.notes.trim() ? ` | notes: ${operation.notes.trim()}` : "";
    return `- #${number} add_place: ${nameOrQuery} | placeId: ${operation.placeId} | date: ${date} | time: ${time}${notes}`;
  }

  if (operation.op === "remove_activity") {
    return `- #${number} remove_activity: itineraryActivityId=${operation.itineraryActivityId}`;
  }

  const date = operation.date === undefined ? "unchanged" : operation.date ?? "unscheduled";
  const touchesTime = operation.startTime !== undefined || operation.endTime !== undefined;
  const time = touchesTime
    ? `${operation.startTime == null ? "null" : String(operation.startTime).slice(0, 5)}-${operation.endTime == null ? "null" : String(operation.endTime).slice(0, 5)}`
    : "unchanged";
  const notes =
    operation.notes === undefined ? "unchanged" : operation.notes === null ? "cleared" : `set`;
  return `- #${number} update_activity: itineraryActivityId=${operation.itineraryActivityId} | date: ${date} | time: ${time} | notes: ${notes}`;
};

export async function planItineraryEdits(args: {
  message: string;
  chatHistory?: ChatMessage[];
  retrievedHistory?: ChatMessage[];
  summary?: string | null;
  draftOperations?: Operation[];
  maxTokens?: number;
  itinerary?: ItinerarySnapshot | null;
  destination: DestinationSnapshot | null;
  activities: ActivitySnapshotRow[];
}): Promise<{ data: PlanResult; usage: OpenAiUsage }> {
  const recentUserContext = (args.chatHistory ?? [])
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .slice(-4)
    .join("\n");

  const relevanceSeed = [recentUserContext, args.message].filter(Boolean).join("\n");
  const orderedActivities = [...args.activities].sort((a, b) => {
    const da = a.date ?? "9999-99-99";
    const db = b.date ?? "9999-99-99";
    const sa = a.start_time ? String(a.start_time) : "99:99:99";
    const sb = b.start_time ? String(b.start_time) : "99:99:99";
    const na = normalize(a.activity?.name);
    const nb = normalize(b.activity?.name);
    return da.localeCompare(db) || sa.localeCompare(sb) || na.localeCompare(nb);
  });

  const MAX_CONTEXT_ACTIVITIES = 250;
  const relevantActivities =
    orderedActivities.length <= MAX_CONTEXT_ACTIVITIES
      ? orderedActivities
      : pickRelevantActivities(relevanceSeed, orderedActivities, MAX_CONTEXT_ACTIVITIES);

  const fromDate = args.destination?.from_date ?? null;
  const toDate = args.destination?.to_date ?? null;
  const destinationLabel =
    args.destination?.city && args.destination?.country
      ? `${args.destination.city}, ${args.destination.country}`
      : "this destination";

  const itineraryTitle = args.itinerary?.title ? String(args.itinerary.title) : "";
  const itineraryDescription = args.itinerary?.description ? String(args.itinerary.description) : "";
  const adults = typeof args.itinerary?.adults === "number" ? args.itinerary.adults : null;
  const kids = typeof args.itinerary?.kids === "number" ? args.itinerary.kids : null;
  const budget = args.itinerary?.budget != null ? String(args.itinerary.budget) : "";
  const currency = args.itinerary?.currency ? String(args.itinerary.currency) : "";
  const accommodationNotes = args.destination?.accommodation_notes ? String(args.destination.accommodation_notes) : "";
  const transportationNotes = args.destination?.transportation_notes ? String(args.destination.transportation_notes) : "";

  const system = [
    "You are an itinerary editing assistant.",
    "You MUST return ONLY valid JSON.",
    "",
    "Your task:",
    "- Read the user's request.",
    "- If there is an existing draft plan, iteratively amend it (do not throw it away unless the user explicitly asks to start over).",
    "- Propose a list of operations to modify existing itinerary activities (and/or draft additions).",
    "",
    "Rules:",
    "- Only use these operations:",
    '  1) {"op":"update_activity","itineraryActivityId":"<id>","date"?: "YYYY-MM-DD"|null,"startTime"?: "HH:MM"|null,"endTime"?: "HH:MM"|null,"notes"?: string|null}',
    '  2) {"op":"remove_activity","itineraryActivityId":"<id>"}',
    '  3) {"op":"add_place","query"?: "<place name or google maps link>","placeId"?: "<google place id>","name"?: string,"date"?: "YYYY-MM-DD"|null,"startTime"?: "HH:MM"|null,"endTime"?: "HH:MM"|null,"notes"?: string|null}',
    "- The id MUST be one of the itineraryActivityId values in the provided activities list.",
    "- Use 24-hour time (HH:MM) in operations.",
    "- Use dates as YYYY-MM-DD.",
    "- If you change time, ALWAYS provide both startTime and endTime (or set both to null to clear).",
    "- If you set date to null (unschedule), ALSO set startTime and endTime to null.",
    "- If you set startTime and endTime as strings, startTime MUST be before endTime.",
    "- For add_place: provide either query or placeId. If the user asks you to recommend/suggest a place, pick ONE specific real place name for query.",
    "- If a draft add_place already has a placeId, keep that placeId stable unless the user asks to change the place.",
    "- If key info is missing (e.g., user says 'at 7' but no duration/end time), ask a clarifying question and return operations: [].",
    "- If the user request is ambiguous (multiple activities could match), ask a clarifying question and return operations: [].",
    "- NEVER return more than 25 operations. If the request affects many items, ask the user to narrow it down and return operations: [].",
    "- In assistantMessage, use friendly 12-hour times with AM/PM when referencing times (e.g., 7:00 PM).",
    "- If a draft plan exists, your operations output MUST represent the full updated draft (include unchanged draft operations unless you are intentionally removing them).",
    "",
    "Return JSON with this shape:",
    '{ "assistantMessage": string, "operations": Operation[] }',
  ].join("\n");

  const user = [
    ...(args.summary
      ? ["Conversation summary:", args.summary.trim(), ""]
      : []),
    ...(args.retrievedHistory && args.retrievedHistory.length > 0
      ? [
          "Relevant past messages:",
          ...args.retrievedHistory.slice(-8).map((m) => `- ${m.role}: ${m.content}`),
          "",
        ]
      : []),
    ...(args.chatHistory && args.chatHistory.length > 0
      ? [
          "Conversation so far (most recent last):",
          ...args.chatHistory.slice(-12).map((m) => `- ${m.role}: ${m.content}`),
          "",
        ]
      : []),
    ...(args.draftOperations && args.draftOperations.length > 0
      ? [
          "Current draft changes (not yet applied). The user may refer to items by number (#1, #2, ...):",
          ...args.draftOperations.slice(0, 25).map(formatDraftOperationLine),
          "",
        ]
      : []),
    `User request: ${args.message}`,
    "",
    `Context: ${destinationLabel}`,
    ...(itineraryTitle ? [`Itinerary title: ${itineraryTitle}`] : []),
    ...(itineraryDescription ? [`Itinerary description: ${itineraryDescription}`] : []),
    ...(adults != null || kids != null ? [`Travel party: ${adults ?? "?"} adult(s), ${kids ?? "?"} kid(s)`] : []),
    ...(budget ? [`Budget: ${budget}${currency ? ` ${currency}` : ""}`] : []),
    ...(accommodationNotes ? [`Accommodation notes: ${accommodationNotes}`] : []),
    ...(transportationNotes ? [`Transportation notes: ${transportationNotes}`] : []),
    `Destination date range: ${fromDate ?? "unknown"} to ${toDate ?? "unknown"}`,
    "",
    "Activities (subset):",
    ...relevantActivities.map(formatActivityLine),
    ...(orderedActivities.length > relevantActivities.length
      ? [`(Showing ${relevantActivities.length} of ${orderedActivities.length} activities to keep this prompt short.)`]
      : []),
    "",
    "Remember: pick itineraryActivityId from the list above.",
  ].join("\n");

  return openaiChatJSON({
    system,
    user,
    schema: PlanResultSchema,
    maxTokens: args.maxTokens,
  });
}
