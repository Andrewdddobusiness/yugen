export type AiAssistantAccessMode = "off" | "pro" | "all";

const normalizeBoolean = (value: string | undefined | null) => {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return false;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on" || raw === "enabled";
};

const normalizeAiAssistantAccessMode = (value: string | undefined | null): AiAssistantAccessMode => {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "pro";

  if (raw === "off" || raw === "disabled" || raw === "0" || raw === "false") return "off";
  if (raw === "all" || raw === "on" || raw === "enabled" || raw === "1" || raw === "true") return "all";
  return "pro";
};

export const getAiAssistantAccessMode = (): AiAssistantAccessMode =>
  normalizeAiAssistantAccessMode(process.env.NEXT_PUBLIC_AI_ASSISTANT_ACCESS);

export const getAiAssistantUpgradeHref = () => "/settings?tab=billing";

export const isDevBillingBypassEnabled = () =>
  process.env.NODE_ENV !== "production" && normalizeBoolean(process.env.NEXT_PUBLIC_DEV_BYPASS_BILLING);

export const isAssistantCurationModeEnabled = () => normalizeBoolean(process.env.NEXT_PUBLIC_ASSISTANT_CURATION_MODE);
