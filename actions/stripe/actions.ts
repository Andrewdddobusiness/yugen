"use server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/security/rateLimit";
import { z } from "zod";

// Initialize Stripe only if the secret key is properly configured
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'sk_test_placeholder_key_for_development') {
    return null;
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
  });
};

const getClientIpFromHeaders = () => {
  const forwardedFor = headers().get("x-forwarded-for") ?? "";
  const first = forwardedFor.split(",")[0]?.trim();
  return first || headers().get("x-real-ip") || "unknown";
};

const getAppUrl = () => {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim().length > 0) return explicit.replace(/\/+$/, "");

  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  return `${proto}://${host}`.replace(/\/+$/, "");
};

const AllowedPriceIdSchema = z.string().trim().min(1).max(200);

export async function handleUserSignup(userId: string, email: string, firstName: string, lastName: string) {
  const supabase = createClient();

  try {
    const stripe = getStripe();
    
    let stripeCustomerId = null;
    
    // Only create Stripe customer if Stripe is properly configured
    if (stripe) {
      try {
        const customer = await stripe.customers.create({
          email,
          name: `${firstName} ${lastName}`,
          metadata: {
            supabase_user_id: userId,
          },
        });
        stripeCustomerId = customer.id;
      } catch (stripeError) {
        console.warn("Stripe customer creation failed:", stripeError);
        // Continue without Stripe - this is optional for development
      }
    }

    // Update profile with Stripe customer ID if created
    // Note: Profile is automatically created by database trigger when user is inserted
    if (stripeCustomerId) {
      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('user_id', userId);

      if (updateError) {
        console.warn("Failed to update profile with Stripe customer ID:", updateError);
        // Don't throw here as the user signup should still succeed
      }
    }
  } catch (error) {
    console.error("Error in user signup hook:", error);
    // Don't throw the error - we don't want to fail the entire signup for Stripe issues
    console.warn("Continuing with signup despite error in post-signup process");
  }
}

