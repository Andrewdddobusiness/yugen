# 003 — Server: URL ingestion + provider extraction (YouTube/TikTok/Instagram/TripAdvisor/web)

## Summary
Implement the hardened “URL → source signals” pipeline used by link-import: safe fetching, provider detection/canonicalization, metadata extraction (oEmbed/OG/JSON-LD), and provider-specific text extraction. Includes SSRF safeguards, caps, and core unit tests.

## Acceptance criteria
- [x] Supports multiple URLs in one message (cap + dedupe).
- [x] SSRF protections prevent internal network access and large downloads.
- [x] Provider detection produces `{ provider, canonicalUrl, externalId?, embedUrl? }`.
- [x] Returns best-effort text signals for all supported sources; if blocked, returns metadata-only + `blocked: true`.
- [x] Core parsing/canonicalization has unit tests (mocked fetch).

## Tasks
### 1.0 URL parsing + caps
- [x] 1.1 Extract URLs from a freeform message (support multiple).
- [x] 1.2 Enforce caps (max 3 URLs per import message).
- [x] 1.3 Deduplicate by canonical URL (strip tracking params).

### 2.0 Safe fetcher (SSRF + resource limits)
- [x] 2.1 Only allow `http:`/`https:` URLs.
- [x] 2.2 Block private/reserved IP ranges after DNS resolution (and after redirects).
- [x] 2.3 Limit redirects (3), enforce timeout (8s), and cap response size (2MB).
- [x] 2.4 Allowlist content types for parsing (`text/html`, `application/json`, `text/plain`, plus XML for transcripts).
- [x] 2.5 Re-validate every redirect hop (no redirecting into blocked ranges).
- [x] 2.6 Add stable User-Agent + accept-language headers.

### 3.0 Provider detection + canonicalization + embed URLs
- [x] 3.1 YouTube: detect `watch`, `youtu.be`, `shorts`; canonical URL + embed URL; extract `videoId`.
- [x] 3.2 TikTok: detect canonical post URL; extract `videoId` where possible; embed URL best-effort.
- [x] 3.3 Instagram: detect `reel/` + `p/`; canonical URL + embed URL best-effort (may be login-walled).
- [x] 3.4 TripAdvisor: detect provider and normalize by stripping tracking params (variant normalization can be extended later).
- [x] 3.5 Generic web: normalize URL + strip tracking params; no embed by default.

### 4.0 Metadata helpers (public/no-token)
- [x] 4.1 Implement oEmbed fetcher (YouTube).
- [x] 4.2 Implement oEmbed fetcher (TikTok).
- [x] 4.3 Implement OpenGraph parser (title/description/image).
- [x] 4.4 Implement JSON-LD parser (Article/VideoObject/Place-ish blobs).

### 5.0 Provider-specific text extraction (best-effort)
- [x] 5.1 YouTube: parse HTML/JSON blobs for title + description; best-effort transcript when available without auth.
- [x] 5.2 TikTok: prefer oEmbed fields; fallback to HTML/meta parsing; if blocked mark `blocked: true`.
- [x] 5.3 Instagram: use OG tags; if blocked mark `blocked: true`.
- [x] 5.4 TripAdvisor: parse JSON-LD/OG + conservative page text extraction; if blocked mark `blocked: true`.
- [x] 5.5 Generic pages: prefer JSON-LD + OG; fallback to page text extraction; cap length.

### 6.0 Hardening + tests + telemetry hooks
- [x] 6.1 Unit tests for URL extraction + provider detection (YouTube/TikTok/IG).
- [x] 6.2 Unit tests for canonicalization (strip tracking params; stable ordering).
- [x] 6.3 Unit tests for SSRF blocking (localhost/private ranges) with redirect re-validation.
- [x] 6.4 Add structured logs (provider counts, blocked counts, bytes fetched) behind a debug flag (`LINK_IMPORT_LOG=1`).
