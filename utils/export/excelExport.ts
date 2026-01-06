import * as XLSX from "xlsx-js-style";
import { IItineraryActivity } from "@/store/itineraryActivityStore";
import { getActivityCategory, getActivityThemeForTypes, type ActivityCategory } from "@/lib/activityAccent";

interface ItineraryDetails {
  city: string;
  country: string;
  fromDate: Date;
  toDate: Date;
  activities: IItineraryActivity[];
}

type CellStyle = any;

const SLOT_MINUTES = 15;
const MINUTES_PER_DAY = 24 * 60;
const SLOTS_PER_DAY = MINUTES_PER_DAY / SLOT_MINUTES;

const ACCENT_BASE_HEX: Record<string, string> = {
  brand: "3F5FA3",
  teal: "22B8B2",
  amber: "FFB020",
  coral: "FF5A6B",
  lime: "40D57C",
  tan: "8A5A3C",
};

const normalizeHexRgb = (hex: string): string | null => {
  const trimmed = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  return null;
};

const tintHex = (hex: string, amountTowardWhite: number) => {
  const normalized = normalizeHexRgb(hex);
  if (!normalized) return "FFFFFF";
  const t = Math.max(0, Math.min(1, amountTowardWhite));
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const mix = (value: number) => Math.round(value + (255 - value) * t);
  return `${mix(r).toString(16).padStart(2, "0")}${mix(g).toString(16).padStart(2, "0")}${mix(b).toString(16).padStart(2, "0")}`.toUpperCase();
};

const parseTimeToMinutes = (time: string | null | undefined): number | null => {
  if (!time) return null;
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
};

const formatHourLabel = (minutes: number) => `${Math.floor(minutes / 60)}:00`;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const parseIsoDateToUtcDate = (iso: string) => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const formatDisplayDate = (iso: string) => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const eachIsoDateInclusive = (fromIso: string, toIso: string) => {
  const start = parseIsoDateToUtcDate(fromIso);
  const end = parseIsoDateToUtcDate(toIso);
  if (!start || !end) return [];

  const days: string[] = [];
  for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += 24 * 60 * 60 * 1000) {
    days.push(new Date(cursor).toISOString().slice(0, 10));
  }
  return days;
};

const safeFileName = (value: string) =>
  value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "itinerary";

const CATEGORY_TO_EXPORT_LABEL: Record<ActivityCategory, string> = {
  food: "Food",
  sights: "Attraction",
  shopping: "Shopping",
  nature: "Scenery",
  entertainment: "Activity",
  lodging: "Accommodation",
  transport: "Travel",
  other: "Activity",
};

const makeBorder = (rgb = "DDE3F0") => ({
  top: { style: "thin", color: { rgb } },
  bottom: { style: "thin", color: { rgb } },
  left: { style: "thin", color: { rgb } },
  right: { style: "thin", color: { rgb } },
});

const setCell = (ws: XLSX.WorkSheet, row: number, col: number, value: any, style?: CellStyle) => {
  const address = XLSX.utils.encode_cell({ r: row, c: col });
  (ws as any)[address] = {
    v: value,
    t: typeof value === "number" ? "n" : "s",
    ...(style ? { s: style } : {}),
  };
  return address;
};

const setHyperlink = (ws: XLSX.WorkSheet, row: number, col: number, text: string, url: string, style?: CellStyle) => {
  const address = setCell(ws, row, col, text, style);
  (ws as any)[address].l = { Target: url };
};

