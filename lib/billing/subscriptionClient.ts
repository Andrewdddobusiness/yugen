import { createClient } from "@/utils/supabase/client";

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

  return new Date(NaN);
};

export async function getSubscriptionDetailsClient() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "free" };
  }

  const [subscriptionResult, grantResult] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("stripe_subscription_id,stripe_customer_id,status,currency,current_period_end,attrs")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("pro_grants")
      .select("enabled,expires_at,note,created_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (subscriptionResult.error) {
    return { status: "error", error: subscriptionResult.error };
  }

  const row = subscriptionResult.data as any;

  if (row?.stripe_subscription_id && row.current_period_end) {
    const periodEnd = parseDateish(row.current_period_end);
    const statusRaw = String(row.status ?? "");
    const isPaidStatus = statusRaw === "active" || statusRaw === "trialing";

    const isActive = isPaidStatus && (Number.isNaN(periodEnd.getTime()) || new Date() < periodEnd);

    return {
      status: isActive ? "active" : "inactive",
      currentPeriodEnd: periodEnd,
      subscriptionId: row.stripe_subscription_id,
      stripeCustomerId: row.stripe_customer_id,
      currency: row.currency,
      attrs: { ...(row.attrs ?? {}), source: "stripe" },
    };
  }

  if (grantResult.error) {
    return { status: "error", error: grantResult.error };
  }

  const grant = grantResult.data as any;
  const enabled = Boolean(grant?.enabled);
  const expiresAt = grant?.expires_at ? parseDateish(grant.expires_at) : null;
  const isExpired = expiresAt ? !Number.isNaN(expiresAt.getTime()) && new Date() >= expiresAt : false;

  if (!enabled || isExpired) {
    return { status: "free" };
  }

  // Treat manual grants as "active" for feature gating, but mark the source to avoid showing Stripe controls.
  return {
    status: "active",
    currentPeriodEnd: expiresAt ?? new Date(NaN),
    subscriptionId: `grant_${user.id}`,
    stripeCustomerId: "",
    currency: "USD",
    attrs: { source: "grant", note: grant?.note ?? null, expiresAt: grant?.expires_at ?? null, createdAt: grant?.created_at ?? null },
  };
}
