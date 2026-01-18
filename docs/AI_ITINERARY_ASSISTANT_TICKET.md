# Ticket: AI Chat Orchestrator for Itinerary Edits

## Summary
We already have UI + server primitives for creating, editing, and scheduling itinerary activities. This ticket proposes an **AI-assisted chat workflow** that turns a user’s natural-language request into a **validated set of operations** (plan → resolve → preview → execute) using those existing primitives, so itinerary editing becomes fast, safe, and consistent.

## Problem
Editing an itinerary is currently a manual sequence of steps (find activity → change day/time → adjust notes/order → repeat). Users often want to express changes in a single sentence (e.g., “Move lunch to Tuesday and push everything else back 30 minutes”), but the product doesn’t yet provide a workflow that can translate that into coordinated modifications.

## Goals (MVP)
- Add an **AI Assistant chat panel** inside the builder that can:
  - Interpret user messages as **structured itinerary edits**
  - **Preview** proposed changes (diff-like)
  - **Apply** changes by calling existing server actions
  - Ask **clarifying questions** when intent is ambiguous
- Support common edit operations on **existing itinerary activities**:
  - schedule/reschedule (date)
  - set/shift times (start/end)
  - edit notes
  - unschedule (set date/time null)
  - remove from itinerary (soft delete)

## Non-goals (MVP)
- “One-shot” full itinerary generation (multi-day planning from scratch)
- Complex preference optimization (budgets, transit constraints, crowds, etc.)
- Automatic destructive changes without confirmation
- Multi-destination orchestration (handle one destinationId context first)

## Key Design Principles
- **Deterministic execution**: the model proposes; code validates and executes.
- **Safe by default**: destructive or large-batch edits require explicit confirmation.
- **Explainable**: preview always shows *exactly* what will change.
- **Composable**: operations map cleanly to existing primitives; easy to extend.

---

## Proposed Architecture (Planner → Resolver → Executor)

### 1) Context Builder (server)
Fetch a minimal itinerary snapshot for the active itinerary/destination:
- Destination info: city/country/date range/timezone
- Activities: `itinerary_activity_id`, `activity_id`, name, address, types, date, start_time, end_time, notes, deleted_at

Suggested source:
- `fetchBuilderBootstrap(itineraryId, destinationId)` (`actions/supabase/builderBootstrap.ts`)

### 2) Planner (LLM)
Input: user message + itinerary snapshot.
Output: `proposed_operations[]` in a strict schema (no DB writes yet).

Planner rules:
- Prefer referencing activities via stable identifiers when possible (`itinerary_activity_id`)
- When referencing by name (“McDonald’s”), include a `target` object that can be resolved (e.g., `target.name = "McDonald's"`).
- Never “execute” directly. Only propose operations.

### 3) Resolver (deterministic code)
Take proposed operations and:
- Resolve activity references to concrete IDs
- Validate constraints:
  - date inside destination range (unless explicitly allowed)
  - start_time < end_time, valid formats
  - max operations threshold
- If ambiguous (multiple matches), return a clarifying prompt:
  - “Which ‘La Nuova Piazzetta’ did you mean? (Mon 2pm vs Tue 12pm)”

### 4) Preview + Confirmation (UI)
Render a readable plan:
- Group by day/activity
- Show before/after for each field change
- Mark destructive ops clearly

Require confirmation for:
- removals/soft deletes
- batch changes over N items (e.g., >10)
- operations that move activities outside the current date range

### 5) Executor (tools)
Apply validated operations using existing primitives, sequentially and safely:
- Stop on first failure (return partial success + error)
- Refresh builder data after apply (or return a patch list)

---

## Operation Schema (MVP)
Suggested operation union (example shape; implement with Zod):

```ts
type Operation =
  | { op: "set_date_times"; itineraryActivityId: string; date: string; startTime: string | null; endTime: string | null }
  | { op: "set_times"; itineraryActivityId: string; startTime: string | null; endTime: string | null }
  | { op: "set_notes"; itineraryActivityId: string; notes: string }
  | { op: "unschedule"; itineraryActivityId: string }
  | { op: "remove"; itineraryActivityId: string };
```

