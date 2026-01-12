# 006 — UI: Chat link-import + activity source attribution display

## Summary
Extend the existing Itinerary Assistant chat panel to support URL import UX: show source cards (embed video where possible), show extracted places as draft changes, and handle clarifications. After apply, show “Came from …” source attribution in activity previews (link back + embed where possible).

## Acceptance criteria
- [x] Pasting URLs into the chat triggers the import flow and shows source previews.
- [x] Draft changes render exactly like existing draft operations (confirm/apply).
- [x] Draft + source previews restore after refresh (from history endpoint).
- [x] Activity previews show source attribution (link back + embed where possible).

## Tasks
### 1.0 URL-aware input + submission
- [x] 1.1 Detect URLs in the message on submit and route to `mode:"import"` (or let server auto-detect).
- [x] 1.2 Show a small “Importing from link…” state distinct from normal “Thinking…”.

### 2.0 Source preview UI (chat)
- [x] 2.1 Render source cards above the draft changes: title, provider, thumbnail, open link.
- [x] 2.2 Render allowlisted embeds (YouTube iframe; TikTok/Instagram best-effort) without requiring login when the content is public.
- [x] 2.3 If embed fails, fall back to “Open source” link only.

### 3.0 Draft restoration + dismissal
- [x] 3.1 Extend history load to read `draft_sources` and restore source cards with the draft.
- [x] 3.2 Ensure “Dismiss” clears both draft ops and source preview state.

### 4.0 Clarifications
- [x] 4.1 Render clarification prompts in the message stream (options list).
- [x] 4.2 Ensure user replies re-run import/resolve correctly.

### 5.0 Activity source attribution display
- [x] 5.1 Include sources in builder bootstrap payload (or fetch on-demand) so UI can render attribution.
- [x] 5.2 Add a “Source” section in activity previews (desktop right sidebar + map overlay + mobile sheet where applicable).
- [x] 5.3 Render allowlisted embeds (YouTube) and safe fallbacks (open link) for other providers.
