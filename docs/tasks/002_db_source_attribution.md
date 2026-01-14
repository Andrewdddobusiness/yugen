# 002 - DB: Persist link sources + activity attribution + import draft metadata

## Summary
Add database structures to persist link sources used for imports and attach those sources to created `itinerary_activity` rows so the UI can show “Came from” with a link back (and embed metadata). Also persist import-draft metadata alongside the existing AI itinerary thread draft operations.

## Proposed schema (MVP)
### `itinerary_source` (one row per unique canonical URL per itinerary)
- `itinerary_source_id` (uuid PK)
- `itinerary_id` (int, FK)
- `itinerary_destination_id` (int, FK, nullable) - context of import
- `provider` (text) - `youtube|tiktok|instagram|tripadvisor|web`
- `url` (text) - original
- `canonical_url` (text) - normalized/deduped
- `external_id` (text, nullable) - e.g., YouTube video id
- `title` (text, nullable)
- `thumbnail_url` (text, nullable)
- `embed_url` (text, nullable) - allowlisted iframe URL to render
- `raw_metadata` (jsonb) - oEmbed/OG/JSON-LD snapshot (sanitized)
- `created_by` (uuid, nullable), timestamps
- Unique: `(itinerary_id, canonical_url)`

### `itinerary_activity_source` (many-to-many)
- `itinerary_activity_source_id` (bigserial PK)
- `itinerary_activity_id` (int, FK)
- `itinerary_source_id` (uuid, FK)
- `snippet` (text, nullable) - evidence text used to pick place
- `timestamp_seconds` (int, nullable) - for video moments (optional)
- `created_at` timestamp
- Unique: `(itinerary_activity_id, itinerary_source_id)`

### Import draft metadata
Keep `ai_itinerary_thread.draft` as the operations array, and add:
- `ai_itinerary_thread.draft_sources` (jsonb) - source previews + op->source mapping for restoring the draft UI after refresh.

## Acceptance criteria
- [ ] Source tables exist with indexes + RLS aligned with itinerary collaboration.
- [ ] Draft import metadata survives refresh (stored in `ai_itinerary_thread.draft_sources`).
- [ ] On apply, activities can be linked to one or more sources via `itinerary_activity_source`.

## Tasks
### 1.0 Migrations: source persistence
- [x] 1.1 Create migration for `public.itinerary_source` table + indexes + updated_at trigger.
- [x] 1.2 Create migration for `public.itinerary_activity_source` join table + indexes.
- [x] 1.3 Add `ai_itinerary_thread.draft_sources jsonb` migration.

### 2.0 RLS policies
- [x] 2.1 Enable RLS on `itinerary_source` and `itinerary_activity_source`.
- [x] 2.2 `SELECT`: allow itinerary owners, public itineraries, and collaborators.
- [x] 2.3 `INSERT/UPDATE/DELETE`: allow itinerary owners and editors only.

### 3.0 Telemetry compatibility
- [ ] 3.1 Update `ai_itinerary_run.mode` constraint to allow `import` (if a new import mode is introduced).
