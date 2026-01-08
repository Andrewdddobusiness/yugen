import { createAdminClient } from "@/utils/supabase/admin";
import type { OpenAiUsage } from "@/lib/ai/itinerary/openai";

export type AiPlanTier = "free" | "pro";

const parsePositiveInt = (value: string | undefined | null) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const getAiMonthlyTokenLimit = (tier: AiPlanTier) => {
  const envLimit =
    tier === "pro"
      ? parsePositiveInt(process.env.AI_MONTHLY_TOKEN_LIMIT_PRO)
      : parsePositiveInt(process.env.AI_MONTHLY_TOKEN_LIMIT_FREE);

  if (typeof envLimit === "number") return envLimit;
  return tier === "pro" ? 300_000 : 0;
};

export const getAiCurrentPeriod = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
};

export async function getAiUsageForCurrentPeriod(args: {
  supabase: any;
  userId: string;
}): Promise<{ promptTokens: number; completionTokens: number; totalTokens: number } | null> {
  const { supabase, userId } = args;
  const { periodStart } = getAiCurrentPeriod();

  const { data, error } = await supabase
    .from("ai_token_usage")
    .select("prompt_tokens,completion_tokens,total_tokens")
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;

  return {
    promptTokens: Number((data as any).prompt_tokens ?? 0) || 0,
    completionTokens: Number((data as any).completion_tokens ?? 0) || 0,
    totalTokens: Number((data as any).total_tokens ?? 0) || 0,
  };
}

export async function checkAiQuota(args: {
  supabase: any;
  userId: string;
  tier: AiPlanTier;
}) {
  const { supabase, userId, tier } = args;
  const { periodStart, periodEnd } = getAiCurrentPeriod();
  const limit = getAiMonthlyTokenLimit(tier);

  const usage = await getAiUsageForCurrentPeriod({ supabase, userId });
  const used = usage?.totalTokens ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    periodStart,
    periodEnd,
    limit,
    used,
    remaining,
    allowed: used < limit,
    promptTokens: usage?.promptTokens ?? 0,
    completionTokens: usage?.completionTokens ?? 0,
  };
}

export async function recordAiUsage(args: {
  userId: string;
  feature: string;
  usage: OpenAiUsage;
}) {
  const { userId, feature, usage } = args;
  if (!userId) return;
  if (!usage || usage.totalTokens <= 0) return;

  try {
    const admin = createAdminClient();

    const { error } = await admin.rpc("record_ai_token_usage", {
      user_uuid: userId,
      feature,
      model: usage.model,
      kind: usage.kind,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
    });

    if (error) {
      console.warn("Failed to record AI token usage:", error);
    }
  } catch (error) {
    console.warn("Failed to record AI token usage:", error);
  }
}
