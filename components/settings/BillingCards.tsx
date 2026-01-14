"use client";

import { useMemo, useState } from "react";

import { pricingDetails, proFeatures } from "@/app/pricing/data";
import CheckoutButton from "@/components/button/subscription/CheckoutButton";
import ManageSubscriptionButton from "@/components/button/subscription/ManageSubscriptionButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStripeSubscriptionStore } from "@/store/stripeSubscriptionStore";
import { useUserStore } from "@/store/userStore";
import { isDevBillingBypassEnabled } from "@/lib/featureFlags";
import { Check, Sparkles } from "lucide-react";

export default function BillingCards() {
  const { user, isUserLoading } = useUserStore();
  const { subscription, isSubscriptionLoading } = useStripeSubscriptionStore();

  const billingBypassEnabled = isDevBillingBypassEnabled();
  const hasActiveSubscription = subscription?.status === "active";
  const isLoading = (isUserLoading && !user) || isSubscriptionLoading;
  const isPro = billingBypassEnabled || hasActiveSubscription;

  const currentPlanLabel = useMemo(() => {
    if (hasActiveSubscription) {
      const interval = subscription?.attrs?.plan?.interval;
      if (interval === "month") return "Pro - Monthly";
      if (interval === "year") return "Pro - Yearly";
      return "Pro";
    }
    if (billingBypassEnabled) return "Pro - Testing";
    return "Free";
  }, [billingBypassEnabled, hasActiveSubscription, subscription?.attrs]);

  const [selectedInterval, setSelectedInterval] = useState<"monthly" | "yearly">("monthly");

  const renewalText = useMemo(() => {
    if (!isPro) return null;
    if (billingBypassEnabled && !hasActiveSubscription) return "Billing bypass is enabled for testing.";
    if (subscription?.attrs?.cancel_at_period_end) return "Cancels at period end";
    if (!subscription?.currentPeriodEnd) return null;
    return `Renews on ${subscription.currentPeriodEnd.toLocaleDateString()}`;
  }, [billingBypassEnabled, hasActiveSubscription, isPro, subscription?.attrs, subscription?.currentPeriodEnd]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Plan & billing</h2>
          <p className="mt-1 text-sm text-muted-foreground">View your current plan and manage your subscription.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardDescription>Current plan</CardDescription>
            <CardTitle className="flex items-center gap-2">
              {isLoading ? (
                <Skeleton className="h-6 w-40" />
              ) : (
                <>
                  <span className="text-lg font-bold">{currentPlanLabel}</span>
                  <Badge
                    variant={isPro ? "default" : "secondary"}
                    className={isPro ? "bg-yellow-100 text-yellow-900 hover:bg-yellow-100" : ""}
                  >
                    {isPro ? "Pro" : "Free"}
                  </Badge>
                </>
              )}
            </CardTitle>
            {isLoading ? (
              <Skeleton className="h-4 w-56" />
            ) : renewalText ? (
              <CardDescription>{renewalText}</CardDescription>
            ) : (
              <CardDescription>Upgrade any time to unlock Pro features.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : isPro ? (
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-yellow-500" />
                  <p>
                    {billingBypassEnabled && !hasActiveSubscription
                      ? "You’re in Pro testing mode. AI and other Pro features are unlocked without billing."
                      : "You’re on Pro. Manage billing, invoices, and cancellations in Stripe using the button below."}
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-brand-600" />
                  <p>
                    You’re currently on the Free plan. Upgrade to Pro to unlock offline access, better exports, and
                    more.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : hasActiveSubscription ? (
              <ManageSubscriptionButton />
            ) : (
              <div className="w-full text-sm text-muted-foreground">
                {billingBypassEnabled
                  ? "Billing bypass is enabled for this environment."
                  : "Select an interval on the right, then click “Upgrade to Pro”."}
              </div>
            )}
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardDescription>Upgrade</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg font-bold">Pro</span>
              <Badge className="bg-brand-600 hover:bg-brand-600 text-white">Recommended</Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 space-y-4">
            <Tabs value={selectedInterval} onValueChange={(v) => setSelectedInterval(v as "monthly" | "yearly")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>

              {(["monthly", "yearly"] as const).map((interval) => (
                <TabsContent key={interval} value={interval} className="mt-4 space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-gray-900">
                        USD ${pricingDetails[interval].price}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          / {pricingDetails[interval].interval}
                        </span>
                      </div>
                      {interval === "yearly" && pricingDetails.yearly.originalPrice ? (
                        <p className="text-xs text-muted-foreground">
                          Save {pricingDetails.yearly.saving} vs monthly (was USD ${pricingDetails.yearly.originalPrice}
                          / year)
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Billed through Stripe. Cancel anytime.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {proFeatures.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>

          <CardFooter className="border-t px-6 py-4">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : hasActiveSubscription ? (
              <ManageSubscriptionButton />
            ) : (
              <CheckoutButton priceId={pricingDetails[selectedInterval].priceId}>Upgrade to Pro</CheckoutButton>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
