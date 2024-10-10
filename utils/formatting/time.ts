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

export function formatOpenHours(openHour: string, closeHour: string) {
  if (!openHour || !closeHour) return "";

  const openHourInt = parseInt(openHour.substring(0, 2), 10);
  const closeHourInt = parseInt(closeHour.substring(0, 2), 10);

  if (openHourInt === 0 && closeHourInt === 0) {
    return "Open 24 hours";
  }

  let openPeriod = "AM";
  let closePeriod = "AM";
  let formattedOpenHour = openHourInt;
  let formattedCloseHour = closeHourInt;

  if (openHourInt >= 12) {
    openPeriod = "PM";
    formattedOpenHour = openHourInt === 12 ? 12 : openHourInt - 12;
  }

  if (closeHourInt >= 12) {
    closePeriod = "PM";
    formattedCloseHour = closeHourInt === 12 ? 12 : closeHourInt - 12;
  }

  return `${formattedOpenHour}:${openHour.slice(
    2
  )} ${openPeriod}–${formattedCloseHour}:${closeHour.slice(2)} ${closePeriod} `;
}

export function getFullWeekOpenHours(openHours: any[]) {
  const fullWeek = [
    { day: 0, name: "Monday" },
    { day: 1, name: "Tuesday" },
    { day: 2, name: "Wednesday" },
    { day: 3, name: "Thursday" },
    { day: 4, name: "Friday" },
    { day: 5, name: "Saturday" },
    { day: 6, name: "Sunday" },
  ];

  return fullWeek.map((dayInfo) => {
    const dayHours = openHours.find((hours) => hours.open.day === dayInfo.day);
    if (dayHours) {
      return {
        ...dayInfo,
        hours: formatOpenHours(dayHours.open.time, dayHours.close.time),
      };
    } else {
      return {
        ...dayInfo,
        hours: "Closed",
      };
    }
  });
}
