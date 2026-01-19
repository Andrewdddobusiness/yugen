# Ticket: 013 Day-plan Curation Mode (unscheduled backlog → coherent plan)

**Priority**: High  
**Complexity**: High (new planner mode + validation loop + partial apply UX)  
**Estimated Hours**: 16–40 hours  
**Dependencies**: 008, 009, 010, 011  
**Status**: Draft

## 0. Executive Summary (Why This Exists)
Users don’t just want “edits” to an itinerary — they want help turning a backlog of unscheduled ideas into a coherent plan for a specific day (or day range). Today, the assistant mostly operates in “edit mode” (apply discrete add/update/delete operations). That makes it hard to generate a structured, feasible schedule that reflects travel time, opening hours, and user preferences.

After this ticket ships, the assistant supports a curation mode that can propose a day-by-day schedule from partially unscheduled inputs, show an explainable preview, and allow partial apply (day-by-day) so large plans remain safe.

## 1. Goals (What Must Be True After This Ships)
- Given unscheduled activities for a destination date range, the assistant can propose a day-by-day schedule as draft operations.
- Proposed schedules avoid obvious travel-time conflicts and respect opening hours when known (or warn clearly).
- The plan preview is explainable (rationale per day/cluster) and can be applied partially.
- The system remains safe with operation caps and confirmation before execution.

## 2. Non-Goals (Guardrails)
- Full global optimization across many days/destinations (TSP-style) in v1.
- Automatically scheduling booked/fixed items without treating them as immovable constraints.
- Real-time availability/closing changes (hours are advisory and may be stale).

## 3. Background / Current Behavior (Optional)
- The assistant can add/remove/update activities and destinations through strict operations.
- We already have the inputs needed for basic curation:
  - activity coordinates and types
  - opening hours (`open_hours`)
  - travel time primitives (Google Routes)
  - profile preferences storage (`profiles.preferences`)
- What’s missing is a dedicated “curation mode” contract and a deterministic validation loop to keep multi-step plans feasible.

## 4. Core Concepts (Optional)
```rust
// Conceptual model (not code)
struct CurationRequest {
  itinerary_id: String,
  itinerary_destination_id: String,
  from_date: String,
  to_date: String,
  intent: String,          // e.g. "plan my days", "shopping day", "light pace"
}

struct DayPlan {
  date: String,
  rationale: String,
  operations: Vec<String>, // strict ops: schedule/update
  warnings: Vec<String>,
}
```

## 5. Data / Prompt / API Contracts (Optional but Recommended)
- Add an explicit request mode to `/api/ai/itinerary`, e.g.:
  - `mode: "edit" | "curate"` (default `edit` for backward compatibility)
- Curation responses must remain strict and applyable:
  - a list of operations (existing schema)
  - plus an explainable plan summary per day (UI-only)
  - plus warnings metadata (travel-time + hours) from deterministic validators
- Enforce guardrails:
  - maximum operations per plan (e.g., 25)
  - require confirmation before apply
  - allow partial apply (subset of days)

## 6. Task Breakdown (Numbered, Checkbox-Driven)

### 1. Add a new orchestration mode + schema support

**Estimated**: 4–8 hours

- [ ] Extend `/api/ai/itinerary` to accept `mode: "curate"`
  - [ ] Default to `edit` to avoid breaking existing clients
- [ ] Define strict schema output for curate mode
  - [ ] Day-by-day summary blocks (human-readable)
  - [ ] Operations payload (existing schema) + warnings metadata
- [ ] Add guardrails
  - [ ] Operation cap and clear rejection messaging when exceeded
  - [ ] Confirmation required before apply

**Files:**  
`yugen/yugen/app/api/ai/itinerary/route.ts`  
`yugen/yugen/lib/ai/itinerary/schema.ts`

### 2. Build deterministic planner inputs (context builder)

**Estimated**: 4–8 hours

- [ ] Build a compact planning context for the requested date range
  - [ ] Candidate activities (scheduled + unscheduled) with coords, types, durations
  - [ ] Destination timezone + date range boundaries
  - [ ] Opening hours summaries (when known)
  - [ ] Preferences (explicit + inferred) and optional theme intent
