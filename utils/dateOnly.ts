const pad2 = (value: number) => String(value).padStart(2, "0");

export const toIsoDateString = (date: Date): string => {
  if (!(date instanceof Date)) return "";
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
};

