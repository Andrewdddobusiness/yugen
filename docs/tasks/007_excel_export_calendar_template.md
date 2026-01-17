# Ticket: 007 Excel Export Calendar-Style Sheet (Multi-Destination + Travel Blocks)

**Priority**: Medium  
**Complexity**: Medium (layout + styling + multi-destination mapping)  
**Estimated Hours**: 8–14 hours  
**Dependencies**: None  
**Status**: In Review

## 0. Executive Summary (Why This Exists)

Our current Excel export works, but it doesn’t reliably match the “calendar” mental model you use in the product: columns by day, rows by time, with clear city/route context per day and visually distinct blocks.

After this ships, the Excel export will produce a calendar-like spreadsheet that mirrors the builder calendar: each day is a column, time slots are rows, activities render as merged blocks in time order, and the header includes day/date plus a clear “From → To / Area” context (especially for multi-destination itineraries). Color-coding and labels will be consistent and readable in both Excel and Google Sheets.

## 1. Goals (What Must Be True After This Ships)

- Export produces a calendar-style sheet that visually matches the app’s calendar (day columns, time rows, blocks).
- Header rows include per-day context: `Date`, `Day`, `From`, `To`, `Area` (or equivalent), populated correctly for multi-destination itineraries.
- Activities appear as merged cells spanning their duration, in correct sequence, with consistent color coding and readable text.
- Travel segments (e.g., “Flying”, “Train”, “Drive”) can render as distinct blocks between destinations/days when applicable.
- Export works for both “single destination (current destination)” and “entire itinerary (multi-destination)” modes.

## 2. Non-Goals (Guardrails)

- Full “round-trip optimization” or auto-scheduling inside Excel.
- A perfect 1:1 recreation of every UI interaction (drag/drop, popovers, filters).
- Supporting arbitrary Excel themes or all spreadsheet apps equally (target Excel + Google Sheets as primary).

## 3. Background / Current Behavior (Optional)

- Export entrypoint: `components/dialog/export/ShareExportDialog.tsx` calls `utils/export/excelExport.ts`.
- Current `utils/export/excelExport.ts` already creates a calendar-like grid, but:
  - `From` is left blank and `To` is hard-coded to the destination city (works only for single destination exports).
  - Multi-destination routing context (e.g. “Paris → Lyon”, “Rome → Florence”) is not represented in the header.
  - Travel blocks between cities/dates are not modeled in the sheet.
  - Styling and readability constraints for long labels need standardization (wrap/truncation/row heights).
- There is also `utils/export/enhancedExcelExport.ts` used elsewhere (option-heavy), but it’s not the calendar-style output.

## 4. Core Concepts (Optional)

We should introduce a small “calendar export model” that is independent of UI components and can be rendered to XLSX.

```ts
type CalendarDayColumn = {
  isoDate: string; // YYYY-MM-DD
  weekdayLabel: string; // "Thursday"
  fromLabel?: string; // "Rome" or "Paris"
  toLabel?: string; // "Florence" or "Lyon"
  areaLabel?: string; // optional: neighborhood / region / destination name
};

type CalendarBlock = {
  isoDate: string;
  startMinutes: number; // 0..1439
  endMinutes: number;   // 1..1440
  title: string;
  subtitle?: string;
  kind: "activity" | "travel";
  colorHex?: string; // normalized without '#'
};
```

## 5. Data / Prompt / API Contracts (Optional but Recommended)

- Export requires enough data to compute:
  - `CalendarDayColumn` values (including multi-destination mapping)
  - `CalendarBlock` list for the date range
- For multi-destination export, we need the itinerary’s destination list (not just the currently open destination):
  - likely from `public.itinerary_destination` (with `from_date`, `to_date`, `city`, `country`, and ordering)
- No prompt or AI contracts are required for this ticket.

## 6. Task Breakdown (Numbered, Checkbox-Driven)

### 1. Define export modes + inputs

**Estimated**: 2–3 hours

- [x] Add an explicit export mode:
  - [x] `current_destination` (existing behavior)
  - [x] `entire_itinerary` (new)
- [x] Define a shared “calendar export model” (`CalendarDayColumn[]` + `CalendarBlock[]`)
  - [x] Map itinerary activities into blocks (existing logic can be adapted)
  - [ ] Map travel segments into blocks (new)

