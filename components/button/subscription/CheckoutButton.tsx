"use client";

import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createCheckoutSession } from "@/actions/stripe/actions";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutButtonProps {
  priceId: string;
  children: React.ReactNode;
}

export default function CheckoutButton({ priceId, children }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      const { sessionId } = await createCheckoutSession(priceId);
      const stripe = await stripePromise;

      if (!stripe) throw new Error("Stripe failed to initialize");

      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className="w-full bg-[#2A3B63] text-white rounded-xl shadow-lg hover:scale-105 transition-all duration-300 hover:bg-[#3F5FA3]"
      onClick={handleCheckout}
      disabled={loading}
    >
      {loading ? "Loading..." : children}
    </Button>
  );
}
