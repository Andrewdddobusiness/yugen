import { extractUrlsFromText, normalizeUrlForDedup } from "@/lib/linkImport/server/url";

describe("linkImport url helpers", () => {
  it("extractUrlsFromText finds URLs and trims trailing punctuation", () => {
    const message =
      'Check this out: https://youtu.be/abcDEF12345). And also https://example.com/page?utm_source=x&b=2&a=1, thanks!';
    const urls = extractUrlsFromText(message, 10);
    expect(urls).toEqual([
      "https://youtu.be/abcDEF12345",
      "https://example.com/page?utm_source=x&b=2&a=1",
    ]);
  });

  it("normalizeUrlForDedup strips tracking params, fragments, and sorts query params", () => {
    const url = new URL("https://Example.com/Page/?b=2&utm_campaign=test&a=1#section");
    const normalized = normalizeUrlForDedup(url);
    expect(normalized).toBe("https://example.com/Page?a=1&b=2");
  });
});

