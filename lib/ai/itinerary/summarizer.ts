import { z } from "zod";
import { openaiChatJSON, type OpenAiUsage } from "@/lib/ai/itinerary/openai";
import type { ChatMessage } from "@/lib/ai/itinerary/schema";

const SummarySchema = z.object({
  summary: z.string().trim().max(1500),
});

export async function summarizeItineraryChat(args: {
  previousSummary?: string | null;
  messages: ChatMessage[];
}) {
  const previous = (args.previousSummary ?? "").trim();
  const messages = Array.isArray(args.messages) ? args.messages : [];

  const system = [
    "You are a summarization engine for an itinerary assistant chat.",
    "Return ONLY valid JSON.",
    "",
    "Write a concise rolling summary used as background context for future turns.",
    "Include:",
    "- User intent and goals",
    "- Concrete decisions already made (dates, times, place names)",
    "- Preferences (food type, budget, party size, constraints)",
    "- Open questions / unresolved clarifications",
    "",
    "Do NOT include secrets, API keys, or personally identifying info.",
    "Keep it under 1500 characters.",
    "",
    'Return JSON: {"summary": string}',
  ].join("\n");

  const user = [
    ...(previous ? [`Previous summary:\n${previous}\n`] : ["Previous summary: (none)\n"]),
    "Recent messages (most recent last):",
    ...messages.slice(-20).map((m) => `- ${m.role}: ${m.content}`),
  ].join("\n");

  const result = await openaiChatJSON({
    system,
    user,
    schema: SummarySchema,
    temperature: 0,
    maxTokens: 300,
  });

  return {
    summary: result.data.summary.trim(),
    usage: result.usage satisfies OpenAiUsage,
  };
}
