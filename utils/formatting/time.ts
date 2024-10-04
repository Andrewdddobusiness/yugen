export function formatTime(time: string): string {
  if (!time) return "";

  const [hours, minutes] = time.split(":");
  const hoursNum = parseInt(hours, 10);

  let period = "AM";
  let formattedHours = hoursNum;

  if (hoursNum >= 12) {
    period = "PM";
    formattedHours = hoursNum === 12 ? 12 : hoursNum - 12;
  }

  formattedHours = formattedHours === 0 ? 12 : formattedHours;

  return `${formattedHours}:${minutes} ${period}`;
}