- [ ] Add a travel-time lookup strategy for curation
  - [ ] Compute only needed segments (adjacent candidates in the proposed order)
  - [ ] Cache results and avoid repeated calls

**Files:**  
`yugen/yugen/actions/supabase/builderBootstrap.ts`  
`yugen/yugen/actions/google/travelTime.ts`  
`yugen/yugen/lib/ai/itinerary/*` (new helper)

### 3. Scheduling algorithm (v1) + deterministic validation loop

**Estimated**: 6–16 hours

- [ ] Implement a simple heuristic scheduler (v1)
  - [ ] Cluster by proximity (and optionally by theme bucket)
  - [ ] Order within cluster to minimize travel time
  - [ ] Assign time windows using day start/end + durations
  - [ ] Insert breaks and meal anchors heuristically (bounded)
- [ ] Validate iteratively using deterministic validators
  - [ ] Opening-hours checks (010)
  - [ ] Travel-time conflicts between adjacent scheduled items (009)
  - [ ] Emit warnings when constraints cannot be satisfied

**Files:**  
`yugen/yugen/app/api/ai/itinerary/route.ts`  
`yugen/yugen/lib/ai/itinerary/*`

### 4. Preview UX + partial apply

**Estimated**: 2–8 hours

- [ ] Update assistant UI to render day-plan blocks
  - [ ] Clear “This is a draft plan” copy
  - [ ] Per-day expand/collapse and warnings badges
- [ ] Support partial apply
  - [ ] Apply selected days only (subset of operations)
  - [ ] Ensure UI refresh reflects applied changes reliably

**Files:**  
`yugen/yugen/components/ai/ItineraryAssistantSheet.tsx`  
`yugen/yugen/app/api/ai/itinerary/route.ts`

## 7. Acceptance Criteria (Strict)
- [ ] A curate request produces a day-by-day preview and a valid operations payload.
- [ ] Applying the plan updates the itinerary and the UI reflects the changes without manual refresh.
- [ ] Travel-time and opening-hours conflicts are either avoided or surfaced as warnings before apply.
- [ ] Operation caps prevent runaway plans; the assistant explains how to narrow scope.

## 8. Testing Requirements
- [ ] Unit tests:
  - [ ] Cluster ordering produces stable results for the same input set
  - [ ] Validation loop surfaces travel-time and hours warnings correctly
- [ ] Integration tests:
  - [ ] Curate request → apply → builder UI shows scheduled items on the correct days
- [ ] Manual QA checklist (if relevant):
  - [ ] Create 10 unscheduled activities → ask “plan my day” → verify a coherent schedule
  - [ ] Create a known-closed-hours scenario → verify warning + safe suggestion
  - [ ] Apply only Day 1 → verify Day 2 remains untouched

## 9. Rollout / Migration Notes (Optional)
- [ ] Feature flag: `NEXT_PUBLIC_ASSISTANT_CURATION_MODE`
- [ ] Backward compatibility: default `mode` remains `edit`

## 10. Risks / Open Questions
- Risk: curation plans feel arbitrary → mitigate via explainable rationale and small, stable heuristics.
- Risk: timezones/hours edge cases → mitigate via consistent timezone source (destination vs user) and conservative warnings.
- Risk: travel-time calls add latency/cost → mitigate via caching and “compute only needed segments”.
- Open question: do we need explicit “must-do vs nice-to-have” signals for better curation?

## 11. Implementation Notes (Fill In As You Land Changes)
- Keep deterministic validation as the source of truth; the LLM proposes, code verifies.
- Prefer incremental planning (one day at a time) over multi-day global optimization in v1.

**Key files touched:**  
`yugen/yugen/app/api/ai/itinerary/route.ts`  
`yugen/yugen/components/ai/ItineraryAssistantSheet.tsx`

## Related Tickets
- 008: AI Itinerary Intelligence Epic
- 009: Travel-time Aware Day Planning + Conflict Avoidance
- 010: Opening-hours Aware Scheduling + Validation
- 011: Preferences + Day Themes (pace, interests, constraints)
- 012: Flexible Slots + Alternatives (fallback options)
