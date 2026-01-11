# 003 — Server: URL ingestion + provider extraction (YouTube/TikTok/Instagram/TripAdvisor/web)

## Summary
Implement the hardened “URL → source signals” pipeline used by link-import: safe fetching, provider detection/canonicalization, metadata extraction (oEmbed/OG/JSON-LD), and provider-specific text extraction. Includes SSRF safeguards, caps, and core unit tests.

## Acceptance criteria
- [ ] Supports multiple URLs in one message (cap + dedupe).
- [ ] SSRF protections prevent internal network access and large downloads.
- [ ] Provider detection produces `{ provider, canonicalUrl, externalId?, embedUrl? }`.
- [ ] Returns best-effort text signals for all supported sources; if blocked, returns metadata-only + `blocked: true`.
- [ ] Core parsing/canonicalization has unit tests (mocked fetch).

## Tasks
### 1.0 URL parsing + caps
- [ ] 1.1 Extract URLs from a freeform message (support multiple).
- [ ] 1.2 Enforce caps (suggest: max 3 URLs per import message).
- [ ] 1.3 Deduplicate by canonical URL (strip tracking params).

### 2.0 Safe fetcher (SSRF + resource limits)
- [ ] 2.1 Only allow `http:`/`https:` URLs.
- [ ] 2.2 Block private/reserved IP ranges after DNS resolution (and after redirects).
- [ ] 2.3 Limit redirects (e.g., 3), enforce timeout (e.g., 8s), and cap response size (e.g., 2MB).
- [ ] 2.4 Allowlist content types for parsing (`text/html`, `application/json`, `text/plain`).
- [ ] 2.5 Re-validate every redirect hop (no redirecting into blocked ranges).
- [ ] 2.6 Add stable User-Agent + accept-language headers.

### 3.0 Provider detection + canonicalization + embed URLs
- [ ] 3.1 YouTube: detect `watch`, `youtu.be`, `shorts`; canonical URL + embed URL; extract `videoId`.
- [ ] 3.2 TikTok: detect canonical post URL; extract `videoId` where possible; embed URL best-effort.
- [ ] 3.3 Instagram: detect `reel/` + `p/`; canonical URL; embed URL best-effort (may be login-walled).
- [ ] 3.4 TripAdvisor: normalize variants and strip locale/query noise.
- [ ] 3.5 Generic web: normalize URL + strip tracking params; no embed by default.

### 4.0 Metadata helpers (public/no-token)
- [ ] 4.1 Implement oEmbed fetcher (YouTube).
- [ ] 4.2 Implement oEmbed fetcher (TikTok).
- [ ] 4.3 Implement OpenGraph parser (title/description/image).
- [ ] 4.4 Implement JSON-LD parser (Article/VideoObject/Place-ish blobs).

### 5.0 Provider-specific text extraction (best-effort)
- [ ] 5.1 YouTube: parse HTML/JSON blobs for title + description; best-effort transcript when available without auth.
- [ ] 5.2 TikTok: prefer oEmbed fields; fallback to HTML/meta parsing; if blocked mark `blocked: true`.
- [ ] 5.3 Instagram: use OG tags; if blocked mark `blocked: true`.
- [ ] 5.4 TripAdvisor: parse JSON-LD/OG + conservative page text extraction; if blocked mark `blocked: true`.
- [ ] 5.5 Generic pages: prefer JSON-LD + OG; fallback to main-content text extraction; cap length.

### 6.0 Hardening + tests + telemetry hooks
- [ ] 6.1 Unit tests for URL extraction + provider detection (YouTube/TikTok/IG/TripAdvisor).
- [ ] 6.2 Unit tests for canonicalization (strip common tracking params; normalize variants).
- [ ] 6.3 Unit tests for SSRF blocking (localhost/private ranges/link-local) with redirect re-validation.
- [ ] 6.4 Add structured logs (provider counts, blocked counts, bytes fetched) behind a debug flag.
