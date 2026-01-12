import { extractOpenGraph, extractJsonLdObjects, extractVisibleText, pickBestJsonLdText } from "@/lib/linkImport/server/html";
import { logLinkImport, SHOULD_LOG_LINK_IMPORT } from "@/lib/linkImport/server/logging";
import { createSafeFetch } from "@/lib/linkImport/server/safeFetch";
import type { LinkImportIngestResult, LinkImportProvider, SafeFetch } from "@/lib/linkImport/server/types";
import { extractUrlsFromText, normalizeUrlForDedup, stripTrackingParams } from "@/lib/linkImport/server/url";

const detectProvider = (url: URL): LinkImportProvider => {
  const host = url.hostname.toLowerCase();

  if (host === "youtu.be" || host.endsWith(".youtu.be")) return "youtube";
  if (host === "youtube.com" || host.endsWith(".youtube.com")) return "youtube";

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";

  if (host === "tripadvisor.com" || host.endsWith(".tripadvisor.com") || host.includes("tripadvisor.")) return "tripadvisor";

  return "web";
};

const normalizePlaceProviderUrl = (url: URL) => {
  const normalized = stripTrackingParams(url);
  normalized.hash = "";
  return normalized;
};

const extractYouTubeVideoId = (url: URL): string | null => {
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be" || host.endsWith(".youtu.be")) {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? id : null;
  }

  const path = url.pathname.toLowerCase();
  if (path === "/watch") {
    const v = url.searchParams.get("v") ?? "";
    return /^[a-zA-Z0-9_-]{6,}$/.test(v) ? v : null;
  }

  const shorts = path.match(/^\/shorts\/([a-zA-Z0-9_-]{6,})/);
  if (shorts?.[1]) return shorts[1];

  const embed = path.match(/^\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (embed?.[1]) return embed[1];

  return null;
};

const canonicalizeYouTubeUrl = (videoId: string) => `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
const embedYouTubeUrl = (videoId: string) => `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;

const extractInstagramCode = (url: URL): { kind: "reel" | "p"; code: string } | null => {
  const match = url.pathname.match(/^\/(reel|p)\/([^/]+)/i);
  if (!match?.[1] || !match?.[2]) return null;
  const kind = match[1].toLowerCase() as "reel" | "p";
  const code = match[2];
  if (!/^[a-zA-Z0-9_-]+$/.test(code)) return null;
  return { kind, code };
};

const canonicalizeInstagramUrl = (kind: "reel" | "p", code: string) => `https://www.instagram.com/${kind}/${encodeURIComponent(code)}/`;
const embedInstagramUrl = (kind: "reel" | "p", code: string) => `https://www.instagram.com/${kind}/${encodeURIComponent(code)}/embed`;

const extractTikTokVideoId = (url: URL): string | null => {
  const match = url.pathname.match(/\/video\/(\d{6,})/);
  if (match?.[1]) return match[1];
  return null;
};

const embedTikTokUrl = (videoId: string) => `https://www.tiktok.com/embed/v2/${encodeURIComponent(videoId)}`;

const makeMetadata = (args: { og?: any; jsonld?: any; oembed?: any }) => {
  const out: Record<string, any> = {};
  if (args.og) out.og = args.og;
  if (args.jsonld) out.jsonld = args.jsonld;
  if (args.oembed) out.oembed = args.oembed;
  return out;
};

const looksBlocked = (html: string) => {
  const text = html.toLowerCase();
  if (text.includes("captcha")) return true;
  if (text.includes("verify you are human")) return true;
  if (text.includes("login") && text.includes("password")) return true;
  if (text.includes("sign in") && text.includes("account")) return true;
  return false;
};

