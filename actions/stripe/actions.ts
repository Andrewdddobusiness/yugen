"use server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";

// Initialize Stripe only if the secret key is properly configured
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'sk_test_placeholder_key_for_development') {
    return null;
  }
  return new Stripe(secretKey, {
    apiVersion: "2024-10-28.acacia",
  });
};

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
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get the user's Stripe customer ID from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      throw new Error("No Stripe customer found");
    }

    console.log("profile", profile);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: profile.stripe_customer_id,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
    });

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
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    // Call the Supabase function
    const { data: subscription, error } = await supabase
      .rpc<string, ISubscriptionOutput>("get_user_subscription", {
        user_uuid: user.id,
      })
      .single();
    console.log("subscription", subscription);
    if (error) {
      console.error("Subscription query error:", error);
      return { status: "error", error };
    }

    if (!subscription || !subscription.out_subscription_id) {
      return { status: "free" };
    }

    const now = new Date();
    const periodEnd = new Date(subscription.out_current_period_end);

    return {
      status: now < periodEnd ? "active" : "inactive",
      currentPeriodEnd: periodEnd,
      subscriptionId: subscription.out_subscription_id,
      stripeCustomerId: subscription.out_stripe_customer_id,
      currency: subscription.out_currency,
      attrs: subscription.out_attrs,
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      throw new Error("No Stripe customer found");
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    });

    return { url: portalSession.url };
  } catch (error) {
    console.error("Error creating portal session:", error);
    throw error;
  }
}
