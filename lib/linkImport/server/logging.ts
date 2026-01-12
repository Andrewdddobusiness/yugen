export const SHOULD_LOG_LINK_IMPORT = process.env.LINK_IMPORT_LOG === "1";

export function logLinkImport(event: string, details: Record<string, unknown>) {
  if (!SHOULD_LOG_LINK_IMPORT) return;
  console.info(`[link-import] ${event}`, details);
}

