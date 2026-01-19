# Ticket: 011 Preferences + Day Themes (pace, interests, constraints)

**Priority**: Medium  
**Complexity**: Medium (preference model + inference + prompt inputs)  
**Estimated Hours**: 10–20 hours  
**Dependencies**: 008  
**Status**: Draft

## 0. Executive Summary (Why This Exists)
Today the assistant can execute itinerary changes, but it doesn’t consistently understand *how* the user wants to travel (packed vs relaxed, early vs late, interests like shopping vs museums). This leads to plans that may be feasible, but feel “wrong” for the user.

After this ticket ships, users can set lightweight preferences (explicitly or implicitly), and the assistant will use them to generate themed day plans (shopping/sights/food) with appropriate pacing and breaks.

## 1. Goals (What Must Be True After This Ships)
- The assistant uses stored preferences when proposing schedules and curation plans.
- If preferences are missing, the assistant infers safe defaults (without writing them) and/or asks a short clarifying question.
- The assistant can plan themed days (e.g., “shopping day”) by clustering suggested activities by type and area.
- Preferences influence scheduling constraints (day start/end, max density, meal/break anchors).

## 2. Non-Goals (Guardrails)
- Building a complex personalization system (long-term learning, embeddings, or behavioral tracking) in v1.
- Overriding user-selected times or bookings automatically to match a theme.
- Hard-blocking plans when preferences are unknown (use defaults + ask when needed).

## 3. Background / Current Behavior (Optional)
- The AI plan resolver has no consistent “preference contract” it can rely on.
- The database already supports a flexible preference payload on profiles:
  - `profiles.preferences` (`yugen/yugen/types/database.ts`)
- Users currently have to correct the assistant repeatedly (“start later”, “less packed”, “focus on shopping”).

## 4. Core Concepts (Optional)
```rust
// Conceptual model (not code)
struct Preferences {
  pace: String,              // relaxed | balanced | packed
  day_start: String,         // "08:30"
  day_end: String,           // "21:00"
  interests: Vec<String>,    // shopping | sights | museums | food | nightlife | nature
  travel_mode: String,       // walking | driving | transit
}

struct DayTheme {
  key: String,               // "shopping" | "sights" | "food" | "mixed"
  rationale: String,
}
```

## 5. Data / Prompt / API Contracts (Optional but Recommended)
- Store preferences under `profiles.preferences.ai_itinerary` (namespaced JSON) to avoid schema churn.
- Add a minimal, versioned shape:
  - `version: 1`
  - `pace`, `day_start`, `day_end`, `interests[]`, `travel_mode`
- Planner input contract:
  - always include `preferences` (explicit, inferred, or defaulted), plus a `preferences_source` enum (`explicit | inferred | default`)
  - include optional `day_theme` when user asks for it (or inferred from the request)
- Keep inference deterministic and non-writing: only the user (or explicit UI action) persists preferences.

## 6. Task Breakdown (Numbered, Checkbox-Driven)

### 1. Preferences schema + storage helpers

**Estimated**: 4–8 hours

- [x] Define the preference payload shape + validation
  - [x] Add a TypeScript type + runtime validation helper
  - [x] Add a stable JSON namespace (e.g., `profiles.preferences.ai_itinerary`)
- [x] Implement read/write helpers
  - [x] Server action to update preferences (explicit user choice)
  - [x] Client hook to fetch + update preferences (optimistic UI optional)

**Files:**  
`yugen/yugen/types/database.ts`  
`yugen/yugen/actions/supabase/profiles.ts` (or new helper)  
`yugen/yugen/components/ai/ItineraryAssistantSheet.tsx`

### 2. Preference inference from existing itineraries (non-writing)

**Estimated**: 3–6 hours

- [x] Implement deterministic inference from itinerary history
  - [x] Infer typical day start/end from scheduled items (median)
  - [x] Infer pacing from average activities/day
  - [x] Infer interests from place types (coarse buckets)
- [ ] Add “ask a clarifying question” rules when confidence is low
  - [ ] Single-question max (“Do you prefer packed or relaxed days?”)
  - [ ] Only ask when it affects a requested plan

**Files:**  
`yugen/yugen/lib/ai/itinerary/*` (new helper)  
`yugen/yugen/app/api/ai/itinerary/route.ts`

### 3. Day theme tagging + prompt inputs

**Estimated**: 3–6 hours

- [x] Add deterministic “theme tags” for activities
  - [x] Map Google place types → theme buckets
  - [x] Prefer simple + explainable mapping
- [x] Update planner prompt/context to include preferences + theme
  - [x] Ensure the LLM only proposes operations; server still validates feasibility
- [x] Add preview explanation copy (“Planned as a shopping-focused day near …”)

**Files:**  
`yugen/yugen/actions/google/actions.ts` (types surface)  
`yugen/yugen/lib/ai/itinerary/*`  
`yugen/yugen/components/ai/ItineraryAssistantSheet.tsx`

## 7. Acceptance Criteria (Strict)
- [x] With explicit preferences set, AI plans reflect day start/end and pacing (fewer items for “relaxed”, more for “packed”).
- [x] Without explicit preferences, AI uses inferred/default preferences and does not write them to the database.
- [x] If the user asks for a themed day (“shopping day”), the plan clusters by relevant activity types and avoids long cross-city hops.
- [x] No breaking changes to existing add/update/delete flows when preferences are absent.

## 8. Testing Requirements
- [ ] Unit tests:
  - [x] Inference: day start/end from scheduled times
  - [x] Inference: pace classification from activity density
  - [x] Theme tagging: types → bucket mapping
- [ ] Integration tests:
  - [ ] `/api/ai/itinerary` includes preferences context and remains schema-valid
- [ ] Manual QA checklist (if relevant):
  - [ ] Set preferences (relaxed + late start) → ask AI to plan a day → verify later times + fewer items
  - [ ] No preferences → ask AI to plan → verify no DB preference update

## 9. Rollout / Migration Notes (Optional)
- [ ] Feature flag: `assistant_intelligence_preferences` (server + UI)
- [ ] Backward compatibility: if `profiles.preferences.ai_itinerary` missing, treat as defaults

## 10. Risks / Open Questions
- Risk: incorrect inference frustrates users → mitigate by keeping inference soft + asking when needed.
- Risk: preferences become a dumping ground → mitigate via namespacing + versioned schema.
- Open question: do we need itinerary-level overrides (per trip) vs profile defaults (global)?

## 11. Implementation Notes (Fill In As You Land Changes)
- Keep preference inference deterministic and non-writing.
- Do not block planning when preferences are missing; default + clarify only when necessary.

**Key files touched:**  
`yugen/yugen/components/ai/ItineraryAssistantSheet.tsx`  
`yugen/yugen/app/api/ai/itinerary/route.ts`

## Related Tickets
- 008: AI Itinerary Intelligence Epic
- 009: Travel-time Aware Day Planning + Conflict Avoidance
- 010: Opening-hours Aware Scheduling + Validation
- 012: Flexible Slots + Alternatives (fallback options)
- 013: Day-plan Curation Mode (unscheduled backlog → coherent plan)
