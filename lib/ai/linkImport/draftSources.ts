import { z } from "zod";

export const LinkImportProviderSchema = z.enum(["youtube", "tiktok", "instagram", "tripadvisor", "web"]);
export type LinkImportProvider = z.infer<typeof LinkImportProviderSchema>;

export const LinkImportDraftSourceSchema = z.object({
  provider: LinkImportProviderSchema,
  url: z.string().trim().min(1).max(2000),
  canonicalUrl: z.string().trim().url(),
  externalId: z.string().trim().max(200).optional(),
  title: z.string().trim().max(500).optional(),
  thumbnailUrl: z.string().trim().url().optional(),
  embedUrl: z.string().trim().url().optional(),
  rawMetadata: z.record(z.any()).optional(),
  blocked: z.boolean().optional(),
  blockedReason: z.string().trim().max(500).optional(),
});

export type LinkImportDraftSource = z.infer<typeof LinkImportDraftSourceSchema>;

export const LinkImportDraftAttributionSchema = z.object({
  placeId: z.string().trim().min(1).max(256),
  sourceCanonicalUrl: z.string().trim().url(),
  snippet: z.string().trim().max(500).optional(),
  timestampSeconds: z.number().int().nonnegative().nullable().optional(),
});

export type LinkImportDraftAttribution = z.infer<typeof LinkImportDraftAttributionSchema>;

export const LinkImportDraftClarificationOptionSchema = z.object({
  placeId: z.string().trim().min(1).max(256),
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(300).optional(),
});

export type LinkImportDraftClarificationOption = z.infer<typeof LinkImportDraftClarificationOptionSchema>;

export const LinkImportDraftPendingClarificationSchema = z.object({
  query: z.string().trim().min(1).max(200),
  sourceCanonicalUrl: z.string().trim().url(),
  evidence: z.string().trim().max(500).optional(),
  options: z.array(LinkImportDraftClarificationOptionSchema).min(1).max(6),
});

export type LinkImportDraftPendingClarification = z.infer<typeof LinkImportDraftPendingClarificationSchema>;

export const LinkImportDraftSourcesSchema = z.object({
  version: z.literal(1),
  sources: z.array(LinkImportDraftSourceSchema).max(3),
  attributions: z.array(LinkImportDraftAttributionSchema).optional(),
  pendingClarifications: z.array(LinkImportDraftPendingClarificationSchema).optional(),
});

export type LinkImportDraftSources = z.infer<typeof LinkImportDraftSourcesSchema>;

