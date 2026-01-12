/**
 * @jest-environment node
 */

import type { OpenAiUsage } from "@/lib/ai/itinerary/openai";
import type { LinkImportIngestResult } from "@/lib/linkImport/server/types";

jest.mock("@/lib/ai/itinerary/openai", () => {
  return {
    openaiChatJSON: jest.fn(async () => {
      const usage: OpenAiUsage = {
        kind: "chat",
        model: "test",
        promptTokens: 1,
        completionTokens: 1,
        totalTokens: 2,
      };
      return { data: { assistantMessage: "ok", candidates: [] }, usage };
    }),
  };
});

import { openaiChatJSON } from "@/lib/ai/itinerary/openai";
import { extractPlaceCandidatesFromSources } from "@/lib/ai/linkImport/extractPlaceCandidates";

describe("extractPlaceCandidatesFromSources", () => {
  it("passes canonical URLs and source text to the LLM prompt builder", async () => {
    const sources: LinkImportIngestResult[] = [
      {
        source: {
          provider: "youtube",
          url: "https://youtu.be/abc",
          canonicalUrl: "https://www.youtube.com/watch?v=abc",
          title: "My Rome trip",
        },
        text: {
          description: "We went to Roscioli and the Colosseum.",
        },
      },
    ];

    await extractPlaceCandidatesFromSources({
      destination: { city: "Rome", country: "Italy" },
      sources,
      maxTokens: 123,
    });

    expect(openaiChatJSON).toHaveBeenCalledTimes(1);
    const call = (openaiChatJSON as any).mock.calls[0][0];
    expect(call.user).toContain("Destination context: Rome, Italy");
    expect(call.user).toContain("canonicalUrl: https://www.youtube.com/watch?v=abc");
    expect(call.user).toContain("Roscioli");
    expect(call.maxTokens).toBe(123);
  });
});

