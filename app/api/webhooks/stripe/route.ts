import { headers } from "next/headers";
import Stripe from "stripe";
import { createAdminClient } from "@/utils/supabase/admin";

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecretKey) {
    return new Response("Stripe is not configured", { status: 500 });
  }
  if (!webhookSecret) {
    return new Response("Stripe webhook secret is not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
  });

  const body = await req.text();
  const signature = headers().get("stripe-signature");
  const supabase = createAdminClient();

  if (!signature) {
    return new Response("No signature provided", { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.client_reference_id && session.customer) {
          const { error } = await supabase
            .from("profiles")
            .update({
              stripe_customer_id: session.customer,
            })
            .eq("user_id", session.client_reference_id);

          if (error) throw error;
        }

        if (session.client_reference_id && session.customer && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const { error } = await supabase.from("subscriptions").upsert(
            {
              user_id: session.client_reference_id,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              status: subscription.status,
              currency: (subscription.currency ?? "USD").toUpperCase(),
              current_period_start: new Date(subscription.current_period_start * 1000),
              current_period_end: new Date(subscription.current_period_end * 1000),
              attrs: subscription as any,
            },
            { onConflict: "stripe_subscription_id" }
          );
          if (error) throw error;
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

        // First get the profile with this stripe_customer_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) throw new Error("No profile found for customer");

        const { error: upsertError } = await supabase.from("subscriptions").upsert(
          {
            user_id: profile.user_id,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status: subscription.status,
            currency: (subscription.currency ?? "USD").toUpperCase(),
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            attrs: subscription as any,
          },
          { onConflict: "stripe_subscription_id" }
        );
        if (upsertError) throw upsertError;

        // Update subscription status in auth.users metadata
        const { error } = await supabase.auth.admin.updateUserById(profile.user_id, {
          user_metadata: {
            subscription_status: subscription.status,
            subscription_plan: subscription.status === "active" ? "pro" : "free",
          },
        });

        if (error) throw error;
        break;
      }
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Webhook error: " + (err instanceof Error ? err.message : "Unknown error"), { status: 400 });
  }
}
