const URL_REGEX = /\bhttps?:\/\/[^\s<>"']+/gi;

const TRAILING_PUNCTUATION = new Set([")", "]", "}", ".", ",", "!", "?", ":", ";"]);

export function extractUrlsFromText(text: string, max = 10): string[] {
  const input = String(text ?? "");
  if (!input) return [];

  const matches = input.match(URL_REGEX) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const trimmed = trimTrailingPunctuation(match);
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= max) break;
  }

  return out;
}

export function trimTrailingPunctuation(url: string): string {
  let value = String(url ?? "").trim();
  if (!value) return "";

  while (value.length > 0) {
    const last = value[value.length - 1];
    if (!TRAILING_PUNCTUATION.has(last)) break;
    value = value.slice(0, -1);
  }

  return value;
}

export function stripTrackingParams(input: URL): URL {
  const url = new URL(input.toString());
  const toDelete: string[] = [];

  url.searchParams.forEach((_value, key) => {
    const k = key.toLowerCase();
    if (k.startsWith("utm_")) toDelete.push(key);
    if (k === "fbclid") toDelete.push(key);
    if (k === "gclid") toDelete.push(key);
    if (k === "igshid" || k === "igsh") toDelete.push(key);
    if (k === "mc_cid" || k === "mc_eid") toDelete.push(key);
    if (k === "mkt_tok") toDelete.push(key);
    if (k === "ref" || k === "ref_src") toDelete.push(key);
  });

  for (const key of toDelete) url.searchParams.delete(key);

  return url;
}

export function normalizeUrlForDedup(input: URL): string {
  const url = stripTrackingParams(input);
  url.hash = "";

  url.hostname = url.hostname.toLowerCase();

  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  const entries = Array.from(url.searchParams.entries()).sort((a, b) => {
    const [ka, va] = a;
    const [kb, vb] = b;
    return ka.localeCompare(kb) || va.localeCompare(vb);
  });
  url.search = "";
  for (const [k, v] of entries) url.searchParams.append(k, v);

  return url.toString();
}

