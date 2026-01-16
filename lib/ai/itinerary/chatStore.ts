import type { ChatMessage } from "@/lib/ai/itinerary/schema";
import { sanitizeTypography } from "@/lib/text/sanitizeTypography";

export type AiItineraryThreadRow = {
  ai_itinerary_thread_id: string;
  summary: string | null;
  draft: unknown | null;
  draft_sources?: unknown | null;
  thread_key?: string | null;
};

export type AiItineraryMessageRow = {
  ai_itinerary_message_id: number;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata: any;
  created_at: string;
};

const toChatMessages = (rows: AiItineraryMessageRow[]): ChatMessage[] => {
  return rows
    .filter(
      (row): row is AiItineraryMessageRow & { role: "user" | "assistant" } =>
        row.role === "user" || row.role === "assistant"
    )
    .map((row) => ({ role: row.role, content: row.content }));
};

export async function getOrCreateAiItineraryThread(args: {
  supabase: any;
  itineraryId: string;
  destinationId: string;
  userId: string;
  threadKey?: string;
}): Promise<AiItineraryThreadRow> {
  const { supabase, itineraryId, destinationId, userId } = args;
  const threadKey = args.threadKey?.trim() ? String(args.threadKey).trim() : "default";

  const isMissingColumn = (err: any, column: string) => {
    if (!err) return false;
    const code = String(err.code ?? "");
    if (code !== "42703") return false;
    const message = String(err.message ?? "").toLowerCase();
    return message.includes(column.toLowerCase());
  };

  const isUnsupportedOnConflict = (err: any) => {
    if (!err) return false;
    const code = String(err.code ?? "");
    if (code === "42P10") return true; // no unique/exclusion constraint matching ON CONFLICT
    const message = String(err.message ?? "").toLowerCase();
    return message.includes("no unique") && message.includes("on conflict");
  };

  const upsertWithSelect = async (select: string, withThreadKey: boolean) => {
    const payload: any = {
      itinerary_id: Number(itineraryId),
      itinerary_destination_id: Number(destinationId),
      user_id: userId,
    };

    const onConflict = withThreadKey
      ? "itinerary_id,itinerary_destination_id,user_id,thread_key"
      : "itinerary_id,itinerary_destination_id,user_id";

    if (withThreadKey) payload.thread_key = threadKey;

    return supabase
      .from("ai_itinerary_thread")
      .upsert(payload, { onConflict })
      .select(select)
      .single();
  };

  const selectWithSources = "ai_itinerary_thread_id,summary,draft,draft_sources";
  const selectWithoutSources = "ai_itinerary_thread_id,summary,draft";

  let data: any;
  let error: any;

  const first = await upsertWithSelect(selectWithSources, true);
  data = first.data;
  error = first.error;

  if (error && (isMissingColumn(error, "thread_key") || isUnsupportedOnConflict(error))) {
    const legacy = await upsertWithSelect(selectWithSources, false);
    data = legacy.data;
    error = legacy.error;
  }

  if (error && isMissingColumn(error, "draft_sources")) {
    const retry = await upsertWithSelect(selectWithoutSources, true);
    if (retry.error || !retry.data) {
      const legacyRetry =
        retry.error && (isMissingColumn(retry.error, "thread_key") || isUnsupportedOnConflict(retry.error))
          ? await upsertWithSelect(selectWithoutSources, false)
          : retry;
      if (legacyRetry.error || !legacyRetry.data) {
        throw new Error(legacyRetry.error?.message || "Failed to create AI chat thread");
      }

      return {
        ai_itinerary_thread_id: String((legacyRetry.data as any).ai_itinerary_thread_id),
        summary: (legacyRetry.data as any).summary ?? null,
        draft: (legacyRetry.data as any).draft ?? null,
        draft_sources: null,
        thread_key: threadKey,
      };
    }

    return {
      ai_itinerary_thread_id: String((retry.data as any).ai_itinerary_thread_id),
      summary: (retry.data as any).summary ?? null,
      draft: (retry.data as any).draft ?? null,
      draft_sources: null,
      thread_key: threadKey,
    };
  }

  if (error || !data) {
    throw new Error(error?.message || "Failed to create AI chat thread");
  }

  return {
    ai_itinerary_thread_id: String(data.ai_itinerary_thread_id),
    summary: (data as any).summary ?? null,
    draft: (data as any).draft ?? null,
    draft_sources: (data as any).draft_sources ?? null,
    thread_key: threadKey,
  };
}

