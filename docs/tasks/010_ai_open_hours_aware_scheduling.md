# Ticket: 010 Opening-hours Aware Scheduling + Validation

**Priority**: High  
**Complexity**: Medium (hours utilities + validator + UX warnings)  
**Estimated Hours**: 6–14 hours  
**Dependencies**: 008  
**Status**: Draft

## 0. Executive Summary (Why This Exists)
Users expect an itinerary to be practical: if an activity is scheduled at a time it’s likely closed, the itinerary feels broken. We already store opening hours (`open_hours`) but the AI assistant does not systematically use them when proposing schedules.

After this ticket ships, the assistant will validate proposed schedules against known opening hours, auto-adjust when safe, and clearly warn when hours are unknown or violated.

## 1. Goals (What Must Be True After This Ships)
- AI scheduling proposals respect known opening hours (or warn + suggest fixes).
- Unknown opening hours are treated as “advisory unknown”, not a hard block.
- Plan previews show “hours warnings” in a user-understandable way.
- The system remains safe: changes are previewed and confirmed as today.

## 2. Non-Goals (Guardrails)
- Perfect, always-up-to-date hours (seasonality and last-minute changes exist).
- Blocking scheduling entirely when hours are missing.
- Automatically rescheduling an entire day without user confirmation.

## 3. Background / Current Behavior (Optional)
We already have the data:
- `open_hours` table: `yugen/yugen/types/database.ts`
- Places details join hours: `yugen/yugen/actions/supabase/places.ts`
- Google Places details can include `regularOpeningHours`: `yugen/yugen/actions/google/actions.ts`

But the AI planner does not reliably check hours when placing times.

## 4. Core Concepts (Optional)
```rust
// Conceptual model (not code)
struct OpenInterval {
  day_of_week: i32,     // 0-6
  open_min: i32,        // minutes from 00:00
  close_min: i32,       // minutes from 00:00 (may wrap overnight)
}
```

## 5. Data / Prompt / API Contracts (Optional but Recommended)
- Continue using strict operation schemas (`yugen/yugen/lib/ai/itinerary/schema.ts`).
- Add optional “hours warnings” metadata to plan responses:
  - affected itinerary_activity_ids and a reason (`unknown_hours | likely_closed | ambiguous`)
- Hours checking should be deterministic and conservative:
  - if hours unknown → “unknown”, do not block
  - if hours present but schedule violates → warn or shift within the day when unambiguous

## 6. Task Breakdown (Numbered, Checkbox-Driven)

### 1. Deterministic “isOpen” utility

**Estimated**: 2–4 hours

- [x] Implement `getOpenIntervals(open_hours, date)` → normalized intervals
  - [x] Support multiple intervals per day
  - [x] Handle missing minute/hour fields conservatively
- [x] Implement `isOpenForWindow(intervals, startTime, endTime)`
  - [x] Support overnight hours (close < open)

**Files:**  
`yugen/yugen/types/database.ts`  
`yugen/yugen/lib/ai/itinerary/*` (new helper)  
`yugen/yugen/app/api/ai/itinerary/route.ts`

### 2. Integrate hours validation into AI plan resolver

**Estimated**: 3–6 hours

- [x] Validate proposed schedules for `update_activity` and `add_place`
  - [x] Only validate when both date and time are present (or when time changes are requested)
- [x] Define safe correction rules
  - [x] Auto-shift to nearest valid interval (same day) when unambiguous
  - [ ] Otherwise ask: “This seems closed at 9am — should I schedule it after 10am?”
- [x] Persist “hours warnings” metadata for preview UI

**Files:**  
`yugen/yugen/app/api/ai/itinerary/route.ts`  
`yugen/yugen/lib/ai/itinerary/schema.ts`

### 3. Keep hours data fresh (optional)

**Estimated**: 1–4 hours

- [x] Ensure open hours are persisted when adding a new place (if Google returns hours)
- [ ] Consider a lightweight refresh strategy for popular activities (defer if too big)

**Files:**  
`yugen/yugen/actions/google/actions.ts`  
`yugen/yugen/actions/supabase/activities.ts`

## 7. Acceptance Criteria (Strict)
- [x] If an activity has known hours, the AI does not schedule it entirely outside an open interval without warning or a safe shift.
- [x] If hours are unknown, the plan explicitly marks it as “unknown hours” (no hard failure).
- [x] Preview UI can display an hours warning for affected draft changes.

## 8. Testing Requirements
- [ ] Unit tests:
  - [x] Interval normalization (multi-interval, overnight)
  - [x] Overlap check for time windows
- [ ] Integration tests:
  - [ ] Plan with “closed” time returns warning + suggested shift
- [ ] Manual QA checklist:
  - [ ] Schedule a museum at 2am → warning + suggestion
  - [ ] Schedule an activity with no hours → “unknown hours” label

## 9. Rollout / Migration Notes (Optional)
- [ ] No schema migrations required (uses existing `open_hours`).
- [ ] Consider feature flag for “hours-aware planning” if needed.

## 10. Risks / Open Questions
- Hours can be wrong/seasonal; treat as advisory.
- Timezone source of truth for hours checks (destination vs user timezone).

## 11. Implementation Notes (Fill In As You Land Changes)
- <Key decision>

**Key files touched:**  
`yugen/yugen/app/api/ai/itinerary/route.ts`  
`yugen/yugen/actions/google/actions.ts`

## Related Tickets
- 008: AI Itinerary Intelligence Epic
- 009: Travel-time aware day planning + conflict avoidance
- 011: Preferences + day themes (pace, interests, constraints)
