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

export const safeRedirectUrl = (value: string | null | undefined, requestUrl: string, fallback = "/") => {
  const base = new URL(requestUrl);
  const fallbackPath = safeRedirectPath(fallback, "/");

  if (!value) return new URL(fallbackPath, base);

  try {
    const candidate = new URL(value, base);
    if (candidate.origin !== base.origin) return new URL(fallbackPath, base);

    const safePathname = safeRedirectPath(candidate.pathname, fallbackPath);
    return new URL(`${safePathname}${candidate.search}${candidate.hash}`, base);
  } catch {
    return new URL(fallbackPath, base);
  }
};
