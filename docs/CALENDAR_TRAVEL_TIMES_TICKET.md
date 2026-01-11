# Ticket: Calendar Travel Times (Commute Overlay)

## Summary
Planning an itinerary is hard when you can’t quickly see how long it takes to get from one activity to the next. We already compute routes/travel times in the Map panel; this ticket brings that information into the **Calendar** as a lightweight, togglable “commute layer” between scheduled activities.

## Problem
Users can schedule activities back-to-back without realizing the commute time needed between them. This creates hidden conflicts and makes itinerary planning feel brittle. The Map view contains travel-time primitives, but users need feedback **where they schedule** (calendar).

## Goals (MVP)
- Add a **Calendar toggle** to show/hide travel-time overlays (Day / 3-day / Week views).
- For each day, display **commute blocks** between consecutive scheduled activities:
  - Show duration (and optionally distance) and travel mode icon.
  - Color-code conflicts (fits / tight / conflict).
- Provide a click interaction:
  - Open a small popover with details (from → to, duration, distance).
  - Allow changing travel mode for that leg (persist to `travel_mode_to_next`).
- Use **real travel times** via Google Routes API (with caching and fallbacks).

## Non-goals (MVP)
- Full route optimization across days (TSP-style reordering).
- Dragging commute blocks to arbitrarily “move around” the schedule without explicit actions.
- Multi-modal/time-dependent transit planning (e.g., exact departure-time GTFS accuracy).
- Handling unscheduled/no-time activities beyond “ignored in commute overlay”.

## UX / Interaction Spec
### Toggle placement
- Add `Travel times` toggle in the calendar top bar (next to `Cities`).

### When enabled
- **Day / 3-day / Week**: show commute blocks between consecutive scheduled activities for each visible day column.
- **Month**: hidden (optional future: small per-day summary).

### Commute block visuals
- Compact “shadow card” between activities, positioned at the gap (starts at `from.end_time`).
- Content:
  - mode icon (drive/walk/transit)
  - duration (e.g. `18m`)
  - optional: distance (e.g. `3.1 km`) in popover only
- States:
  - neutral: commute + buffer comfortably fits the available gap
  - warning: commute fits but gap is tight (e.g. >80% of gap)
  - conflict: commute + buffer exceeds available gap

### Popover actions
- Change travel mode for the segment (writes to `travel_mode_to_next` on the “from” activity).
- If conflict: show an explicit warning + a safe action:
  - “Shift next activity by +X minutes” (X = requiredTime - availableTime, rounded to 5/10 minutes).

## Data / Inputs
- Scheduled activities in the current view (date + start_time + end_time).
- Coordinates for activities (stored as `[lng, lat]` in `activity.coordinates`).
- Per-leg travel mode preference stored on the “from” itinerary activity:
  - `itinerary_activity.travel_mode_to_next` (`driving|walking|transit|bicycling`).

## Architecture (client + server)
### 1) Segment builder (client)
For each visible day:
- Filter to scheduled activities with coordinates.
- Sort by `start_time`.
- Build segments for each adjacent pair:
  - origin/destination coordinates
  - preferred mode = `from.travel_mode_to_next ?? defaultMode`
  - segment key = `${fromId}->${toId}:${mode}:${roundedCoords}`

### 2) Travel time fetch (server action)
Use existing:
- `actions/google/travelTime.ts`
  - `calculateTravelTime` (per segment, cached)
  - or `calculateBatchTravelTimes` (preferred for UX; can reduce round-trips)

Notes:
- Cache should remain in place (24h) and keys should be stable by rounding coordinates.
- If Routes API is disabled/missing keys: degrade gracefully (show “unknown” duration or hide blocks, no scary key errors).

### 3) Calendar rendering (client)
- Add a new overlay layer in the Day column (similar to `CustomEventBlock` rendering, but non-draggable for MVP).
- Render commute blocks only when the toggle is enabled.
- Ensure the commute overlay does not interfere with drag/drop (pointer events on block itself only).

### 4) Updates / actions
- Changing travel mode updates `travel_mode_to_next` via existing itinerary activity update primitives.
- “Shift next activity” uses existing scheduling actions to adjust `start_time` / `end_time` (and optionally prompt to shift subsequent items in that day in a future phase).

## Performance / Cost Guardrails
- Only compute/fetch commute times when the toggle is enabled.
- Limit segment count per render (e.g., visible-day segments only; cap to N per day if needed).
- Use batching when possible and reuse cached results aggressively.
- Consider loading states:
  - show skeleton/placeholder inside commute blocks while fetching.

## Acceptance Criteria
- When enabled, commute blocks appear between scheduled activities in Day/3-day/Week views.
- Commute duration uses Routes API when available and is cached (repeat loads do not spam API).
- Conflict state is visually obvious and consistent with available gap.
- Popover allows changing travel mode and the Map route/travel-time UI stays consistent.
- If Routes API is unavailable, the UI degrades gracefully (no key/secret exposure, no hard crashes).

## Implementation Checklist
1) Add calendar view-state: `showTravelTimes` (persist like `showCityLabels`).
2) Build a day-segment selector/hook for visible calendar days.
3) Add a travel-time client cache (keyed by segment key) + fetcher using server actions (batched).
4) Add a `CommuteBlock` component + popover.
5) Wire “set travel mode” action to update `travel_mode_to_next`.
6) Add “Shift next activity” action for conflicts (MVP = shift only next activity).
7) Tests:
   - segment ordering
   - conflict classification
   - toggle renders/hides overlay

## Open Questions
- Default travel mode: `driving` or `walking`?
- Default buffer minutes (e.g. 10m) and should it be configurable?
- Month view behavior: hide entirely or show a per-day summary?
- Should “Shift next activity” also shift all later activities that day (chain push) in v1 or v2?

## References (Current Code)
- Map travel times + per-leg travel mode UI:
  - `components/map/ItineraryMap.tsx`
- Routes API / caching:
  - `actions/google/travelTime.ts`
- Calendar view components:
  - `components/view/calendar/CalendarControls.tsx`
  - `components/view/calendar/DayColumn.tsx`
  - `store/itineraryLayoutStore.ts`