**Files:**  
`utils/export/excelExport.ts`  
`components/dialog/export/ShareExportDialog.tsx`

### 2. Populate header rows correctly for multi-destination

**Estimated**: 2–4 hours

- [x] Fetch itinerary destinations when exporting the entire itinerary
  - [x] Determine which destination “owns” each `isoDate`
  - [x] Fill `From`, `To`, `Area` header rows per column based on destination transitions
- [x] For current destination export, keep today’s date range logic, but fill `From/To/Area` consistently (no blanks)

**Files:**  
`utils/export/excelExport.ts`  
`actions/supabase/actions.ts` (or a new export-specific fetch action)

### 3. Improve visual fidelity + readability (calendar parity)

**Estimated**: 3–5 hours

- [x] Standardize row heights and text wrap for activity blocks
  - [x] Ensure multi-line text stays readable (title + subtitle/address/notes)
  - [x] Clamp/ellipsis where appropriate to avoid breaking layout
- [x] Ensure color palette matches app category accents (and is readable in Sheets)
  - [x] Provide consistent text color for dark/light fills
- [ ] Add optional legend row/side panel for categories/colors

**Files:**  
`utils/export/excelExport.ts`  
`lib/activityAccent.ts`

### 4. Export QA + docs

**Estimated**: 1–2 hours

- [x] Add quick manual QA checklist (multi-destination + single destination)
- [ ] Add a small “Export format” doc / screenshot examples for expected output

**Files:**  
`docs/tasks/007_excel_export_calendar_template.md`  
`components/dialog/export/ShareExportDialog.tsx`

## 7. Acceptance Criteria (Strict)

- [ ] Exported sheet includes `Date`, `Day`, `From`, `To`, `Area` header rows, populated for every day column.
- [ ] Activities appear on correct dates and in correct time positions, with merged cell durations.
- [ ] Multi-destination itineraries show correct routing context (e.g. “Paris → Lyon”) in header rows.
- [ ] Travel segments (when present) render as distinct blocks and do not overwrite activity blocks.
- [ ] Output opens cleanly in Excel and Google Sheets with readable formatting (no broken merges, no unreadable colors).

## 8. Testing Requirements

- [ ] Unit tests:
  - [ ] Date-to-destination mapping for multi-destination itineraries
  - [ ] Block placement math (start/end minutes → slot rows)
  - [ ] Merge range generation for edge cases (short/overlapping blocks)
- [ ] Integration tests:
  - [ ] Export with a known fixture itinerary produces expected sheet structure (smoke snapshot via XLSX parse)
- [ ] Manual QA checklist (if relevant):
  - [ ] Export current destination with 5–10 activities (varied durations)
  - [ ] Export multi-destination itinerary spanning ≥ 7 days with at least 2 destination transitions
  - [ ] Open in Excel + Google Sheets; verify header alignment, merges, colors, and text readability

## 9. Rollout / Migration Notes (Optional)

- [ ] If we add “entire itinerary” export, gate behind a UI toggle or export option until validated.
- [ ] Keep existing export mode as default to avoid surprising users.

## 10. Risks / Open Questions

- Risk: Multi-destination mapping rules may differ from how the calendar currently groups city chips; we need a single canonical rule (app + export).  
  Mitigation: reuse the same destination/date logic used by the builder summary (or extract shared util).
- Open question: Should travel segments be inferred (destination changes) or derived from explicit “transport” activities already in the itinerary?

## 11. Implementation Notes (Fill In As You Land Changes)

- Implemented two Excel export options:
  - Destination-only calendar export (existing)
  - Entire-itinerary calendar export (new)
- Extended `utils/export/excelExport.ts` to accept `destinations` + `exportScope: "itinerary"` and compute per-day `From/To/Area`.
- Added grid borders/fills for better calendar parity (weekends + transition days) and filled merged block ranges for consistent styling.
- Consider adding inferred travel blocks (destination transitions) as a follow-up.

**Key files touched:**  
`utils/export/excelExport.ts`  
`components/dialog/export/ShareExportDialog.tsx`

## Related Tickets

- None