export type AiItineraryThreadListRow = {
  ai_itinerary_thread_id: string;
  thread_key: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export async function listAiItineraryThreads(args: {
  supabase: any;
  itineraryId: string;
  destinationId: string;
  userId: string;
  limit: number;
}): Promise<AiItineraryThreadListRow[]> {
  const { supabase, itineraryId, destinationId, userId, limit } = args;

  const isMissingColumn = (err: any, column: string) => {
    if (!err) return false;
    const code = String(err.code ?? "");
    if (code !== "42703") return false;
    const message = String(err.message ?? "").toLowerCase();
    return message.includes(column.toLowerCase());
  };

  const query = (select: string) =>
    supabase
      .from("ai_itinerary_thread")
      .select(select)
      .eq("itinerary_id", Number(itineraryId))
      .eq("itinerary_destination_id", Number(destinationId))
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(Math.max(0, limit));

  const { data, error } = await query("ai_itinerary_thread_id,thread_key,summary,created_at,updated_at");
  if (error && isMissingColumn(error, "thread_key")) {
    const legacy = await query("ai_itinerary_thread_id,summary,created_at,updated_at");
    if (legacy.error) {
      throw new Error(legacy.error.message || "Failed to load AI chat threads");
    }

    const rows = Array.isArray(legacy.data) ? (legacy.data as any[]) : [];
    return rows.map((row) => ({
      ai_itinerary_thread_id: String(row.ai_itinerary_thread_id),
      thread_key: "default",
      summary: row.summary ?? null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }));
  }

  if (error) {
    throw new Error(error.message || "Failed to load AI chat threads");
  }

  const rows = Array.isArray(data) ? (data as any[]) : [];
  return rows.map((row) => ({
    ai_itinerary_thread_id: String(row.ai_itinerary_thread_id),
    thread_key: String(row.thread_key ?? "default"),
    summary: row.summary ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));
}

export async function createAiItineraryThread(args: {
  supabase: any;
  itineraryId: string;
  destinationId: string;
  userId: string;
  threadKey: string;
}): Promise<AiItineraryThreadListRow> {
  const { supabase, itineraryId, destinationId, userId, threadKey } = args;

  const { data, error } = await supabase
    .from("ai_itinerary_thread")
    .insert({
      itinerary_id: Number(itineraryId),
      itinerary_destination_id: Number(destinationId),
      user_id: userId,
      thread_key: threadKey,
    })
    .select("ai_itinerary_thread_id,thread_key,summary,created_at,updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create AI chat thread");
  }

  return {
    ai_itinerary_thread_id: String((data as any).ai_itinerary_thread_id),
    thread_key: String((data as any).thread_key ?? threadKey),
    summary: (data as any).summary ?? null,
    created_at: String((data as any).created_at),
    updated_at: String((data as any).updated_at),
  };
}

export async function insertAiItineraryMessage(args: {
  supabase: any;
  threadId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata?: any;
  embedding?: number[] | null;
  embeddingModel?: string | null;
}): Promise<number> {
  const { supabase, threadId, role, content, metadata, embedding, embeddingModel } = args;

  const payload: any = {
    thread_id: threadId,
    role,
    content: sanitizeTypography(content),
    metadata: metadata ?? {},
  };

  if (Array.isArray(embedding)) payload.embedding = embedding;
  if (embeddingModel) payload.embedding_model = embeddingModel;

  const { data, error } = await supabase
    .from("ai_itinerary_message")
    .insert(payload)
    .select("ai_itinerary_message_id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to insert AI chat message");
  }

  return Number((data as any).ai_itinerary_message_id);
}

