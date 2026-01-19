# Ticket: 009 Travel-time Aware Day Planning + Conflict Avoidance

**Priority**: High  
**Complexity**: Medium (deterministic validation + light prompt updates)  
**Estimated Hours**: 8–16 hours  
**Dependencies**: 008  
**Status**: Draft

## 0. Executive Summary (Why This Exists)
Right now, the AI assistant can schedule and reorder activities without consistently accounting for **travel time**. This can create itineraries that look fine in the UI but are not physically feasible (e.g., far-apart attractions scheduled back-to-back with no commute time).

After this ticket ships, the assistant will detect travel-time conflicts during planning, avoid creating new infeasible sequences, and propose safe resolutions (shift/reorder/change mode) with clear preview messaging.

## 1. Goals (What Must Be True After This Ships)
- The assistant detects travel-time conflicts between adjacent scheduled activities when it proposes changes.
- The assistant avoids creating new conflicts silently; it either fixes them or warns and asks for a preference.
- The plan preview communicates travel-time warnings clearly and stays consistent with apply results.
- If Routes API is unavailable, the experience degrades gracefully (no crashes; clear messaging).

## 2. Non-Goals (Guardrails)
- Full global route optimization across a whole trip (TSP-style).
- Chain-shifting an entire day automatically without confirmation (can be a v2).
- Computing travel times for every pair of activities (only compute what’s needed).

## 3. Background / Current Behavior (Optional)
- Travel-time primitives exist via Google Routes:
  - `yugen/yugen/actions/google/travelTime.ts`
- There is a separate UI roadmap for calendar commute overlays:
  - `yugen/yugen/docs/CALENDAR_TRAVEL_TIMES_TICKET.md`
- The AI orchestrator currently validates schema correctness but not itinerary feasibility.

## 4. Core Concepts (Optional)
```rust
// Conceptual model (not code)
struct Segment {
  from_activity_id: String,
  to_activity_id: String,
  day: String,          // YYYY-MM-DD
  available_gap_min: i32,
  travel_time_min: i32,
  buffer_min: i32,
}
```

## 5. Data / Prompt / API Contracts (Optional but Recommended)
- No new “execution” primitives required; this is a validation + planning enhancement.
- Add optional travel-time warnings metadata to plan responses so the UI can show badges.
- Travel-time lookup should use:
  - `calculateTravelTime` in `yugen/yugen/actions/google/travelTime.ts`
  - caching already present in that module

## 6. Task Breakdown (Numbered, Checkbox-Driven)

### 1. Deterministic travel-time segment builder (server)

**Estimated**: 3–6 hours

- [x] Build an “adjacent segments” extractor for a day after applying the proposed operations in-memory
  - [x] Sort scheduled activities by start time within a day
  - [x] Build segments for adjacent pairs and compute available gap
- [x] Add buffer minutes + conflict thresholds
  - [x] Default buffer (e.g., 10m) and a single source of truth for conflict classification

**Files:**  
`yugen/yugen/app/api/ai/itinerary/route.ts`  
`yugen/yugen/actions/google/travelTime.ts`

### 2. Integrate travel-time validation into plan resolver

**Estimated**: 3–6 hours

- [x] After resolving operations, validate resulting day schedules
  - [x] Only compute travel times for segments impacted by the plan (adjacent pairs)
- [x] If conflicts exist, provide safe resolutions
  - [x] Shift next activity by +X minutes (when safe and bounded)
  - [ ] Otherwise: add a clear warning + ask user preference (mode, allow shift, etc.)
- [ ] Add preview metadata for UI highlighting
  - [ ] Include conflict count + affected activities (IDs + labels)

**Files:**  
`yugen/yugen/app/api/ai/itinerary/route.ts`  
`yugen/yugen/lib/ai/itinerary/schema.ts`

### 3. Optional: travel-mode inference + defaults

**Estimated**: 2–4 hours

- [x] Respect `travel_mode_to_next` if set
- [ ] If missing, infer a default mode and only propose persisting mode changes with confirmation

**Files:**  
`yugen/yugen/app/api/ai/itinerary/route.ts`

## 7. Acceptance Criteria (Strict)
- [x] The AI does not create a new adjacent segment where `travel_time + buffer > gap` without warning or a deterministic fix.
- [x] If Routes API is unavailable, planning still works and the UI does not crash (warnings become “travel time unavailable”).
- [x] Applying the plan yields the same end-state shown in preview (no hidden shifts).

## 8. Testing Requirements
- [ ] Unit tests:
  - [x] Segment builder ordering + gap computation
  - [x] Conflict classification (`ok | tight | conflict`)
- [ ] Integration tests:
  - [ ] Plan with a known conflict returns warning + requires confirmation (if needed)
- [ ] Manual QA checklist:
  - [ ] Schedule two far places back-to-back → warning + proposed resolution
  - [ ] Turn off Routes API key → no crash, “unavailable” messaging

## 9. Rollout / Migration Notes (Optional)
- [ ] Consider a feature flag for “travel-aware planning” if we want staged rollout.

## 10. Risks / Open Questions
- Routes API latency and cost (mitigate by computing only adjacency segments + caching).
- Default buffer minutes: 10m vs 15m?
- Shift policy: only next activity (v1) vs chain-shift day (v2).

## 11. Implementation Notes (Fill In As You Land Changes)
- <Key decision>

**Key files touched:**  
`yugen/yugen/app/api/ai/itinerary/route.ts`  
`yugen/yugen/actions/google/travelTime.ts`

## Related Tickets
- 008: AI Itinerary Intelligence Epic
- 010: Opening-hours aware scheduling + validation
- CALENDAR_TRAVEL_TIMES_TICKET: Calendar Travel Times (Commute Overlay)
