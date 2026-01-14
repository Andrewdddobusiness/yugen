import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSubscriptionDetails } from "@/actions/stripe/actions";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth?.user) {
    return NextResponse.json(
      {
        ok: false,
        error: "not_authenticated",
        details: authError?.message ?? null,
      },
      { status: 401 }
    );
  }

  const userId = auth.user.id;

  const [{ data: profile, error: profileError }, { data: subs, error: subsError }, details] = await Promise.all([
    supabase.from("profiles").select("user_id,stripe_customer_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("stripe_subscription_id,stripe_customer_id,status,current_period_end,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    getSubscriptionDetails(),
  ]);

  return NextResponse.json({
    ok: true,
    userId,
    profile,
    profileError: profileError?.message ?? null,
    subscriptions: subs ?? null,
    subscriptionsError: subsError?.message ?? null,
    getSubscriptionDetails: details,
  });
}