export async function createCheckoutSession(priceId: string) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  
  try {
    const parsedPriceId = AllowedPriceIdSchema.safeParse(priceId);
    if (!parsedPriceId.success) {
      throw new Error("Invalid price id");
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const ip = getClientIpFromHeaders();
    const limiter = rateLimit(`stripe:checkout:${ip}:${user.id}`, { windowMs: 60 * 60_000, max: 10 });
    if (!limiter.allowed) {
      throw new Error("Too many requests");
    }

    const allowed = new Set(
      [process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRO_PLAN_ID, process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRO_PLAN_ID].filter(
        Boolean
      ) as string[]
    );
    if (!allowed.has(parsedPriceId.data)) {
      throw new Error("Invalid price id");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id ?? null;

    if (stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        if (typeof customer === "object" && "deleted" in customer && customer.deleted) {
          stripeCustomerId = null;
        }
      } catch (err: any) {
        // If the customer doesn't exist (e.g. key/account changed), create a new one.
        const code = err?.code;
        const param = err?.param;
        if (code === "resource_missing" && param === "customer") {
          stripeCustomerId = null;
        } else {
          throw err;
        }
      }
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name:
          [user.user_metadata?.first_name, user.user_metadata?.last_name]
            .filter((v) => typeof v === "string" && v.trim().length > 0)
            .join(" ") || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
        },
        { onConflict: "user_id" }
      );
      if (upsertError) throw upsertError;
    }

    const appUrl = getAppUrl();
    if (!appUrl) {
      throw new Error("App URL is not configured");
    }
    const billingReturnUrl = `${appUrl}/settings?tab=billing`;

    const createSession = async (customerId: string) => {
      return stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer: customerId,
        client_reference_id: user.id,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${billingReturnUrl}&success=true`,
        cancel_url: `${billingReturnUrl}&canceled=true`,
      });
    };

    let session: Stripe.Checkout.Session;
    try {
      session = await createSession(stripeCustomerId);
    } catch (err: any) {
      // If the customer ID saved in Supabase was from a different Stripe account/key, Stripe will 400.
      const code = err?.code;
      const param = err?.param;
      if (code !== "resource_missing" || param !== "customer") throw err;

      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name:
          [user.user_metadata?.first_name, user.user_metadata?.last_name]
            .filter((v) => typeof v === "string" && v.trim().length > 0)
            .join(" ") || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          stripe_customer_id: customer.id,
        },
        { onConflict: "user_id" }
      );
      if (upsertError) throw upsertError;

      session = await createSession(customer.id);
    }

    return { sessionId: session.id };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw new Error("Failed to create checkout session");
  }
}

interface ISubscriptionOutput {
  out_subscription_id: string;
  out_current_period_end: string;
  out_current_period_start: string;
  out_email: string;
  out_stripe_customer_id: string;
  out_currency: string;
  out_attrs: any;
}

export async function getSubscriptionDetails() {
  const parseDateish = (value: unknown) => {
    const str = String(value ?? "");
    const candidates: string[] = [str];

    const withT = str.includes(" ") ? str.replace(" ", "T") : str;
    candidates.push(withT);
    candidates.push(
      withT
        .replace(/([+-]\\d{2})(\\d{2})$/, "$1:$2")
        .replace(/([+-]\\d{2})$/, "$1:00")
    );

    for (const candidate of candidates) {
      const date = new Date(candidate);
      if (!Number.isNaN(date.getTime())) return date;
    }

    return new Date(NaN);
  };

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    // Prefer RPC (keeps compatibility with existing code), but fall back to direct table query.
    const { data: subscription, error } = (await supabase
      .rpc("get_user_subscription", {
        user_uuid: user.id,
      })
      .single()) as { data: ISubscriptionOutput | null; error: any };

    if (!error && subscription?.out_subscription_id && subscription.out_current_period_end) {
      const now = new Date();
      const periodEnd = parseDateish(subscription.out_current_period_end);

      return {
        status: now < periodEnd ? "active" : "inactive",
        currentPeriodEnd: periodEnd,
        subscriptionId: subscription.out_subscription_id,
        stripeCustomerId: subscription.out_stripe_customer_id,
        currency: subscription.out_currency,
        attrs: subscription.out_attrs,
      };
    }

    if (error) {
      console.error("Subscription RPC error:", error);
    }

    const { data: row, error: tableError } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id,stripe_customer_id,status,currency,current_period_end,attrs")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tableError) {
      console.error("Subscription table query error:", tableError);
      return { status: "error", error: tableError };
    }

    if (!row?.stripe_subscription_id || !row.current_period_end) {
      return { status: "free" };
    }

    const now = new Date();
    const periodEnd = parseDateish(row.current_period_end as any);
    const statusRaw = String(row.status ?? "");
    const isPaidStatus = statusRaw === "active" || statusRaw === "trialing";

    return {
      status: isPaidStatus && now < periodEnd ? "active" : "inactive",
      currentPeriodEnd: periodEnd,
      subscriptionId: row.stripe_subscription_id,
      stripeCustomerId: row.stripe_customer_id,
      currency: row.currency,
      attrs: row.attrs,
    };
  } catch (error) {
    console.error("Error in getSubscriptionStatus:", error);
    return { status: "error", error };
  }
}

export async function createCustomerPortalSession() {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }
  
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    const ip = getClientIpFromHeaders();
    const limiter = rateLimit(`stripe:portal:${ip}:${user.id}`, { windowMs: 10 * 60_000, max: 10 });
    if (!limiter.allowed) {
      throw new Error("Too many requests");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id ?? null;
    if (stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        if (typeof customer === "object" && "deleted" in customer && customer.deleted) {
          stripeCustomerId = null;
        }
      } catch (err: any) {
        const code = err?.code;
        const param = err?.param;
        if (code === "resource_missing" && param === "customer") {
          stripeCustomerId = null;
        } else {
          throw err;
        }
      }
    }
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;
      const { error: upsertError } = await supabase.from("profiles").upsert(
        { user_id: user.id, stripe_customer_id: stripeCustomerId },
        { onConflict: "user_id" }
      );
      if (upsertError) throw upsertError;
    }

    const appUrl = getAppUrl();
    if (!appUrl) throw new Error("App URL is not configured");

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/settings?tab=billing`,
    });

    return { url: portalSession.url };
  } catch (error) {
    console.error("Error creating portal session:", error);
    throw error;
  }
}
