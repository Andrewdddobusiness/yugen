import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-10-28.acacia",
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");
  const supabase = createClient();

  if (!signature) {
    return new Response("No signature provided", { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.client_reference_id && session.customer) {
          const { error } = await supabase
            .from("profile")
            .update({
              stripe_customer_id: session.customer,
            })
            .eq("user_id", session.client_reference_id);

          if (error) throw error;
        }
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // First get the profile with this stripe_customer_id
        const { data: profile } = await supabase
          .from("profile")
          .select("user_id")
          .eq("stripe_customer_id", subscription.customer)
          .single();

        if (!profile) throw new Error("No profile found for customer");

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