export async function listAiItineraryMessages(args: {
  supabase: any;
  threadId: string;
  limit: number;
}): Promise<AiItineraryMessageRow[]> {
  const { supabase, threadId, limit } = args;

  const { data, error } = await supabase
    .from("ai_itinerary_message")
    .select("ai_itinerary_message_id,role,content,metadata,created_at")
    .eq("thread_id", threadId)
    .order("ai_itinerary_message_id", { ascending: false })
    .limit(Math.max(0, limit));

  if (error) {
    throw new Error(error.message || "Failed to load AI chat messages");
  }

  const rows = Array.isArray(data) ? (data as any as AiItineraryMessageRow[]) : [];
  return rows.reverse();
}

export async function matchAiItineraryMessages(args: {
  supabase: any;
  threadId: string;
  queryEmbedding: number[];
  matchCount: number;
}): Promise<Array<{ ai_itinerary_message_id: number; role: string; content: string; similarity: number }>> {
  const { supabase, threadId, queryEmbedding, matchCount } = args;

  const { data, error } = await supabase.rpc("match_ai_itinerary_messages", {
    _thread_id: threadId,
    _query_embedding: queryEmbedding,
    _match_count: matchCount,
  });

  if (error) {
    throw new Error(error.message || "Failed to match AI chat messages");
  }

  return Array.isArray(data) ? (data as any) : [];
}

export async function updateAiItineraryThreadSummary(args: {
  supabase: any;
  threadId: string;
  summary: string | null;
}) {
  const { supabase, threadId, summary } = args;

  const { error } = await supabase
    .from("ai_itinerary_thread")
    .update({ summary: summary ? sanitizeTypography(summary) : summary })
    .eq("ai_itinerary_thread_id", threadId);

  if (error) {
    throw new Error(error.message || "Failed to update AI chat summary");
  }
}

export async function updateAiItineraryThreadDraft(args: {
  supabase: any;
  threadId: string;
  draft: unknown | null;
}) {
  const { supabase, threadId, draft } = args;

  const { error } = await supabase
    .from("ai_itinerary_thread")
    .update({ draft })
    .eq("ai_itinerary_thread_id", threadId);

  if (error) {
    throw new Error(error.message || "Failed to update AI chat draft");
  }
}

export async function updateAiItineraryThreadDraftSources(args: {
  supabase: any;
  threadId: string;
  draftSources: unknown | null;
}) {
  const { supabase, threadId, draftSources } = args;

  const { error } = await supabase
    .from("ai_itinerary_thread")
    .update({ draft_sources: draftSources })
    .eq("ai_itinerary_thread_id", threadId);

  if (error) {
    const isMissingColumn =
      String((error as any)?.code ?? "") === "42703" &&
      String((error as any)?.message ?? "").toLowerCase().includes("draft_sources");
    if (isMissingColumn) return;
    throw new Error(error.message || "Failed to update AI chat draft sources");
  }
}

export async function updateAiItineraryThreadDraftAndSources(args: {
  supabase: any;
  threadId: string;
  draft: unknown | null;
  draftSources: unknown | null;
}) {
  const { supabase, threadId, draft, draftSources } = args;

  const { error } = await supabase
    .from("ai_itinerary_thread")
    .update({ draft, draft_sources: draftSources })
    .eq("ai_itinerary_thread_id", threadId);

  if (error) {
    const isMissingDraftSources =
      String((error as any)?.code ?? "") === "42703" &&
      String((error as any)?.message ?? "").toLowerCase().includes("draft_sources");
    if (isMissingDraftSources) {
      const { error: fallbackError } = await supabase
        .from("ai_itinerary_thread")
        .update({ draft })
        .eq("ai_itinerary_thread_id", threadId);
      if (fallbackError) throw new Error(fallbackError.message || "Failed to update AI chat draft");
      return;
    }

    throw new Error(error.message || "Failed to update AI chat draft");
  }
}

