export type LinkImportProvider = "youtube" | "tiktok" | "instagram" | "tripadvisor" | "web";

export type LinkImportSource = {
  provider: LinkImportProvider;
  url: string;
  canonicalUrl: string;
  externalId?: string;
  title?: string;
  thumbnailUrl?: string;
  embedUrl?: string;
  rawMetadata?: Record<string, any>;
};

export type LinkImportTextSignals = {
  title?: string;
  description?: string;
  caption?: string;
  transcript?: string;
  articleText?: string;
  rawText?: string;
};

export type LinkImportIngestResult = {
  source: LinkImportSource;
  text: LinkImportTextSignals;
  debug?: { blocked?: boolean; reason?: string };
};

export type SafeFetchResult = {
  ok: true;
  url: string;
  status: number;
  contentType: string | null;
  text: string;
  bytesRead: number;
  redirects: string[];
};

export type SafeFetchError = {
  ok: false;
  url: string;
  code:
    | "invalid_url"
    | "disallowed_protocol"
    | "blocked_host"
    | "blocked_ip"
    | "too_many_redirects"
    | "redirect_missing_location"
    | "timeout"
    | "http_error"
    | "content_type_not_allowed"
    | "too_large"
    | "fetch_failed";
  message: string;
  status?: number;
  redirects?: string[];
};

export type SafeFetch = (url: string, options?: { timeoutMs?: number; maxBytes?: number }) => Promise<SafeFetchResult | SafeFetchError>;

