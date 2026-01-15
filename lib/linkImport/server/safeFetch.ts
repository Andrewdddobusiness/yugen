import dns from "node:dns/promises";
import net from "node:net";
import { isBlockedHostname, isPrivateOrReservedIp } from "@/lib/linkImport/server/ip";
import type { SafeFetch, SafeFetchError, SafeFetchResult } from "@/lib/linkImport/server/types";

type FetchLike = typeof fetch;

type SafeFetchConfig = {
  fetchFn?: FetchLike;
  dnsLookup?: (hostname: string) => Promise<string[]>;
  maxRedirects?: number;
  timeoutMs?: number;
  maxBytes?: number;
  allowedContentTypes?: string[];
  userAgent?: string;
  acceptLanguage?: string;
};

const DEFAULT_ALLOWED_CONTENT_TYPES = [
  "text/html",
  "text/plain",
  "application/json",
  "application/ld+json",
  "text/xml",
  "application/xml",
];

const getBaseContentType = (value: string | null) => {
  if (!value) return null;
  return value.split(";")[0]?.trim().toLowerCase() ?? null;
};

const defaultDnsLookup = async (hostname: string): Promise<string[]> => {
  const records = await dns.lookup(hostname, { all: true });
  return records.map((row) => row.address);
};

const readTextWithLimit = async (response: Response, maxBytes: number): Promise<{ text: string; bytesRead: number } | { error: "too_large" }> => {
  const contentLengthRaw = response.headers.get("content-length");
  if (contentLengthRaw) {
    const asNumber = Number(contentLengthRaw);
    if (Number.isFinite(asNumber) && asNumber > maxBytes) {
      return { error: "too_large" };
    }
  }

  const stream = response.body;
  if (!stream) return { text: "", bytesRead: 0 };

  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let bytesRead = 0;
  let out = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        return { error: "too_large" };
      }
      out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
    return { text: out, bytesRead };
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
};

const isRedirectStatus = (status: number) => status === 301 || status === 302 || status === 303 || status === 307 || status === 308;

const isAllowedContentType = (contentType: string | null, allowed: Set<string>) => {
  const base = getBaseContentType(contentType);
  if (!base) return false;
  return allowed.has(base);
};

const validateHost = async (hostname: string, lookup: (hostname: string) => Promise<string[]>) => {
  if (isBlockedHostname(hostname)) {
    return { ok: false as const, code: "blocked_host" as const, message: `Blocked hostname: ${hostname}` };
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { ok: false as const, code: "blocked_ip" as const, message: `Blocked IP: ${hostname}` };
    }
    return { ok: true as const };
  }

  const ips = await lookup(hostname);
  for (const ip of ips) {
    if (isPrivateOrReservedIp(ip)) {
      return { ok: false as const, code: "blocked_ip" as const, message: `Blocked IP: ${ip}` };
    }
  }

  return { ok: true as const };
};

export function createSafeFetch(config: SafeFetchConfig = {}): SafeFetch {
  const fetchFn = config.fetchFn ?? fetch;
  const dnsLookup = config.dnsLookup ?? defaultDnsLookup;
  const maxRedirects = config.maxRedirects ?? 3;
  const defaultTimeoutMs = config.timeoutMs ?? 8_000;
  const defaultMaxBytes = config.maxBytes ?? 2 * 1024 * 1024;
  const allowed = new Set((config.allowedContentTypes ?? DEFAULT_ALLOWED_CONTENT_TYPES).map((t) => t.toLowerCase()));
  const userAgent = config.userAgent ?? "YugenLinkImport/1.0 (+https://www.planaway.lol)";
  const acceptLanguage = config.acceptLanguage ?? "en-US,en;q=0.9";

  return async (inputUrl: string, options) => {
    const timeoutMs = options?.timeoutMs ?? defaultTimeoutMs;
    const maxBytes = options?.maxBytes ?? defaultMaxBytes;

    let current: URL;
    try {
      current = new URL(String(inputUrl ?? "").trim());
    } catch {
      return {
        ok: false,
        url: String(inputUrl ?? ""),
        code: "invalid_url",
        message: "Invalid URL",
      } satisfies SafeFetchError;
    }

    if (current.protocol !== "http:" && current.protocol !== "https:") {
      return {
        ok: false,
        url: current.toString(),
        code: "disallowed_protocol",
        message: `Unsupported URL protocol: ${current.protocol}`,
      } satisfies SafeFetchError;
    }

    const redirects: string[] = [];

    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const hostCheck = await validateHost(current.hostname, dnsLookup).catch((error) => {
        return { ok: false as const, code: "fetch_failed" as const, message: `DNS lookup failed: ${String((error as any)?.message ?? error)}` };
      });
      if (!hostCheck.ok) {
        return {
          ok: false,
          url: current.toString(),
          code: hostCheck.code,
          message: hostCheck.message,
          redirects,
        } satisfies SafeFetchError;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetchFn(current.toString(), {
          method: "GET",
          redirect: "manual",
          headers: {
            "User-Agent": userAgent,
            "Accept-Language": acceptLanguage,
            Accept: "text/html,application/json,text/plain,application/ld+json,text/xml,application/xml;q=0.9,*/*;q=0.1",
          },
          signal: controller.signal,
          cache: "no-store",
          credentials: "omit",
        });
      } catch (error) {
        clearTimeout(timer);
        const aborted = controller.signal.aborted;
        return {
          ok: false,
          url: current.toString(),
          code: aborted ? "timeout" : "fetch_failed",
          message: aborted ? "Request timed out" : `Fetch failed: ${String((error as any)?.message ?? error)}`,
          redirects,
        } satisfies SafeFetchError;
      } finally {
        clearTimeout(timer);
      }

      if (isRedirectStatus(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          return {
            ok: false,
            url: current.toString(),
            code: "redirect_missing_location",
            message: "Redirect response missing Location header",
            status: response.status,
            redirects,
          } satisfies SafeFetchError;
        }

        redirects.push(current.toString());
        current = new URL(location, current);
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        return {
          ok: false,
          url: current.toString(),
          code: "http_error",
          message: `HTTP error: ${response.status}`,
          status: response.status,
          redirects,
        } satisfies SafeFetchError;
      }

      const contentType = response.headers.get("content-type");
      if (!isAllowedContentType(contentType, allowed)) {
        return {
          ok: false,
          url: current.toString(),
          code: "content_type_not_allowed",
          message: `Content-Type not allowed: ${contentType ?? "unknown"}`,
          status: response.status,
          redirects,
        } satisfies SafeFetchError;
      }

      const read = await readTextWithLimit(response, maxBytes);
      if ("error" in read) {
        return {
          ok: false,
          url: current.toString(),
          code: "too_large",
          message: `Response exceeded max size (${maxBytes} bytes)`,
          status: response.status,
          redirects,
        } satisfies SafeFetchError;
      }

      return {
        ok: true,
        url: current.toString(),
        status: response.status,
        contentType: getBaseContentType(contentType),
        text: read.text,
        bytesRead: read.bytesRead,
        redirects,
      } satisfies SafeFetchResult;
    }

    return {
      ok: false,
      url: current.toString(),
      code: "too_many_redirects",
      message: `Too many redirects (max ${maxRedirects})`,
      redirects,
    } satisfies SafeFetchError;
  };
}