Resolver may also accept a “target form” before IDs are known:

```ts
type TargetRef =
  | { kind: "itinerary_activity_id"; value: string }
  | { kind: "name"; value: string }
  | { kind: "place_id"; value: string };
```

---

## Tooling / Existing Primitives to Orchestrate

### Read
- Builder snapshot: `fetchBuilderBootstrap(itineraryId, destinationId)`

### Write (existing server actions)
- Set date + times: `setItineraryActivityDateTimes`
- Set times only: `setItineraryActivityTimes`
- Set notes: `setItineraryActivityNotes`
- Batch updates: `batchUpdateItineraryActivities` (when safe)
- Soft delete + unschedule: `softDeleteTableData2` (or a dedicated helper)

Files:
- `actions/supabase/actions.ts`
- `actions/supabase/builderBootstrap.ts`

### Phase 2 (optional): Add new places by natural language
Currently, “add to itinerary” logic largely lives in client store code:
- `store/itineraryActivityStore.ts` (insert activity, then insert itinerary_activity)

Recommendation:
- Extract a server-side equivalent action (e.g., `addPlaceToItinerary(itineraryId, destinationId, placeId)`),
  so the orchestrator does not rely on client-only store logic.

---

## UI/UX Spec (MVP)
- Chat panel in builder with:
  - input box + submit
  - messages list
  - “Preview changes” card (operations list)
  - `Confirm` / `Cancel` controls when confirmation is required
- After apply:
  - refresh builder state so calendar/table/map update immediately
  - show a completion message + summary

Nice-to-have:
- Highlight affected days in calendar and affected activities in table/list when hovering the preview items.

---

## Safety / Guardrails
- Never apply destructive ops without confirmation.
- Enforce max ops per request (e.g., 25) unless explicitly confirmed.
- Validate time parsing and date range before execution.
- Always return a clear error if the plan cannot be resolved safely.

Audit/logging (MVP-light):
- Log orchestrator request + resolved operations + execution results (console or a DB table).

Future: undo support
- Store inverse-ops (or snapshot) to allow “Undo last AI change.”

---

## Acceptance Criteria
- User can type: “Move McDonald’s to Tuesday at 7pm and add note ‘quick dinner’.”
  - System produces a preview and applies correctly after confirmation (if required).
- If user references an ambiguous activity name, assistant asks a clarifying question.
- Operations only use allowed primitives and validated schemas.
- After apply, builder UI reflects changes (calendar/table/map) without manual refresh.

---

## Implementation Checklist
1) **Schemas**
   - Define Zod schemas for `Operation`, `TargetRef`, and responses.
2) **Orchestrator**
   - Implement `plan → resolve → execute` flow.
   - Add clarifying-question pathway.
3) **API Route**
   - Add `POST /api/ai/itinerary` accepting `{ itineraryId, destinationId, message, mode }`.
4) **Chat UI**
   - Add a builder panel + preview + confirm.
5) **Execution + Refresh**
   - Execute ops via server actions.
   - Refresh builder snapshot or patch state client-side.
6) **Telemetry**
   - Basic logging and error reporting.

---

## Open Questions
- Provider choice (OpenAI/Anthropic) and whether we need streaming tokens.
- Conversation persistence (client-only vs DB, per itinerary).
- Timezone source-of-truth (destination vs user locale) when interpreting “tomorrow morning.”
- Undo strategy (inverse ops vs snapshot).
- Permission model for collaborators (who is allowed to apply changes via AI).

---

## References (Current Code)
- `actions/supabase/actions.ts`
- `actions/supabase/builderBootstrap.ts`
- `actions/google/actions.ts` (Phase 2 search/add flows)
- `store/itineraryActivityStore.ts` (client-side insert logic; candidate for server extraction)

---

## vNext: Itinerary Intelligence Roadmap
For travel-time / opening-hours / preference-aware planning (and alternatives slots), see:
- `yugen/yugen/docs/AI_ITINERARY_INTELLIGENCE_SPEC.md`
- `yugen/yugen/docs/tasks/008_ai_itinerary_intelligence_epic.md`
