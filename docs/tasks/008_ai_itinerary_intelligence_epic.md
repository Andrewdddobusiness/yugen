# Ticket: 008 AI Itinerary Intelligence Epic

**Priority**: High  
**Complexity**: High (multi-system planner + validator + UX)  
**Estimated Hours**: 40–80 hours  
**Dependencies**: None  
**Status**: Draft

## 0. Executive Summary (Why This Exists)
The itinerary assistant can safely edit itineraries today (plan → preview → apply), but it still behaves like a “command executor” rather than an itinerary planner. Users want the assistant to understand what makes a *good* day plan: keeping nearby places together, accounting for travel time, scheduling within opening hours, and matching the user’s preferences (pace, interests, travel mode).

After this epic ships, the assistant should propose itineraries that are **feasible** (travel-time + hours), **coherent** (geographic clustering + day themes), and **flexible** (backup options), while staying safe and explainable through previews and confirmations.

## 1. Goals (What Must Be True After This Ships)
- AI-generated schedules avoid obvious travel-time conflicts (or warn + propose fixes).
- AI scheduling respects opening hours when known (and labels “unknown hours” when not).
- AI proposals adapt to user preferences (explicit + inferred) and can plan themed days (shopping/sights/food).
- AI can add flexibility by proposing alternatives in the same time window (slot options).
- UX remains safe: previews + confirmation; partial apply for large plans.

## 2. Non-Goals (Guardrails)
- Full “best possible” global optimization (TSP-style) across many days/destinations in v1.
- Budget/cost optimization (defer until the core feasibility + preference loop is solid).
- Automatic destructive or large changes without confirmation.

## 3. Background / Current Behavior (Optional)
- Today, the assistant can add/remove/update activities and destinations, but it does not systematically validate feasibility (travel time, opening hours) before suggesting schedules.
- Preferences and “day intent” (shopping day vs sightseeing day) are not modeled explicitly.
- The data model already supports:
  - activity coordinates
  - opening hours
  - travel mode per leg (`travel_mode_to_next`)
  - alternatives slots (`itinerary_slot`, `itinerary_slot_option`)

## 4. Core Concepts (Optional)
```rust
// Conceptual model (not code)
struct IntelligenceSignals {
  travel_time_conflicts: Vec<Conflict>,
  open_hours_warnings: Vec<HoursWarning>,
  geo_clusters: Vec<Cluster>,
  inferred_preferences: Preferences,
}
```

## 5. Data / Prompt / API Contracts (Optional but Recommended)
- Continue using strict operation schemas (`yugen/yugen/lib/ai/itinerary/schema.ts`).
- Add “advisory” metadata returned from planning (warnings + confidence) to support explainable previews.
- Keep deterministic validation in server code; prompts propose, code verifies.

## 6. Task Breakdown (Numbered, Checkbox-Driven)

### 1. Ship travel-time aware planning (Ticket 009)

**Estimated**: 8–16 hours

- [ ] Implement deterministic travel-time validation and conflict surfacing
  - [ ] Compute adjacency segments for the resulting day schedule (in-memory plan)
  - [ ] Enforce buffer minutes + conflict threshold rules
  - [ ] Provide safe resolutions (shift/reorder/mode prompt)

**Files:**  
`yugen/yugen/docs/tasks/009_ai_travel_time_aware_day_planning.md:1`

### 2. Ship opening-hours aware scheduling (Ticket 010)

**Estimated**: 6–14 hours

- [ ] Implement deterministic opening-hours validation and warnings
  - [ ] `isOpen` utility for intervals
  - [ ] Resolve violations via safe auto-shifts or clarifying questions

**Files:**  
`yugen/yugen/docs/tasks/010_ai_open_hours_aware_scheduling.md:1`

### 3. Ship preferences + themed day planning (Ticket 011)

**Estimated**: 10–20 hours

- [ ] Add preference schema + inference
  - [ ] Store + read user preferences safely
  - [ ] Infer pace defaults from existing schedules
  - [ ] Theme-aware planning inputs (shopping/sights/food/mixed)

**Files:**  
`yugen/yugen/docs/tasks/011_ai_preferences_and_day_themes.md:1`

### 4. Ship flexibility via alternatives slots (Ticket 012)

**Estimated**: 8–16 hours

- [ ] Add AI operation + execution path for alternatives
  - [ ] Extend schema + preview UI
  - [ ] Execute via `addActivitiesAsAlternatives`

**Files:**  
`yugen/yugen/docs/tasks/012_ai_flexible_slots_and_alternatives.md:1`

### 5. Ship day-plan curation mode (Ticket 013)

**Estimated**: 16–40 hours

- [ ] Add a “curate” mode to schedule an unscheduled backlog into a coherent plan
  - [ ] Build compact planning context + deterministic validation loop
  - [ ] Support partial apply (day-by-day)

**Files:**  
`yugen/yugen/docs/tasks/013_ai_day_plan_curation_mode.md:1`

## 7. Acceptance Criteria (Strict)
- [ ] AI plans do not produce new obvious travel-time conflicts without warnings/fixes.
- [ ] AI plans do not schedule activities outside known opening windows without warnings/fixes.
- [ ] AI plans reflect user preferences (pace + theme) in a user-observable way.
- [ ] AI can create alternatives slots for flexibility (where supported by migrations).
- [ ] Preview + confirmation remains the default for destructive/large changes.

## 8. Testing Requirements
- [ ] Unit tests:
  - [ ] Travel-time conflict classification (gap vs duration+buffer)
  - [ ] Opening-hours interval overlap logic
  - [ ] Preference inference heuristics
- [ ] Integration tests:
  - [ ] AI plan → apply updates itinerary and refreshes builder UI
- [ ] Manual QA checklist:
  - [ ] “Packed day” vs “Relaxed day” shows different schedules
  - [ ] Schedule a place outside hours triggers warning + suggested shift
  - [ ] Back-to-back far places trigger travel warning + resolution

## 9. Rollout / Migration Notes (Optional)
- [ ] Consider a feature flag for “intelligence warnings” if we want staged rollout.
- [ ] Ensure slots-related features are gated if migrations are missing (already handled in server action).

## 10. Risks / Open Questions
- Routes API availability/cost and latency (mitigate with caching + compute only needed segments).
- Opening hours data freshness (mitigate by treating as advisory + “unknown hours” state).
- Timezone consistency for hours checks (destination vs user timezone).

## 11. Implementation Notes (Fill In As You Land Changes)
- <Key decision>

**Key files touched:**  
`yugen/yugen/app/api/ai/itinerary/route.ts`  
`yugen/yugen/actions/google/travelTime.ts`  
`yugen/yugen/actions/supabase/builderBootstrap.ts`

## Related Tickets
- 009: Travel-time aware day planning + conflict avoidance
- 010: Opening-hours aware scheduling + validation
- 011: Preferences + day themes (pace, interests, constraints)
- 012: Flexible slots + alternatives (fallback options)
- 013: Day-plan curation mode (unscheduled backlog → coherent plan)