const extractJsonFromJsAssignment = (html: string, varName: string): any | null => {
  const input = String(html ?? "");
  const idx = input.indexOf(varName);
  if (idx < 0) return null;

  const assignIdx = input.indexOf("=", idx);
  if (assignIdx < 0) return null;

  const startIdx = input.indexOf("{", assignIdx);
  if (startIdx < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIdx; i < input.length; i += 1) {
    const ch = input[i];
    if (!ch) continue;

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;

    if (depth === 0) {
      const jsonText = input.slice(startIdx, i + 1);
      try {
        return JSON.parse(jsonText);
      } catch {
        return null;
      }
    }
  }

  return null;
};

const extractYouTubeTimedText = async (args: { safeFetch: SafeFetch; videoId: string }): Promise<string | null> => {
  const endpoints = [
    `https://video.google.com/timedtext?lang=en&v=${encodeURIComponent(args.videoId)}`,
    `https://www.youtube.com/api/timedtext?lang=en&v=${encodeURIComponent(args.videoId)}`,
  ];

  for (const url of endpoints) {
    const res = await args.safeFetch(url, { maxBytes: 512_000, timeoutMs: 6_000 });
    if (!res.ok) continue;
    const xml = res.text;
    const lines: string[] = [];
    const regex = /<text\b[^>]*>([\s\S]*?)<\/text>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      const raw = match[1] ?? "";
      const decoded = raw
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
          try {
            return String.fromCodePoint(parseInt(hex, 16));
          } catch {
            return "";
          }
        })
        .replace(/&#(\d+);/g, (_m, dec) => {
          try {
            return String.fromCodePoint(parseInt(dec, 10));
          } catch {
            return "";
          }
        })
        .replace(/\s+/g, " ")
        .trim();
      if (decoded) lines.push(decoded);
      if (lines.join(" ").length > 8000) break;
    }
    const joined = lines.join(" ").trim();
    if (joined) return joined.slice(0, 8000);
  }

  return null;
};

const fetchOEmbedJSON = async (args: { safeFetch: SafeFetch; endpoint: string }): Promise<any | null> => {
  const res = await args.safeFetch(args.endpoint, { maxBytes: 256_000, timeoutMs: 6_000 });
  if (!res.ok) return null;
  try {
    return JSON.parse(res.text);
  } catch {
    return null;
  }
};

