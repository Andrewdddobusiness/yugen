/**
 * Formats a time string from 24-hour format to 12-hour format with AM/PM indicator.
 *
 * @param time - A string representing time in 24-hour format (e.g., "14:30")
 * @returns A formatted string in 12-hour format with AM/PM (e.g., "2:30 PM")
 */
export function formatTime(time: string): string {
  if (!time) return "";

  const [hours, minutes] = time.split(":");
  let hoursNum = parseInt(hours, 10);
  if (hoursNum === 24) hoursNum = 0;

  let period = "AM";
  let formattedHours = hoursNum;

  if (hoursNum >= 12) {
    period = "PM";
    formattedHours = hoursNum === 12 ? 12 : hoursNum - 12;
  }

  formattedHours = formattedHours === 0 ? 12 : formattedHours;

  return `${formattedHours}:${minutes} ${period}`;
}

/**
 * Formats opening hours from 24-hour format to 12-hour format with AM/PM indicator.
 * If the time is 00:00, it returns "Open 24 hours".
 *
 * @param hour - The hour in 24-hour format (0-23)
 * @param minute - The minute (0-59)
 * @returns A formatted string representing the opening time or "Open 24 hours"
 */
export function formatOpenHours(day: number, hour: number, minute: number): string {
  if (hour === undefined || minute === undefined) return "";

  if (day === 6 && hour === 0 && minute === 0) {
    return "Midnight";
  }

  let period = "AM";
  let formattedHour = hour;

  if (hour >= 12) {
    period = "PM";
    formattedHour = hour === 12 ? 12 : hour - 12;
  }

  formattedHour = formattedHour === 0 ? 12 : formattedHour;

  return `${formattedHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

/**
 * Formats a date-time string into a human-readable format.
 *
 * @param dateTimeString - A string representing a date and time (e.g., ISO 8601 format)
 * @returns A formatted string with the date and time in a localized format
 */
export function formatDateTime(dateTimeString: string): string {
  if (!dateTimeString) return "";

  const date = new Date(dateTimeString);

  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/**
 * Formats a Date object into a user-friendly string format.
 *
 * @param date - A Date object to be formatted
 * @returns A formatted string representing the date (e.g., "November 14, 2024")
 */
export function formatUserFriendlyDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return "Invalid date";

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

/**
 * Formats a Date object into DD-MM-YYYY format.
 *
 * @param date - A Date object to be formatted
 * @returns A formatted string representing the date (e.g., "14-11-2024")
 */
export function formatDate(date: Date | string): string {
  if (!date) return "Invalid date";

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) return "Invalid date";

  const day = dateObj.getDate().toString().padStart(2, "0");
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0"); // +1 because months are 0-indexed
  const year = dateObj.getFullYear();

  return `${day}-${month}-${year}`;
}
