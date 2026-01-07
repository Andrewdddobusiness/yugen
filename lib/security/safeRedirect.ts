const isSafeRedirectPath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.includes("://")) return false;
  if (/[\r\n]/.test(trimmed)) return false;
  return true;
};

export const safeRedirectPath = (value: string | null | undefined, fallback = "/") => {
  if (!value) return fallback;
  return isSafeRedirectPath(value) ? value.trim() : fallback;
};

