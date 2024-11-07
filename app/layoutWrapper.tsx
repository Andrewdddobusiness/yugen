"use client";
import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { GeistSans } from "geist/font/sans";
import { Outfit } from "next/font/google";
import Providers from "./providers";
import { Toaster } from "@/components/ui/toaster";

import { useStripeSubscriptionStore, ISubscriptionDetails } from "@/store/stripeSubscriptionStore";
import { getSubscriptionDetails } from "@/actions/stripe/actions";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
});

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { setSubscription, setIsSubscriptionLoading } = useStripeSubscriptionStore();

  useEffect(() => {
    useUserStore.getState().fetchUser();
  }, []);

  useEffect(() => {
    async function fetchSubscriptionStatus() {
      setIsSubscriptionLoading(true);
      const subDetails = await getSubscriptionDetails();
      setSubscription(subDetails as ISubscriptionDetails);
      setIsSubscriptionLoading(false);
    }

    fetchSubscriptionStatus();
  }, []);

  return (
    <html lang="en">
      <body className={`${GeistSans.className} ${outfit.className}`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
