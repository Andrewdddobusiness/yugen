export type AiAssistantAccessMode = "off" | "pro" | "all";

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

