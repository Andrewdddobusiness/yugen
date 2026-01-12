const META_TAG_REGEX = /<meta\s+[^>]*>/gi;
const SCRIPT_JSON_LD_REGEX = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

const parseAttributes = (tag: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const ATTR_REGEX = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = ATTR_REGEX.exec(tag)) !== null) {
    const key = match[1]?.toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    if (!key) continue;
    attrs[key] = value;
  }
  return attrs;
};

export const decodeHtmlEntities = (input: string): string => {
  const value = String(input ?? "");
  if (!value) return "";

  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
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
    });
};

export function extractMetaContent(html: string, key: string): string | null {
  const target = String(key ?? "").trim().toLowerCase();
  if (!target) return null;

  const input = String(html ?? "");
  let match: RegExpExecArray | null;
  while ((match = META_TAG_REGEX.exec(input)) !== null) {
    const tag = match[0];
    if (!tag) continue;
    const attrs = parseAttributes(tag);
    const property = (attrs.property ?? attrs.name ?? "").toLowerCase();
    if (property !== target) continue;
    const content = attrs.content ?? "";
    const decoded = decodeHtmlEntities(content).trim();
    if (decoded) return decoded;
  }

  return null;
}

export function extractOpenGraph(html: string): { title?: string; description?: string; image?: string } {
  const title = extractMetaContent(html, "og:title") ?? extractMetaContent(html, "twitter:title") ?? undefined;
  const description =
    extractMetaContent(html, "og:description") ??
    extractMetaContent(html, "description") ??
    extractMetaContent(html, "twitter:description") ??
    undefined;
  const image = extractMetaContent(html, "og:image") ?? extractMetaContent(html, "twitter:image") ?? undefined;

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
  };
}

export function extractJsonLdObjects(html: string, maxObjects = 10): any[] {
  const input = String(html ?? "");
  const objects: any[] = [];
  let match: RegExpExecArray | null;

  while ((match = SCRIPT_JSON_LD_REGEX.exec(input)) !== null) {
    const raw = String(match[1] ?? "").trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) objects.push(item);
      } else {
        objects.push(parsed);
      }
    } catch {
      // ignore
    }
    if (objects.length >= maxObjects) break;
  }

  return objects.slice(0, maxObjects);
}

const stripTags = (html: string) => {
  let out = String(html ?? "");
  out = out.replace(/<script[\s\S]*?<\/script>/gi, " ");
  out = out.replace(/<style[\s\S]*?<\/style>/gi, " ");
  out = out.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  out = out.replace(/<!--([\s\S]*?)-->/g, " ");
  out = out.replace(/<\/(p|div|br|li|h[1-6])\s*>/gi, "\n");
  out = out.replace(/<[^>]+>/g, " ");
  return out;
};

export function extractVisibleText(html: string, maxChars = 20_000): string {
  const raw = stripTags(html);
  const decoded = decodeHtmlEntities(raw);
  const collapsed = decoded.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  if (collapsed.length <= maxChars) return collapsed;
  return collapsed.slice(0, maxChars);
}

export function pickBestJsonLdText(objects: any[]): { title?: string; description?: string } {
  const pickString = (value: any): string | undefined => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (value && typeof value === "object") {
      if (typeof (value as any).text === "string") {
        const trimmed = String((value as any).text).trim();
        if (trimmed) return trimmed;
      }
    }
    return undefined;
  };

  for (const obj of objects) {
    if (!obj || typeof obj !== "object") continue;

    const graph = (obj as any)["@graph"];
    const candidates: any[] = Array.isArray(graph) ? graph : [obj];
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object") continue;
      const title = pickString((candidate as any).name);
      const description = pickString((candidate as any).description);
      if (title || description) {
        return { ...(title ? { title } : {}), ...(description ? { description } : {}) };
      }
    }
  }

  return {};
}

