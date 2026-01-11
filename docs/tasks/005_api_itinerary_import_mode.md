# 005 — API: `/api/ai/itinerary` import mode + draft persistence + apply attribution

## Summary
Extend the existing itinerary AI route to support an import workflow that turns URLs into a draft list of unscheduled `add_place` operations, persists the draft + source metadata, and on apply writes source attribution records.

## Acceptance criteria
- [ ] `POST /api/ai/itinerary` supports `mode: "import"` (or auto-detect URL messages in `plan`).
- [ ] Response includes draft ops + source preview metadata for the UI.
- [ ] Draft persists across refresh (ops + source preview) and can be dismissed.
- [ ] On apply, activities are created and linked to sources in DB.

## Tasks
### 1.0 Request/response schemas
- [ ] 1.1 Add `ImportRequestSchema` (e.g., `{ mode:"import", itineraryId, destinationId, message }`).
- [ ] 1.2 Add `ImportResponsePayload` including `operations`, `previewLines`, and `sources` (for UI).
- [ ] 1.3 Add `draft_sources` handling to history GET response so UI can restore previews.

### 2.0 Import orchestration in `app/api/ai/itinerary/route.ts`
- [ ] 2.1 Add mode routing + rate limits/quota checks for import.
- [ ] 2.2 Call URL fetcher + provider extractors + candidate extraction + place resolution.
- [ ] 2.3 Persist: `ai_itinerary_thread.draft` (ops) and `ai_itinerary_thread.draft_sources` (sources + op mapping).
- [ ] 2.4 Record run telemetry steps (`context`/`import_fetch`/`extract`/`resolve`).

### 3.0 Apply: create attribution rows
- [ ] 3.1 Extend apply loop so each successful `add_place` can create/find `itinerary_source`.
- [ ] 3.2 Insert `itinerary_activity_source` rows linking created `itinerary_activity_id` to the source(s).
- [ ] 3.3 Clear `draft` and `draft_sources` after successful apply (or when user dismisses).

### 4.0 Clarification handling
- [ ] 4.1 If import returns a clarification question, do not update the draft (or update draft in a safe “pending” state).
- [ ] 4.2 Ensure the assistant message clearly instructs the user how to respond (pick 1/2/3 or paste Google Maps link).
