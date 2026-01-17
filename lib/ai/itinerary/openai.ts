import { z } from "zod";
import { sanitizeTypography } from "@/lib/text/sanitizeTypography";

export type OpenAiUsage = {
  kind: "chat" | "embedding";
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

type OpenAIEmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

const OpenAIChatCompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
        }),
      })
    )
    .min(1),
});

const OpenAIEmbeddingResponseSchema = z.object({
  data: z
    .array(
      z.object({
        embedding: z.array(z.number()),
      })
    )
    .min(1),
});

export class OpenAIError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenAIError";
    this.status = status;
  }
}

const OPENAI_CHAT_TIMEOUT_MS = (() => {
  const raw = Number(process.env.OPENAI_CHAT_TIMEOUT_MS ?? process.env.OPENAI_TIMEOUT_MS ?? 20000);
  return Number.isFinite(raw) && raw > 0 ? raw : 20000;
})();

const OPENAI_EMBED_TIMEOUT_MS = (() => {
  const raw = Number(process.env.OPENAI_EMBED_TIMEOUT_MS ?? process.env.OPENAI_TIMEOUT_MS ?? 10000);
  return Number.isFinite(raw) && raw > 0 ? raw : 10000;
})();

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as any)?.name === "AbortError") {
      throw new OpenAIError("OpenAI request timed out. Please try again.", 504);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export async function openaiChatJSON<TSchema extends z.ZodTypeAny>(args: {
  system: string;
  user: string;
  schema: TSchema;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIError("Missing OPENAI_API_KEY", 500);
  }

  const model = args.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const temperature = args.temperature ?? 0;
  const maxTokens = args.maxTokens ?? 800;
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

  const attempt = async (promptUser: string) => {
    const response = await fetchWithTimeout(
      `${baseUrl}/chat/completions`,
      {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: promptUser },
        ],
      }),
      },
      OPENAI_CHAT_TIMEOUT_MS
    );

    const data = (await response.json().catch(() => ({}))) as OpenAIChatCompletionResponse;

    if (!response.ok) {
      const message = data?.error?.message ?? `OpenAI request failed (${response.status})`;
      throw new OpenAIError(message, response.status);
    }

    const parsed = OpenAIChatCompletionResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new OpenAIError("OpenAI response missing choices", 502);
    }

    const content = parsed.data.choices[0]?.message?.content ?? "";
    if (!content) {
      throw new OpenAIError("OpenAI response was empty", 502);
    }

    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch (error) {
      throw new OpenAIError("OpenAI did not return valid JSON", 502);
    }

    const validated = args.schema.safeParse(json);
    if (!validated.success) {
      throw new OpenAIError(`AI output failed validation: ${validated.error.message}`, 422);
    }

    const sanitizeDeep = (value: unknown): unknown => {
      if (typeof value === "string") return sanitizeTypography(value);
      if (Array.isArray(value)) return value.map(sanitizeDeep);
      if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitizeDeep(v)]));
      }
      return value;
    };

    const promptTokens = Number(data?.usage?.prompt_tokens ?? 0) || 0;
    const completionTokens = Number(data?.usage?.completion_tokens ?? 0) || 0;
    const totalTokens =
      Number(data?.usage?.total_tokens ?? 0) || Math.max(0, promptTokens + completionTokens);

    return {
      data: sanitizeDeep(validated.data) as z.infer<TSchema>,
      usage: {
        kind: "chat",
        model,
        promptTokens: Math.max(0, promptTokens),
        completionTokens: Math.max(0, completionTokens),
        totalTokens: Math.max(0, totalTokens),
      } satisfies OpenAiUsage,
    };
  };

  try {
    return await attempt(args.user);
  } catch (error) {
    // One self-healing retry for invalid JSON / schema mismatches.
    const needsRetry =
      error instanceof OpenAIError && (error.status === 422 || error.status === 502);
    if (!needsRetry) throw error;

    const retryUser = `${args.user}\n\nIMPORTANT: Return ONLY valid JSON that matches the required schema.`;
    return await attempt(retryUser);
  }
}

export async function openaiEmbed(args: { input: string; model?: string }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIError("Missing OPENAI_API_KEY", 500);
  }

  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = args.model ?? process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const input = args.input.trim();
  if (!input) {
    throw new OpenAIError("Embedding input was empty", 400);
  }

  const response = await fetchWithTimeout(
    `${baseUrl}/embeddings`,
    {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
    }),
    },
    OPENAI_EMBED_TIMEOUT_MS
  );

  const data = (await response.json().catch(() => ({}))) as OpenAIEmbeddingResponse;

  if (!response.ok) {
    const message = data?.error?.message ?? `OpenAI embedding request failed (${response.status})`;
    throw new OpenAIError(message, response.status);
  }

  const parsed = OpenAIEmbeddingResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new OpenAIError("OpenAI embedding response missing data", 502);
  }

  const embedding = parsed.data.data[0]?.embedding ?? null;
  if (!embedding || embedding.length === 0) {
    throw new OpenAIError("OpenAI embedding response was empty", 502);
  }

  const promptTokens = Number(data?.usage?.prompt_tokens ?? data?.usage?.total_tokens ?? 0) || 0;
  const totalTokens = Number(data?.usage?.total_tokens ?? promptTokens) || promptTokens;

  return {
    embedding,
    usage: {
      kind: "embedding",
      model,
      promptTokens: Math.max(0, promptTokens),
      completionTokens: 0,
      totalTokens: Math.max(0, totalTokens),
    } satisfies OpenAiUsage,
  };
}
