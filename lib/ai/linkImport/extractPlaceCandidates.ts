import { openaiChatJSON, type OpenAiUsage } from "@/lib/ai/itinerary/openai";
import { ExtractCandidatesResultSchema, type ExtractCandidatesResult } from "@/lib/ai/linkImport/schema";
import type { LinkImportIngestResult } from "@/lib/linkImport/server/types";

const truncate = (value: string, max: number) => {
  const text = String(value ?? "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
};

export async function extractPlaceCandidatesFromSources(args: {
  destination: { city?: string | null; country?: string | null };
  sources: LinkImportIngestResult[];
  maxTokens?: number;
}): Promise<{ data: ExtractCandidatesResult; usage: OpenAiUsage }> {
  const city = typeof args.destination?.city === "string" ? args.destination.city.trim() : "";
  const country = typeof args.destination?.country === "string" ? args.destination.country.trim() : "";
  const destinationLabel = city && country ? `${city}, ${country}` : city || country || "this destination";

  const sources = Array.isArray(args.sources) ? args.sources.slice(0, 3) : [];

  const system = [
    "You are a travel link analyst.",
    "You MUST return ONLY valid JSON matching the required schema.",
    "",
    "Task:",
    "- Read the provided source content (video/page metadata, captions/descriptions, transcripts, or webpage text).",
    "- Extract up to 15 concrete, real places (or specific attractions/venues) the user could add to an itinerary.",
    "",
    "Rules:",
    "- Only include items that could plausibly be found via Google Places text search (restaurants, museums, landmarks, parks, venues).",
    "- Avoid generic categories like 'museum', 'beach', 'street food market' unless a specific named place is given.",
    "- For each candidate, provide:",
    "  - sourceCanonicalUrl: must match one of the provided sources exactly",
    "  - query: a short search query (place name; add city only if needed to disambiguate)",
    "  - evidence: a short quote/snippet showing where it was mentioned",
    "  - confidence: 0..1",
    "- If the sources do not contain enough specific places, ask the user to paste the relevant text/caption and return candidates: [].",
    "",
    "Return JSON with this shape:",
    '{ "assistantMessage": string, "candidates": Array<{ sourceCanonicalUrl: string, query: string, evidence: string, confidence: number }> }',
  ].join("\n");

  const user = [
    `Destination context: ${destinationLabel}`,
    "",
    "Sources:",
    ...sources.map((source, idx) => {
      const provider = source.source.provider;
      const canonicalUrl = source.source.canonicalUrl;
      const title = source.source.title ?? source.text.title ?? "";
      const parts: string[] = [
        `#${idx + 1}`,
        `provider: ${provider}`,
        `canonicalUrl: ${canonicalUrl}`,
        ...(title ? [`title: ${truncate(title, 180)}`] : []),
        ...(source.debug?.blocked ? [`blocked: true (${source.debug.reason ?? "unknown"})`] : []),
      ];

      const preferredText =
        source.text.caption ||
        source.text.description ||
        source.text.transcript ||
        source.text.articleText ||
        source.text.rawText ||
        "";

      if (preferredText) {
        parts.push("content:");
        parts.push(truncate(preferredText, 8000));
      }

      return parts.join("\n");
    }),
    "",
    "Remember:",
    "- sourceCanonicalUrl must match one of the canonicalUrl values above exactly.",
  ].join("\n");

  return openaiChatJSON({
    system,
    user,
    schema: ExtractCandidatesResultSchema,
    maxTokens: args.maxTokens,
  });
}

