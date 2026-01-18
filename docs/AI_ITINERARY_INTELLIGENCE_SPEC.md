# AI Itinerary Intelligence Spec (vNext)

## 0) Executive Summary
We already have an AI-powered itinerary assistant that can safely **plan → preview → apply** itinerary edits using strict operation schemas and deterministic execution. The next step is to make the assistant **itinerary-aware**, not just edit-aware:

- **Travel-time + geography-aware**: group nearby places into coherent day routes and avoid impossible back-to-back scheduling.
- **Opening-hours aware**: schedule activities when they’re likely open (and warn when hours are unknown).
- **Preference-aware**: build days that match a user’s pace (early/late), interests (shopping vs sights vs food), and desired flexibility.
- **Explainable + safe**: always show a plan preview, highlight tradeoffs/constraints, and require confirmation for destructive/big changes.

This document describes what’s built today, what the AI can do now, and a concrete architecture + ticketed roadmap for “itinerary intelligence”.

---

## 1) Current System Snapshot (What’s Built Today)

### 1.1 Builder UX
- Calendar + table views; builder loads a “bootstrap” payload and hydrates stores.
- Destinations sidebar and per-destination builder context.
- Travel-mode field exists on itinerary activities (`travel_mode_to_next`) and travel-time primitives exist via Google Routes.

Key files:
- `yugen/yugen/app/itinerary/[itineraryId]/[destinationId]/builder/page.tsx`
- `yugen/yugen/actions/supabase/builderBootstrap.ts`
- `yugen/yugen/actions/google/travelTime.ts`

### 1.2 AI Assistant UX
- In-builder assistant panel with:
  - persisted threads per itinerary+destination
  - history restore
  - plan preview (“Draft changes”)
  - confirmation + apply
  - link import mode with sources attribution

Key files:
- `yugen/yugen/components/ai/ItineraryAssistantSheet.tsx`
- `yugen/yugen/app/api/ai/itinerary/route.ts`
- `yugen/yugen/app/api/ai/itinerary/threads/route.ts`

### 1.3 AI Orchestrator (Plan → Resolve → Preview → Apply)
The orchestrator is already deterministic where it matters:
- **Planner**: LLM proposes operations in a strict schema
- **Resolver**: validates + resolves ambiguous ops (e.g., place lookup)
- **Preview**: human-readable change list; confirmation gates destructive/big changes
- **Apply**: sequential execution against server actions + refresh bootstrap

Key file:
- `yugen/yugen/app/api/ai/itinerary/route.ts`

### 1.4 Current Operation Primitives (What the AI Can Execute)
Defined in `yugen/yugen/lib/ai/itinerary/schema.ts`:
- `update_activity` (date/time/notes)
- `remove_activity`
- `add_place` (resolved `placeId` + optional schedule)
- `add_destination`
- `insert_destination_after`
- `update_destination_dates`
- `remove_destination`

Execution primitives:
- Place add + upsert: `yugen/yugen/actions/supabase/activities.ts` (`addPlaceToItinerary`)
- Alternatives “slots”: `yugen/yugen/actions/supabase/slots.ts` (`addActivitiesAsAlternatives`)

### 1.5 Data Model Capabilities Relevant to Intelligence
Already present:
- Coordinates on activities (stored in DB; normalized in bootstrap)
- Opening hours in `open_hours` table (joined into “place details” flows)
- Per-leg travel mode preference on itinerary activities (`travel_mode_to_next`)
- Slot + slot options to support “alternatives” at the same time window

Key references:
- `yugen/yugen/types/database.ts`
- `yugen/yugen/actions/supabase/places.ts`
- `yugen/yugen/actions/supabase/slots.ts`

---

## 2) Current Limitations (Why Users Still Feel “Dumb AI”)
Today, the assistant can execute edits, but it doesn’t consistently optimize for:

### 2.1 Geography + Travel Time
- Plans can schedule places far apart back-to-back without accounting for commute time.
- No concept of “keep nearby activities together” when curating a day.

### 2.2 Opening Hours / Closed Days
- The system stores opening hours, but the AI planner does not reliably use them to choose time windows.
- No systematic “this is likely closed at that time” warning.

### 2.3 Preferences + Day Theme / Intent
- User intent like “shopping day”, “museum day”, “relaxed pace” is not modeled as a first-class concept.
- The assistant doesn’t infer pace from existing schedules (early riser vs sleep-in).

### 2.4 Flexibility / Alternatives
- We have DB primitives (`itinerary_slot`, `itinerary_slot_option`) but the assistant doesn’t propose alternatives to hedge closures/crowds.

### 2.5 Explainability for “Why this schedule?”
- The assistant preview shows what changes, but not *why* (travel-time tradeoffs, open hours, clustering).

---

## 3) Target Capabilities (What “Great Itinerary Intelligence” Looks Like)

### 3.1 Day Curation
Given a day (or range of days) + a set of activities (scheduled + unscheduled), the assistant can:
- propose a coherent sequence that minimizes backtracking
- insert buffers + snack/meal anchors
- schedule within opening windows where possible
- surface conflicts (travel time, hours) and propose fixes

