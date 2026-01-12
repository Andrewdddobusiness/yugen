/**
 * @jest-environment node
 */

import type { SafeFetchResult } from "@/lib/linkImport/server/types";
import { ingestLinkUrl } from "@/lib/linkImport/server/providers";

const ok = (args: { url: string; contentType: string; text: string; redirects?: string[] }): SafeFetchResult => {
  return {
    ok: true,
    url: args.url,
    status: 200,
    contentType: args.contentType,
    text: args.text,
    bytesRead: Buffer.byteLength(args.text, "utf-8"),
    redirects: args.redirects ?? [],
  };
};

describe("ingestLinkUrl", () => {
  it("ingests YouTube links with oEmbed + description + transcript (best-effort)", async () => {
    const videoId = "abcDEF12345";

    const safeFetch = async (url: string) => {
      if (url.startsWith("https://www.youtube.com/oembed")) {
        return ok({
          url,
          contentType: "application/json",
          text: JSON.stringify({
            title: "Rome food guide",
            thumbnail_url: "https://i.ytimg.com/vi/abcDEF12345/hqdefault.jpg",
            author_name: "Creator",
            provider_name: "YouTube",
          }),
        });
      }

      if (url.startsWith("https://video.google.com/timedtext")) {
        return ok({
          url,
          contentType: "text/xml",
          text: `<transcript><text start="0" dur="1">Visit the Louvre Museum</text><text start="1" dur="1">then Eiffel Tower</text></transcript>`,
        });
      }

      // Initial URL fetch (followed redirects already).
      return ok({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        contentType: "text/html",
        text: `<html><head><meta property="og:title" content="Fallback title"/><meta property="og:description" content="Fallback description"/></head><body>
<script>var ytInitialPlayerResponse = {"videoDetails":{"title":"Rome food guide","shortDescription":"Go to the Louvre Museum and the Eiffel Tower"}};</script>
</body></html>`,
        redirects: ["https://youtu.be/abcDEF12345"],
      });
    };

    const result = await ingestLinkUrl({ url: `https://youtu.be/${videoId}`, safeFetch });
    expect(result.source.provider).toBe("youtube");
    expect(result.source.externalId).toBe(videoId);
    expect(result.source.canonicalUrl).toBe(`https://www.youtube.com/watch?v=${videoId}`);
    expect(result.source.embedUrl).toBe(`https://www.youtube.com/embed/${videoId}`);
    expect(result.text.description).toContain("Louvre Museum");
    expect(result.text.transcript).toContain("Eiffel Tower");
  });

  it("ingests TikTok links using canonical URL + oEmbed title + embedUrl when video id is present", async () => {
    const safeFetch = async (url: string) => {
      if (url.startsWith("https://www.tiktok.com/oembed")) {
        return ok({
          url,
          contentType: "application/json",
          text: JSON.stringify({
            title: "Best coffee in Tokyo",
            thumbnail_url: "https://example.com/thumb.jpg",
            author_name: "Creator",
            provider_name: "TikTok",
          }),
        });
      }

      return ok({
        url: "https://www.tiktok.com/@user/video/1234567890123456789?is_from_webapp=1",
        contentType: "text/html",
        text: `<html><head><meta property="og:title" content="OG title"/></head><body></body></html>`,
      });
    };

    const result = await ingestLinkUrl({ url: "https://vm.tiktok.com/short", safeFetch });
    expect(result.source.provider).toBe("tiktok");
    expect(result.source.externalId).toBe("1234567890123456789");
    expect(result.source.canonicalUrl).toBe("https://www.tiktok.com/@user/video/1234567890123456789");
    expect(result.source.embedUrl).toBe("https://www.tiktok.com/embed/v2/1234567890123456789");
    expect(result.text.caption).toBe("Best coffee in Tokyo");
  });

  it("ingests Instagram links via OpenGraph metadata and embed URL", async () => {
    const safeFetch = async (_url: string) => {
      return ok({
        url: "https://www.instagram.com/reel/ABC123xyz/?igsh=tracking",
        contentType: "text/html",
        text: `<html><head>
<meta property="og:title" content="Reel title"/>
<meta property="og:description" content="Try Bar Roscioli and Trastevere"/>
<meta property="og:image" content="https://example.com/image.jpg"/>
</head><body></body></html>`,
      });
    };

    const result = await ingestLinkUrl({ url: "https://www.instagram.com/reel/ABC123xyz/?igsh=tracking", safeFetch });
    expect(result.source.provider).toBe("instagram");
    expect(result.source.externalId).toBe("ABC123xyz");
    expect(result.source.canonicalUrl).toBe("https://www.instagram.com/reel/ABC123xyz/");
    expect(result.source.embedUrl).toBe("https://www.instagram.com/reel/ABC123xyz/embed");
    expect(result.text.caption).toContain("Roscioli");
  });
});

