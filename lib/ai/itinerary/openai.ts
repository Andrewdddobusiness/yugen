import { z } from "zod";

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
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

export class OpenAIError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenAIError";
    this.status = status;
  }
}

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
    const response = await fetch(`${baseUrl}/chat/completions`, {
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
    });

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

    return validated.data as z.infer<TSchema>;
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