const buildItinerarySheet = (details: ItineraryDetails) => {
  const ws: XLSX.WorkSheet = {};

  const fromIso = toIsoDate(details.fromDate);
  const toIso = toIsoDate(details.toDate);
  const days = eachIsoDateInclusive(fromIso, toIso);
  const dayCount = days.length;
  const lastCol = Math.max(1, dayCount); // include at least 1 day column

  const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });

  const styles = {
    title: {
      font: { bold: true, sz: 18, color: { rgb: "0D1321" } },
      alignment: { horizontal: "left", vertical: "center" },
    },
    headerLabel: {
      font: { bold: true, color: { rgb: "0D1321" } },
      fill: { patternType: "solid", fgColor: { rgb: "EEF1F7" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: makeBorder(),
    },
    headerCell: {
      font: { bold: true, color: { rgb: "0D1321" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: makeBorder(),
    },
    timeLabel: {
      font: { bold: true, color: { rgb: "2A3245" } },
      fill: { patternType: "solid", fgColor: { rgb: "EEF1F7" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: makeBorder(),
    },
    eventCell: (fillRgb: string) => ({
      font: { bold: true, color: { rgb: "0D1321" } },
      fill: { patternType: "solid", fgColor: { rgb: fillRgb } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: makeBorder(),
    }),
  } as const;

  // Title row
  setCell(ws, 0, 0, "Itinerary", styles.title);
  (ws as any)["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];

  // Row labels (match the reference sheet)
  const rowLabels = ["date", "day", "From", "To", "Area"];
  rowLabels.forEach((label, idx) => {
    setCell(ws, 1 + idx, 0, label, styles.headerLabel);
  });

  // Day columns
  for (let i = 0; i < dayCount; i++) {
    const iso = days[i]!;
    const dateCol = 1 + i;
    const utcDate = parseIsoDateToUtcDate(iso);

    setCell(ws, 1, dateCol, formatDisplayDate(iso), styles.headerCell);
    setCell(ws, 2, dateCol, utcDate ? dayFormatter.format(utcDate) : "", styles.headerCell);
    setCell(ws, 3, dateCol, "", styles.headerCell); // From (placeholder)
    setCell(ws, 4, dateCol, details.city, styles.headerCell); // To (single destination)
    setCell(ws, 5, dateCol, "", styles.headerCell); // Area (placeholder)
  }

  // Time grid labels
  const timeStartRow = 6;
  for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
    const minutes = slot * SLOT_MINUTES;
    const row = timeStartRow + slot;
    const label = minutes % 60 === 0 ? formatHourLabel(minutes) : "";
    setCell(ws, row, 0, label, styles.timeLabel);
    (ws as any)["!rows"] ??= [];
    (ws as any)["!rows"][row] = { hpt: 14 };
  }

  // Place scheduled activities on the grid
  const activeActivities = details.activities.filter((activity) => !activity.deleted_at);
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = (ws as any)["!merges"] ?? [];

  for (const activity of activeActivities) {
    const isoDate = typeof activity.date === "string" ? activity.date : null;
    if (!isoDate) continue;
    const dayIndex = days.indexOf(isoDate);
    if (dayIndex < 0) continue;

    const startMinutes = parseTimeToMinutes(activity.start_time);
    const endMinutesRaw = parseTimeToMinutes(activity.end_time);
    if (startMinutes == null || endMinutesRaw == null) continue;

    let endMinutes = endMinutesRaw;
    if (endMinutes <= startMinutes) {
      // Overnight activities are rare for itinerary planning; clamp within the day.
      endMinutes = Math.min(startMinutes + 60, MINUTES_PER_DAY);
    }

    const startSlot = Math.max(0, Math.min(SLOTS_PER_DAY - 1, Math.floor(startMinutes / SLOT_MINUTES)));
    const endSlot = Math.max(startSlot + 1, Math.min(SLOTS_PER_DAY, Math.ceil(endMinutes / SLOT_MINUTES)));

    const startRow = timeStartRow + startSlot;
    const endRow = timeStartRow + endSlot - 1;
    const col = 1 + dayIndex;

    const theme = getActivityThemeForTypes(activity.activity?.types, activity.activity_id ?? activity.itinerary_activity_id);
    const base = theme.customHex ? normalizeHexRgb(theme.customHex) : null;
    const baseRgb = base ?? ACCENT_BASE_HEX[theme.accent] ?? "3F5FA3";
    const fillRgb = tintHex(baseRgb, 0.84);

    const name = activity.activity?.name || "Untitled";
    const notes = typeof activity.notes === "string" ? activity.notes.trim() : "";
    const content = notes ? `${name}\n${notes.slice(0, 80)}${notes.length > 80 ? "…" : ""}` : name;

    setCell(ws, startRow, col, content, styles.eventCell(fillRgb));
    if (endRow > startRow) {
      merges.push({ s: { r: startRow, c: col }, e: { r: endRow, c: col } });
    }
  }

  (ws as any)["!merges"] = merges;

  // Optional footer rows for lodging links (best-effort).
  const lodgingRow = timeStartRow + SLOTS_PER_DAY + 2;
  setCell(ws, lodgingRow, 0, "Accommodation", styles.headerLabel);
  setCell(ws, lodgingRow + 1, 0, "Link", styles.headerLabel);

  for (let i = 0; i < dayCount; i++) {
    const iso = days[i]!;
    const col = 1 + i;
    const lodging = activeActivities.find(
      (row) => row.date === iso && getActivityCategory(row.activity?.types) === "lodging"
    );
    const lodgingName = lodging?.activity?.name ? String(lodging.activity.name) : "";
    const lodgingUrl = lodging?.activity?.google_maps_url || lodging?.activity?.website_url || "";
    setCell(ws, lodgingRow, col, lodgingName, styles.headerCell);
    if (lodgingUrl) {
      setHyperlink(ws, lodgingRow + 1, col, lodgingUrl, lodgingUrl, {
        font: { color: { rgb: "3F5FA3" }, underline: true },
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
        border: makeBorder(),
      });
    } else {
      setCell(ws, lodgingRow + 1, col, "", styles.headerCell);
    }
  }

  // Column sizing
  const cols: Array<{ wch: number }> = [];
  cols[0] = { wch: 14 };
  for (let i = 0; i < dayCount; i++) cols[1 + i] = { wch: 22 };
  (ws as any)["!cols"] = cols;

  // Freeze header rows + time column
  (ws as any)["!views"] = [
    {
      state: "frozen",
      xSplit: 1,
      ySplit: timeStartRow,
      topLeftCell: XLSX.utils.encode_cell({ r: timeStartRow, c: 1 }),
      activePane: "bottomRight",
    },
  ];

  // Sheet range
  const lastRow = lodgingRow + 1;
  (ws as any)["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow, c: lastCol },
  });

  return ws;
};

const buildActivitiesSheet = (details: ItineraryDetails) => {
  const ws: XLSX.WorkSheet = {};
  const activeActivities = details.activities.filter((activity) => !activity.deleted_at);

  const styles = {
    title: {
      font: { bold: true, sz: 18, color: { rgb: "0D1321" } },
      alignment: { horizontal: "left", vertical: "center" },
    },
    header: {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: "3F5FA3" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: makeBorder("2A3B63"),
    },
    row: {
      alignment: { horizontal: "left", vertical: "top", wrapText: true },
      border: makeBorder(),
    },
    typeCell: (fillRgb: string) => ({
      font: { bold: true, color: { rgb: "0D1321" } },
      fill: { patternType: "solid", fgColor: { rgb: fillRgb } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: makeBorder(),
    }),
  } as const;

  // Title row
  setCell(ws, 0, 0, "Activities", styles.title);
  (ws as any)["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  // Header row (matches the reference sheet)
  const headers = ["Yes or No", "Type", "Activity", "City", "Notes", "Priority"];
  headers.forEach((label, idx) => setCell(ws, 1, idx, label, styles.header));

  // Data rows
  const sorted = [...activeActivities].sort((a, b) => {
    const da = typeof a.date === "string" ? a.date : "9999-99-99";
    const db = typeof b.date === "string" ? b.date : "9999-99-99";
    const sa = a.start_time || "";
    const sb = b.start_time || "";
    return da.localeCompare(db) || sa.localeCompare(sb);
  });

  sorted.forEach((activity, index) => {
    const row = 2 + index;
    const types = activity.activity?.types;
    const theme = getActivityThemeForTypes(types, activity.activity_id ?? activity.itinerary_activity_id);
    const base = theme.customHex ? normalizeHexRgb(theme.customHex) : null;
    const baseRgb = base ?? ACCENT_BASE_HEX[theme.accent] ?? "3F5FA3";
    const fillRgb = tintHex(baseRgb, 0.86);

    const category = getActivityCategory(types);
    const typeLabel = CATEGORY_TO_EXPORT_LABEL[category];
    setCell(ws, row, 0, "", styles.row); // Yes/No placeholder
    setCell(ws, row, 1, typeLabel, styles.typeCell(fillRgb));
    setCell(ws, row, 2, activity.activity?.name || "", styles.row);
    setCell(ws, row, 3, details.city, styles.row);
    setCell(ws, row, 4, activity.notes || "", styles.row);
    setCell(ws, row, 5, "", styles.row); // Priority placeholder

    const url = activity.activity?.google_maps_url || activity.activity?.website_url;
    if (url) {
      setHyperlink(ws, row, 2, activity.activity?.name || url, url, {
        ...styles.row,
        font: { color: { rgb: "3F5FA3" }, underline: true },
      });
    }
  });

  // Column sizing
  (ws as any)["!cols"] = [
    { wch: 10 }, // Yes
    { wch: 16 }, // Type
    { wch: 36 }, // Activity
    { wch: 18 }, // City
    { wch: 44 }, // Notes
    { wch: 12 }, // Priority
  ];

  // Freeze header rows
  (ws as any)["!views"] = [
    {
      state: "frozen",
      xSplit: 0,
      ySplit: 2,
      topLeftCell: "A3",
      activePane: "bottomLeft",
    },
  ];

  // Filters
  const lastExcelRow = 2 + sorted.length; // header is row 2
  (ws as any)["!autofilter"] = { ref: `A2:F${lastExcelRow}` };

  (ws as any)["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastExcelRow - 1, c: 5 },
  });

  return ws;
};

export const exportToExcel = (itineraryDetails: ItineraryDetails) => {
  const workbook = XLSX.utils.book_new();

  const itinerarySheet = buildItinerarySheet(itineraryDetails);
  XLSX.utils.book_append_sheet(workbook, itinerarySheet, "Itinerary");

  const activitiesSheet = buildActivitiesSheet(itineraryDetails);
  XLSX.utils.book_append_sheet(workbook, activitiesSheet, "Activities");

  XLSX.writeFile(workbook, `${safeFileName(itineraryDetails.city)}_itinerary.xlsx`, {
    bookType: "xlsx",
    compression: true,
  });
};
