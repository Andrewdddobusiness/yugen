# 001 — Epic: Import places from links into itinerary drafts

## Summary
Enable users to paste links (YouTube Shorts, TikTok, Instagram Reels, TripAdvisor, and generic travel webpages) into the existing Itinerary AI Assistant chat and get a **draft** list (cap: 15) of **unscheduled** places that can be confirmed and added to the itinerary. Persist durable source attribution so each created activity can show “Came from …” with a link back (and embed where possible).

## Goals
- Paste 1+ URLs into the AI chat and receive a draft of up to 15 `add_place` operations (default: unscheduled).
- Best-effort extraction without paid/official platform APIs.
- Show a source preview in chat (embed when publicly embeddable; otherwise show link preview).
- On apply, add places to the itinerary and persist source attribution for activity previews.

## Non-goals (MVP)
- Full video computer-vision analysis (download + frame/OCR/audio).
- Bypassing login walls / DRM / private content restrictions.
- Perfect extraction across the open web; degrade gracefully and ask users to paste text when blocked.

## Constraints
- No paid/official APIs.
- Web users should be able to view imported videos without being logged in *when the content is public/embeddable*.
- Import cap: 15 places per import run.

## Acceptance criteria
- [ ] Pasting a YouTube Shorts link returns a draft (≤15) and a playable embed (for public videos).
- [ ] TikTok + Instagram + TripAdvisor + generic webpages work best-effort; if blocked, assistant prompts user to paste caption/text.
- [ ] Draft persists in the existing AI chat thread and survives refresh.
- [ ] Applying the draft creates itinerary activities (unscheduled) and persists source attribution.
- [ ] Activity preview shows source link back (and embed where possible).

## Tickets
- `docs/tasks/002_db_source_attribution.md`
- `docs/tasks/003_url_ingestion_and_extraction.md`
- `docs/tasks/004_ai_place_extraction_and_resolution.md`
- `docs/tasks/005_api_itinerary_import_mode.md`
- `docs/tasks/006_ui_chat_import_and_sources.md`

## Tasks
### 1.0 Product decisions
- [ ] 1.1 Confirm max URLs per import message (suggest: 3) and dedupe rules (canonical URL).
- [ ] 1.2 Confirm “unscheduled by default” semantics: imported places set `date: null`, no times.
- [ ] 1.3 Confirm blocked-content fallback: prompt user to paste caption/description text.
- [ ] 1.4 Confirm ambiguity behavior: skip unresolved items vs keep unresolved draft rows and require selection.

### 2.0 Delivery sequence
- [ ] 2.1 Ship DB tables + RLS first so attribution can be stored on apply.
- [ ] 2.2 Ship server ingestion/extraction + AI resolution next (YouTube + generic first, then TikTok/IG/TripAdvisor heuristics).
- [ ] 2.3 Ship UI: chat source preview + activity source display once data is available.
