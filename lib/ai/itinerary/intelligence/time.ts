export const isIsoDateString = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export const parseTimeToMinutes = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
};

export const formatMinutesToHHmm = (minutes: number): string => {
  const safe = Number.isFinite(minutes) ? Math.max(0, Math.min(24 * 60 - 1, Math.floor(minutes))) : 0;
  const hh = Math.floor(safe / 60);
  const mm = safe % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export const getDayOfWeekFromIsoDate = (isoDate: string): number => {
  // Use UTC to avoid local timezone shifts when interpreting YYYY-MM-DD.
  const date = new Date(`${isoDate}T00:00:00Z`);
  return date.getUTCDay();
};