export function mergeChatContext(args: {
  recent: AiItineraryMessageRow[];
  retrieved: Array<{ ai_itinerary_message_id: number; role: string; content: string }>;
}): { chatHistory: ChatMessage[]; retrievedHistory: ChatMessage[] } {
  const recentIds = new Set(args.recent.map((row) => Number(row.ai_itinerary_message_id)));
  const retrievedDeduped = args.retrieved.filter((row) => !recentIds.has(Number(row.ai_itinerary_message_id)));

  return {
    chatHistory: toChatMessages(args.recent),
    retrievedHistory: toChatMessages(retrievedDeduped as any),
  };
}

export type AiItineraryRunRow = {
  ai_itinerary_run_id: string;
};

export async function startAiItineraryRun(args: {
  supabase: any;
  threadId: string;
  mode: "plan" | "import" | "apply" | "history";
}) {
  const { supabase, threadId, mode } = args;
  const { data, error } = await supabase
    .from("ai_itinerary_run")
    .insert({ thread_id: threadId, mode, status: "running" })
    .select("ai_itinerary_run_id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to start AI run");
  }

  return { ai_itinerary_run_id: String((data as any).ai_itinerary_run_id) } satisfies AiItineraryRunRow;
}

export async function finishAiItineraryRun(args: {
  supabase: any;
  runId: string;
  status: "succeeded" | "failed";
  error?: any;
}) {
  const { supabase, runId, status, error } = args;
  const { error: updateError } = await supabase
    .from("ai_itinerary_run")
    .update({ status, error: error ?? null, finished_at: new Date().toISOString() })
    .eq("ai_itinerary_run_id", runId);

  if (updateError) {
    // Best-effort telemetry only.
    console.error("Failed to finish AI run:", updateError);
  }
}

export type AiItineraryRunStepRow = {
  ai_itinerary_run_step_id: number;
};

export async function startAiItineraryRunStep(args: {
  supabase: any;
  runId: string;
  kind: string;
  input?: any;
}) {
  const { supabase, runId, kind, input } = args;
  const { data, error } = await supabase
    .from("ai_itinerary_run_step")
    .insert({ run_id: runId, kind, status: "started", input: input ?? null })
    .select("ai_itinerary_run_step_id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to start AI run step");
  }

  return { ai_itinerary_run_step_id: Number((data as any).ai_itinerary_run_step_id) } satisfies AiItineraryRunStepRow;
}

export async function finishAiItineraryRunStep(args: {
  supabase: any;
  stepId: number;
  status: "succeeded" | "failed";
  output?: any;
  error?: any;
}) {
  const { supabase, stepId, status, output, error } = args;
  const { error: updateError } = await supabase
    .from("ai_itinerary_run_step")
    .update({
      status,
      output: output ?? null,
      error: error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("ai_itinerary_run_step_id", stepId);

  if (updateError) {
    console.error("Failed to finish AI run step:", updateError);
  }
}

export async function insertAiItineraryToolInvocation(args: {
  supabase: any;
  stepId: number;
  toolName: string;
  status: "started" | "succeeded" | "failed";
  toolArgs?: any;
  result?: any;
  error?: any;
}) {
  const { supabase, stepId, toolName, status, toolArgs, result, error } = args;
  const payload: any = {
    run_step_id: stepId,
    tool_name: toolName,
    status,
    args: toolArgs ?? null,
    result: result ?? null,
  };

  if (status !== "started") {
    payload.finished_at = new Date().toISOString();
  }

  const { error: insertError } = await supabase.from("ai_itinerary_tool_invocation").insert(payload);
  if (insertError) {
    console.error("Failed to insert AI tool invocation:", insertError);
  }
}
