import type { ChatMessage } from "@/lib/ai/itinerary/schema";

export type AiItineraryThreadRow = {
  ai_itinerary_thread_id: string;
  summary: string | null;
  draft: unknown | null;
  draft_sources?: unknown | null;
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
}): Promise<AiItineraryThreadRow> {
  const { supabase, itineraryId, destinationId, userId } = args;

  const isMissingColumn = (err: any, column: string) => {
    if (!err) return false;
    const code = String(err.code ?? "");
    if (code !== "42703") return false;
    const message = String(err.message ?? "").toLowerCase();
    return message.includes(column.toLowerCase());
  };

  const upsertWithSelect = async (select: string) => {
    return supabase
      .from("ai_itinerary_thread")
      .upsert(
        {
          itinerary_id: Number(itineraryId),
          itinerary_destination_id: Number(destinationId),
          user_id: userId,
        },
        { onConflict: "itinerary_id,itinerary_destination_id,user_id" }
      )
      .select(select)
      .single();
  };

  const { data, error } = await upsertWithSelect("ai_itinerary_thread_id,summary,draft,draft_sources");
  if (error && isMissingColumn(error, "draft_sources")) {
    const retry = await upsertWithSelect("ai_itinerary_thread_id,summary,draft");
    if (retry.error || !retry.data) {
      throw new Error(retry.error?.message || "Failed to create AI chat thread");
    }

    return {
      ai_itinerary_thread_id: String((retry.data as any).ai_itinerary_thread_id),
      summary: (retry.data as any).summary ?? null,
      draft: (retry.data as any).draft ?? null,
      draft_sources: null,
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
    content,
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
    .update({ summary })
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
