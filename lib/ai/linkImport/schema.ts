import { z } from "zod";

export const LinkImportCandidateSchema = z.object({
  sourceCanonicalUrl: z.string().trim().url(),
  query: z.string().trim().min(2).max(200),
  evidence: z.string().trim().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export type LinkImportCandidate = z.infer<typeof LinkImportCandidateSchema>;

export const ExtractCandidatesResultSchema = z.object({
  assistantMessage: z.string().trim().min(1).max(2000),
  candidates: z.array(LinkImportCandidateSchema).max(15),
});

export type ExtractCandidatesResult = z.infer<typeof ExtractCandidatesResultSchema>;