### 3.2 Preference-Aware Planning
Given user/profile preferences and itinerary context:
- align day start/end and density (activities/day) to the user’s pace
- respect themes: shopping vs sights vs food vs “mixed”
- adapt travel mode defaults (walk vs drive vs transit)

### 3.3 Flexibility via Alternatives
For key activities or time windows:
- propose 1–3 nearby alternatives (same time window) using slots
- keep the itinerary executable even if something is closed/full

### 3.4 Safety + Control
- never silently reorder or remove large parts of the itinerary
- always preview + confirm
- allow “apply only day X” or “apply only these 3 changes”

---

## 4) Proposed Architecture (Keep Deterministic Execution, Add Intelligence)

### 4.1 Add an “Intelligence Context Builder” (server)
Extend the planner context with computed signals:
- day-by-day schedule summaries
- activity geo clusters (coarse) + distances
- open-hours availability summaries (per activity/day)
- travel-time estimates between adjacent scheduled activities (when toggle exists)

Output should be lightweight (no massive matrices by default).

### 4.2 Add a Deterministic “Schedule Validator + Optimizer”
Before preview/apply:
- validate proposed schedule against:
  - time format + ordering
  - destination date bounds
  - opening hours (if known)
  - travel time feasibility + buffer
- if invalid:
  - auto-adjust within safe rules *or*
  - ask clarifying questions (preferred if ambiguity is high)

This keeps the model from “hallucinating” feasible schedules.

### 4.3 Travel Time Integration Strategy
Use the existing Google Routes primitives (`actions/google/travelTime.ts`):
- start with **local** checks: only compute travel times for segments the AI is actually placing next to each other
- add batching where possible (per day segments)
- cache aggressively; degrade gracefully if Routes API is unavailable

### 4.4 Opening Hours Integration Strategy
We already have `open_hours` data:
- add a deterministic helper: `isOpen(activity, dayOfWeek, timeRange)` with conservative behavior:
  - if hours unknown: treat as “unknown”, don’t block but warn
  - if multiple periods/day: allow if any period overlaps the scheduled window
- surface violations as warnings and/or auto-shift within the day when possible

### 4.5 Preferences + Day Themes
Add a compact preference model:
- explicit: user chooses (pace, preferred start time, interests, travel mode)
- implicit: infer from existing itinerary (earliest start, density, meal timing)
- planner uses the model to choose “good defaults”

### 4.6 Alternatives via Slots
Leverage `itinerary_slot` + `itinerary_slot_option`:
- AI can propose: “Slot 14:00–15:00, choose *Pantheon* OR *Borghese Gallery* OR *Capitoline Museums*”
- Execution uses `addActivitiesAsAlternatives`
- UI shows alternatives as “Options” within the same window

---

## 5) Roadmap (Phased Delivery)

### Phase 1 — Travel-time aware scheduling (low-risk, high value)
- Detect travel-time conflicts for adjacent scheduled activities.
- When planning changes, avoid creating back-to-back segments that can’t fit.
- Provide “shift next activity by +X minutes” suggestions.

### Phase 2 — Opening-hours aware scheduling
- Add open-hours validation for scheduling proposals.
- Auto-shift within a day when hours are violated (when safe).

### Phase 3 — Preferences + Themes
- Add a preference schema (explicit + inferred).
- Add “day theme” planning for a destination (shopping/sights/food/mixed).

### Phase 4 — Flexibility via Alternatives
- Allow the assistant to propose alternatives using slot primitives.

### Phase 5 — Multi-day curation + route optimization
- Assist with unscheduled backlog: “Place these 15 activities across my 4 days in Rome”
- Use clustering + travel time + open hours to build day plans.

---

## 6) UX Principles for Intelligence Features
- “Loading” should be a skeleton and input disabled until context is ready.
- Plans should be explainable: show travel-time segments and open-hours confidence.
- Always allow partial apply (“apply day 1 only”).

---

## 7) Telemetry / Evaluation (So We Know It’s Better)
Proposed metrics (non-exhaustive):
- % of schedules with travel-time conflicts (before vs after)
- % of schedules violating known open-hours
- median AI plan time (p50/p95)
- user acceptance rate of suggested plans
- “undo” / “revert” rate (if implemented)

---

## 8) Related Docs / Tickets
- Existing AI orchestrator spec: `yugen/yugen/docs/AI_ITINERARY_ASSISTANT_TICKET.md`
- Calendar travel times overlay: `yugen/yugen/docs/CALENDAR_TRAVEL_TIMES_TICKET.md`
- AI place extraction + resolution: `yugen/yugen/docs/tasks/004_ai_place_extraction_and_resolution.md`
- Slot alternatives primitive: `yugen/yugen/actions/supabase/slots.ts`

---

## 9) Ticket Backlog (Actionable Next Steps)
See:
- `yugen/yugen/docs/tasks/008_ai_itinerary_intelligence_epic.md`

