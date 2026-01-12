/**
 * @jest-environment node
 */

import { createSafeFetch } from "@/lib/linkImport/server/safeFetch";

describe("createSafeFetch", () => {
  it("blocks disallowed protocols", async () => {
    const safeFetch = createSafeFetch();
    const res = await safeFetch("file:///etc/passwd");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("disallowed_protocol");
    }
  });

  it("blocks localhost", async () => {
    const safeFetch = createSafeFetch();
    const res = await safeFetch("http://localhost:1234/test");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("blocked_host");
    }
  });

  it("blocks direct private IPs", async () => {
    const safeFetch = createSafeFetch();
    const res = await safeFetch("http://127.0.0.1/test");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("blocked_ip");
    }
  });

  it("re-validates redirects and blocks redirecting into private IP space", async () => {
    const dnsLookup = async (hostname: string) => {
      if (hostname === "example.com") return ["93.184.216.34"];
      if (hostname === "internal") return ["10.0.0.1"];
      return ["93.184.216.34"];
    };

    const fetchFn = jest.fn(async (url: string) => {
      if (url === "https://example.com/") {
        return new Response(null, { status: 302, headers: { location: "http://internal/" } });
      }
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
    }) as any;

    const safeFetch = createSafeFetch({ dnsLookup, fetchFn, maxRedirects: 3 });
    const res = await safeFetch("https://example.com/");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("blocked_ip");
      expect(res.redirects).toEqual(["https://example.com/"]);
    }
  });

  it("rejects content types that are not allowed", async () => {
    const dnsLookup = async () => ["93.184.216.34"];
    const fetchFn = jest.fn(async () => {
      return new Response("binary", { status: 200, headers: { "content-type": "application/octet-stream" } });
    }) as any;

    const safeFetch = createSafeFetch({ dnsLookup, fetchFn });
    const res = await safeFetch("https://example.com/");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("content_type_not_allowed");
    }
  });

  it("enforces maxBytes via content-length", async () => {
    const dnsLookup = async () => ["93.184.216.34"];
    const fetchFn = jest.fn(async () => {
      return new Response("hello", {
        status: 200,
        headers: { "content-type": "text/plain", "content-length": "100" },
      });
    }) as any;

    const safeFetch = createSafeFetch({ dnsLookup, fetchFn });
    const res = await safeFetch("https://example.com/", { maxBytes: 50 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("too_large");
    }
  });

  it("returns ok for allowed content types", async () => {
    const dnsLookup = async () => ["93.184.216.34"];
    const fetchFn = jest.fn(async () => {
      return new Response("hello", { status: 200, headers: { "content-type": "text/plain" } });
    }) as any;

    const safeFetch = createSafeFetch({ dnsLookup, fetchFn });
    const res = await safeFetch("https://example.com/");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.text).toBe("hello");
      expect(res.contentType).toBe("text/plain");
    }
  });
});

