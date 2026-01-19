# Ticket: 012 Flexible Slots + Alternatives (fallback options)

**Priority**: Medium  
**Complexity**: Medium (new AI op + slot primitives + UI)  
**Estimated Hours**: 8–16 hours  
**Dependencies**: 008  
**Status**: Draft

## 0. Executive Summary (Why This Exists)
Users want itineraries to be resilient: if a place is closed or a line is too long, they want a ready-made alternative that still fits the schedule and location. Today, the assistant can add/schedule items, but it cannot attach fallback options to a time window in a first-class way.

After this ticket ships, the assistant can propose 2–3 alternatives for a scheduled slot, store them using the existing slot primitives, and display them in the UI so the user can quickly pick a backup without re-planning the entire day.

## 1. Goals (What Must Be True After This Ships)
- The assistant can propose alternatives for a scheduled activity/time window (max 3).
- Alternatives are persisted using slot primitives and rendered in the UI as “Options”.
- Alternatives are geographically sensible (nearby) and respect opening hours when known.
- The preview/apply flow stays safe: users can review and confirm option creation.

## 2. Non-Goals (Guardrails)
- A full recommendation engine (personalized rankings, long-tail discovery, etc.).
- Infinite or automatically rotating alternatives without explicit user choice.
- Suggesting alternatives across different destinations unless explicitly requested.

## 3. Background / Current Behavior (Optional)
We already have DB primitives for this:
- `itinerary_slot` and `itinerary_slot_option`
- server action: `addActivitiesAsAlternatives` (`yugen/yugen/actions/supabase/slots.ts`)

But the assistant’s operation schema and UI preview do not expose “slot options” as an AI-initiated primitive.

## 4. Core Concepts (Optional)
```rust
// Conceptual model (not code)
struct Slot {
  itinerary_slot_id: String,
  start_time: String,
  end_time: String,
}

struct SlotOption {
  itinerary_slot_option_id: String,
  itinerary_activity_id: String,
  is_primary: bool,
}
```

## 5. Data / Prompt / API Contracts (Optional but Recommended)
- Extend the strict AI operation schema to support a slot-options operation, e.g.:
  - `add_alternatives { target_itinerary_activity_id, alternative_itinerary_activity_ids[] }`
- Execution must be deterministic:
  - enforce `maxAlternatives = 3`
  - verify all alternative candidates belong to the same itinerary + destination
  - reject options that would create obvious hours conflicts when hours are known (use 010 utilities when available)
- Plan preview should include:
  - which slot is being updated
  - option labels (place names), not opaque IDs

## 6. Task Breakdown (Numbered, Checkbox-Driven)

### 1. Add an AI operation + deterministic execution path

**Estimated**: 4–8 hours

- [x] Extend AI operation schema for alternatives slots
  - [x] Add runtime validation + max 3 limit
  - [x] Ensure IDs are itinerary-scoped and destination-scoped
- [x] Implement execution using `addActivitiesAsAlternatives`
  - [x] Preserve existing scheduled item as primary unless user requests otherwise
  - [x] Return stable preview metadata (names + option count)
- [x] Wire into plan preview + apply pipeline
  - [x] Confirm/apply creates slot + options deterministically

**Files:**  
`yugen/yugen/lib/ai/itinerary/schema.ts`  
`yugen/yugen/app/api/ai/itinerary/route.ts`  
`yugen/yugen/actions/supabase/slots.ts`

### 2. Alternative candidate generation (v1)

**Estimated**: 2–5 hours

- [x] Build a small candidate pool
  - [x] Prefer unscheduled activities in the same destination
  - [ ] Optional: allow “find new places” as a later phase (explicitly gated)
- [x] Rank candidates by simple heuristics
  - [x] proximity (coordinates distance)
  - [x] type similarity (theme bucket match)
  - [x] opening-hours overlap when known
- [x] Keep outputs explainable (why each alternative is suggested)

**Files:**  
`yugen/yugen/lib/ai/itinerary/*` (new helper)  
`yugen/yugen/app/api/ai/itinerary/route.ts`

### 3. UI rendering for “slot with options”

**Estimated**: 2–4 hours

- [x] Render options in itinerary UI
  - [x] Indicate “Options (3)” on the slot/activity card
  - [x] Expand to show Option A/B/C
- [x] Add safe UX copy and selection behavior
  - [x] “Pick a backup option for this time window”
  - [x] Ensure option creation is visible in the assistant preview

**Files:**  
`yugen/yugen/components/ai/ItineraryAssistantSheet.tsx`  
`yugen/yugen/components/itinerary/*` (calendar/table cards)

## 7. Acceptance Criteria (Strict)
- [x] The assistant can create a slot with 2–3 alternatives and the UI reflects it immediately after apply.
- [x] Alternatives are presented with place names (not IDs) in preview and in the itinerary UI.
- [x] The system prevents alternatives from other itineraries/destinations from being attached to the slot.
- [x] The assistant never creates more than 3 alternatives for a single slot in v1.

## 8. Testing Requirements
- [x] Unit tests:
  - [x] Candidate ranking respects max 3 and same-destination constraint
  - [x] Schema validation rejects invalid payloads
- [ ] Integration tests:
  - [ ] Plan → apply creates `itinerary_slot` + `itinerary_slot_option` rows and UI re-fetch shows options
- [ ] Manual QA checklist (if relevant):
  - [ ] Ask assistant “give me 2 alternatives for this museum slot” → options appear in UI
  - [ ] Try to attach alternatives from a different destination → operation rejected with clear warning

## 9. Rollout / Migration Notes (Optional)
- [ ] Feature flag: `assistant_intelligence_alternatives`
- [ ] Confirm the slot tables exist in production; gate feature if migrations are missing

## 10. Risks / Open Questions
- Risk: users misunderstand “options” vs “scheduled” → mitigate with clear UI labeling (“Options”).
- Risk: alternatives create clutter on dense days → mitigate with strict cap (max 3) and allow removal.
- Open question: should alternatives inherit the exact time window, or remain unscheduled until chosen?

## 11. Implementation Notes (Fill In As You Land Changes)
- Prefer reusing existing slot primitives and keep the AI operation surface area small.

**Key files touched:**  
`yugen/yugen/actions/supabase/slots.ts`  
`yugen/yugen/app/api/ai/itinerary/route.ts`

## Related Tickets
- 008: AI Itinerary Intelligence Epic
- 011: Preferences + Day Themes (pace, interests, constraints)
- 013: Day-plan Curation Mode (unscheduled backlog → coherent plan)