export async function ingestLinkUrl(args: { url: string; safeFetch?: SafeFetch }): Promise<LinkImportIngestResult> {
  const safeFetch = args.safeFetch ?? createSafeFetch();

  let parsed: URL;
  try {
    parsed = new URL(String(args.url ?? "").trim());
  } catch {
    return {
      source: {
        provider: "web",
        url: String(args.url ?? ""),
        canonicalUrl: String(args.url ?? ""),
      },
      text: {},
      debug: { blocked: true, reason: "Invalid URL" },
    };
  }

  // Fetch HTML to (a) follow redirects to canonical host and (b) extract metadata/text where possible.
  const htmlRes = await safeFetch(parsed.toString(), { maxBytes: 2 * 1024 * 1024, timeoutMs: 8_000 });
  const finalUrl = htmlRes.ok ? htmlRes.url : parsed.toString();
  const final = new URL(finalUrl);

  const normalizedFinal = normalizeUrlForDedup(normalizePlaceProviderUrl(final));
  const html = htmlRes.ok ? htmlRes.text : "";
  const blocked = !htmlRes.ok || (html && looksBlocked(html));
  const reason = !htmlRes.ok ? htmlRes.message : html && looksBlocked(html) ? "Blocked by provider" : undefined;

  const provider = detectProvider(final);

  if (provider === "youtube") {
    const videoId = extractYouTubeVideoId(final) ?? extractYouTubeVideoId(parsed);
    const canonicalUrl = videoId ? canonicalizeYouTubeUrl(videoId) : normalizedFinal;
    const embedUrl = videoId ? embedYouTubeUrl(videoId) : undefined;

    const oembed = videoId
      ? await fetchOEmbedJSON({
          safeFetch,
          endpoint: `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
        })
      : null;

    const og = html ? extractOpenGraph(html) : {};
    const player = html ? extractJsonFromJsAssignment(html, "ytInitialPlayerResponse") : null;

    const title =
      (typeof oembed?.title === "string" ? oembed.title : "") ||
      (typeof player?.videoDetails?.title === "string" ? player.videoDetails.title : "") ||
      og.title ||
      undefined;
    const description =
      (typeof player?.videoDetails?.shortDescription === "string" ? player.videoDetails.shortDescription : "") ||
      og.description ||
      undefined;

    const transcript = videoId ? await extractYouTubeTimedText({ safeFetch, videoId }) : null;

    return {
      source: {
        provider,
        url: parsed.toString(),
        canonicalUrl,
        ...(videoId ? { externalId: videoId } : {}),
        ...(title ? { title } : {}),
        ...(typeof oembed?.thumbnail_url === "string"
          ? { thumbnailUrl: oembed.thumbnail_url }
          : og.image
            ? { thumbnailUrl: og.image }
            : {}),
        ...(embedUrl ? { embedUrl } : {}),
        rawMetadata: makeMetadata({
          og: Object.keys(og).length ? og : undefined,
          jsonld: undefined,
          oembed: oembed
            ? {
                title: oembed.title,
                author_name: oembed.author_name,
                provider_name: oembed.provider_name,
                thumbnail_url: oembed.thumbnail_url,
              }
            : undefined,
        }),
      },
      text: {
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(transcript ? { transcript } : {}),
      },
      ...(blocked ? { debug: { blocked: true, reason: reason ?? "Blocked" } } : {}),
    };
  }

  if (provider === "tiktok") {
    const videoId = extractTikTokVideoId(final);
    const canonicalUrl = (() => {
      const clean = normalizePlaceProviderUrl(final);
      clean.search = "";
      clean.hash = "";
      if (videoId) {
        const match = clean.pathname.match(/^(\/[^/]+\/video\/\d{6,})/);
        if (match?.[1]) clean.pathname = match[1];
      }
      return normalizeUrlForDedup(clean);
    })();
    const oembed = await fetchOEmbedJSON({
      safeFetch,
      endpoint: `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`,
    });

    const og = html ? extractOpenGraph(html) : {};
    const title = (typeof oembed?.title === "string" ? oembed.title : "") || og.title || undefined;
    const caption = title;
    const embedUrl =
      videoId ? embedTikTokUrl(videoId) : undefined;

    return {
      source: {
        provider,
        url: parsed.toString(),
        canonicalUrl,
        ...(videoId ? { externalId: videoId } : {}),
        ...(title ? { title } : {}),
        ...(typeof oembed?.thumbnail_url === "string"
          ? { thumbnailUrl: oembed.thumbnail_url }
          : og.image
            ? { thumbnailUrl: og.image }
            : {}),
        ...(embedUrl ? { embedUrl } : {}),
        rawMetadata: makeMetadata({
          og: Object.keys(og).length ? og : undefined,
          jsonld: undefined,
          oembed: oembed
            ? {
                title: oembed.title,
                author_name: oembed.author_name,
                provider_name: oembed.provider_name,
                thumbnail_url: oembed.thumbnail_url,
              }
            : undefined,
        }),
      },
      text: {
        ...(title ? { title } : {}),
        ...(caption ? { caption } : {}),
      },
      ...(blocked ? { debug: { blocked: true, reason: reason ?? "Blocked" } } : {}),
    };
  }

  if (provider === "instagram") {
    const code = extractInstagramCode(final);
    const canonicalUrl = code ? canonicalizeInstagramUrl(code.kind, code.code) : normalizedFinal;
    const embedUrl = code ? embedInstagramUrl(code.kind, code.code) : undefined;

    const og = html ? extractOpenGraph(html) : {};
    const title = og.title;
    const description = og.description;

    return {
      source: {
        provider,
        url: parsed.toString(),
        canonicalUrl,
        ...(code ? { externalId: code.code } : {}),
        ...(title ? { title } : {}),
        ...(og.image ? { thumbnailUrl: og.image } : {}),
        ...(embedUrl ? { embedUrl } : {}),
        rawMetadata: makeMetadata({ og: Object.keys(og).length ? og : undefined }),
      },
      text: {
        ...(title ? { title } : {}),
        ...(description ? { caption: description } : {}),
      },
      ...(blocked ? { debug: { blocked: true, reason: reason ?? "Blocked" } } : {}),
    };
  }

  // TripAdvisor + generic web pages
  const og = html ? extractOpenGraph(html) : {};
  const jsonLd = html ? extractJsonLdObjects(html) : [];
  const bestJsonLd = jsonLd.length > 0 ? pickBestJsonLdText(jsonLd) : {};

  const title = og.title ?? bestJsonLd.title ?? undefined;
  const description = og.description ?? bestJsonLd.description ?? undefined;

  // Keep this conservative to avoid sending huge/unhelpful page chrome to the model.
  const articleText = html ? extractVisibleText(html, 20_000) : "";

  return {
    source: {
      provider,
      url: parsed.toString(),
      canonicalUrl: normalizedFinal,
      ...(title ? { title } : {}),
      ...(og.image ? { thumbnailUrl: og.image } : {}),
      rawMetadata: makeMetadata({
        og: Object.keys(og).length ? og : undefined,
        jsonld: Object.keys(bestJsonLd).length ? bestJsonLd : undefined,
      }),
    },
    text: {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(articleText ? { articleText } : {}),
    },
    ...(blocked ? { debug: { blocked: true, reason: reason ?? "Blocked" } } : {}),
  };
}

export async function ingestUrlsFromMessage(args: {
  message: string;
  maxUrls?: number;
  safeFetch?: SafeFetch;
}): Promise<LinkImportIngestResult[]> {
  const maxUrls = args.maxUrls ?? 3;
  const baseSafeFetch = args.safeFetch ?? createSafeFetch();

  const urls = extractUrlsFromText(args.message, maxUrls);
  const ingested: LinkImportIngestResult[] = [];

  const telemetry = SHOULD_LOG_LINK_IMPORT
    ? {
        providerCounts: {
          youtube: 0,
          tiktok: 0,
          instagram: 0,
          tripadvisor: 0,
          web: 0,
        } satisfies Record<LinkImportProvider, number>,
        blockedCount: 0,
        bytesFetched: 0,
        fetchCalls: 0,
        fetchErrorsByCode: {} as Record<string, number>,
      }
    : null;

  const safeFetch: SafeFetch = telemetry
    ? async (url, options) => {
        telemetry.fetchCalls += 1;
        const res = await baseSafeFetch(url, options);
        if (res.ok) {
          telemetry.bytesFetched += res.bytesRead;
        } else {
          telemetry.fetchErrorsByCode[res.code] = (telemetry.fetchErrorsByCode[res.code] ?? 0) + 1;
        }
        return res;
      }
    : baseSafeFetch;

  const seen = new Set<string>();
  for (const url of urls) {
    const result = await ingestLinkUrl({ url, safeFetch });
    const key = result.source.canonicalUrl;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    ingested.push(result);

    if (telemetry) {
      telemetry.providerCounts[result.source.provider] += 1;
      if (result.debug?.blocked) telemetry.blockedCount += 1;
    }
  }

  if (telemetry) {
    logLinkImport("ingest_urls", {
      extractedUrlCount: urls.length,
      ingestedUrlCount: ingested.length,
      providerCounts: telemetry.providerCounts,
      blockedCount: telemetry.blockedCount,
      bytesFetched: telemetry.bytesFetched,
      fetchCalls: telemetry.fetchCalls,
      fetchErrorsByCode: telemetry.fetchErrorsByCode,
    });
  }

  return ingested;
}
