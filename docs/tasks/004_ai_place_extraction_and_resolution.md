# 004 — AI: Extract place candidates from source text + resolve to Google Places (cap 15)

## Summary
Given a set of extracted source text bundles + destination context, use the LLM to produce up to **15** concrete place candidates and then deterministically resolve them to Google Places (`placeId`) using existing Google actions. Output draft `add_place` ops that default to **unscheduled**.

## Acceptance criteria
- [x] Returns ≤15 resolved `add_place` operations (unscheduled) when possible.
- [x] When ambiguous/unresolved, asks a clear clarification question (and does not apply anything).
- [x] Uses existing `searchPlacesByText` flows and destination location bias.

## Tasks
### 1.0 Candidate extraction schema + prompt
- [x] 1.1 Define `Candidate` Zod schema (`query`, `evidence`, `confidence`, `sourceCanonicalUrl`).
- [x] 1.2 Implement `extractPlaceCandidatesFromSources()` using `openaiChatJSON` with strict JSON output.
- [x] 1.3 Enforce hard cap of 15 candidates and minimum quality via prompt + schema (+ confidence filtering).

### 2.0 Deterministic place resolution
- [x] 2.1 For each candidate, call `searchPlacesByText(query, cityCoords, radius)` and score matches.
- [x] 2.2 If a single clear match, set `placeId` + `name` in operation.
- [x] 2.3 If ambiguous, generate clarification options (top 3) and ask a question.
- [x] 2.4 If none found, ask user for a Google Maps link or a more specific name.

### 3.0 Build draft operations (unscheduled)
- [x] 3.1 Convert resolved candidates → `add_place` operations with `date: null` and no times.
- [x] 3.2 Attach mapping needed for attribution (candidate→source canonical URL + evidence snippet).
