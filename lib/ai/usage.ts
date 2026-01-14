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

const formatDateUTC = (value: Date) => value.toISOString().slice(0, 10);

const parseDateish = (value: unknown) => {
  const str = String(value ?? "");
  const candidates: string[] = [str];

  const withT = str.includes(" ") ? str.replace(" ", "T") : str;
  candidates.push(withT);
  candidates.push(
    withT
      .replace(/([+-]\d{2})(\d{2})$/, "$1:$2")
      .replace(/([+-]\d{2})$/, "$1:00")
  );

  for (const candidate of candidates) {
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
};

const addMonthsUTC = (date: Date, monthsToAdd: number) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();

  const targetMonthIndex = month + monthsToAdd;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay, hour, minute, second, ms));
};

export const getAiCurrentPeriod = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    periodStartAt: start,
    periodEndAt: end,
    periodStart: formatDateUTC(start),
    periodEnd: formatDateUTC(end),
  };
};

const getAiPeriodForUser = async (args: { supabase: any; userId: string; tier: AiPlanTier }) => {
  const { supabase, userId, tier } = args;
  const now = new Date();

  if (tier !== "pro") return getAiCurrentPeriod();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status,current_period_start,current_period_end,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const statusRaw = String((sub as any)?.status ?? "");
  const isPaidStatus = statusRaw === "active" || statusRaw === "trialing";
  const periodStart = parseDateish((sub as any)?.current_period_start);
  const periodEnd = parseDateish((sub as any)?.current_period_end);

  // If we can't reliably read the subscription window, fall back to calendar month.
  if (!isPaidStatus || !periodStart || !periodEnd) return getAiCurrentPeriod();

  // If the Stripe billing period is larger than ~1 month (ex: yearly plans), still reset AI quotas monthly,
  // anchored to the subscription period start.
  const billingPeriodDays = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
  if (billingPeriodDays > 35) {
    let start = periodStart;
    // Advance in monthly steps until the window contains `now`.
    while (addMonthsUTC(start, 1).getTime() <= now.getTime()) {
      start = addMonthsUTC(start, 1);
    }
    const end = addMonthsUTC(start, 1);
    return {
      periodStartAt: start,
      periodEndAt: end,
      periodStart: formatDateUTC(start),
      periodEnd: formatDateUTC(end),
    };
  }

  return {
    periodStartAt: periodStart,
    periodEndAt: periodEnd,
    periodStart: formatDateUTC(periodStart),
    periodEnd: formatDateUTC(periodEnd),
  };
};

export async function getAiUsageForCurrentPeriod(args: {
  supabase: any;
  userId: string;
  periodStartAt: Date;
  periodEndAt: Date;
}): Promise<{ promptTokens: number; completionTokens: number; totalTokens: number } | null> {
  const { supabase, userId, periodStartAt, periodEndAt } = args;

  const { data, error } = await supabase
    .from("ai_token_event")
    .select("prompt_tokens,completion_tokens,total_tokens,created_at")
    .eq("user_id", userId)
    .gte("created_at", periodStartAt.toISOString())
    .lt("created_at", periodEndAt.toISOString());

  if (error) return null;
  const rows = Array.isArray(data) ? (data as any[]) : [];

  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  for (const row of rows) {
    promptTokens += Number(row?.prompt_tokens ?? 0) || 0;
    completionTokens += Number(row?.completion_tokens ?? 0) || 0;
    totalTokens += Number(row?.total_tokens ?? 0) || 0;
  }

  return {
    promptTokens: Math.max(0, promptTokens),
    completionTokens: Math.max(0, completionTokens),
    totalTokens: Math.max(0, totalTokens),
  };
}

export async function checkAiQuota(args: {
  supabase: any;
  userId: string;
  tier: AiPlanTier;
}) {
  const { supabase, userId, tier } = args;
  const { periodStart, periodEnd, periodStartAt, periodEndAt } = await getAiPeriodForUser({ supabase, userId, tier });
  const limit = getAiMonthlyTokenLimit(tier);

  const usage = await getAiUsageForCurrentPeriod({ supabase, userId, periodStartAt, periodEndAt });
  const used = usage?.totalTokens ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    periodStart,
    periodEnd,
    periodStartAt: periodStartAt.toISOString(),
    periodEndAt: periodEndAt.toISOString(),
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
