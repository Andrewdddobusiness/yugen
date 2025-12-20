"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import { getSubscriptionDetails } from "@/actions/stripe/actions";

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ManageSubscriptionButton from "@/components/button/subscription/ManageSubscriptionButton";
import ProfileCards from "@/components/settings/ProfileCards";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import { useStripeSubscriptionStore } from "@/store/stripeSubscriptionStore";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";
import { useUserStore } from "@/store/userStore";

export default function Settings() {
  const { user } = useUserStore();
  const { subscription, isSubscriptionLoading } = useStripeSubscriptionStore();

  return (
    <div className="flex flex-col mx-4 gap-8">
      <div className="flex flex-col mx-4 gap-4">
        <p className="text-2xl font-bold text-gray-800">Account</p>
        <ProfileCards />
      </div>

      <div className="flex flex-col mx-4 gap-4">
        <p className="text-2xl font-bold text-gray-800">Billing</p>
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 5xl:grid-cols-5 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Subscription</CardDescription>
              <CardTitle>
                {user === null || isSubscriptionLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <span className="text-lg font-bold">
                    {subscription?.status === "active" ? (
                      <>
                        Pro {" - "}
                        {capitalizeFirstLetterOfEachWord(subscription?.attrs.plan.interval)}ly
                      </>
                    ) : (
                      "Free"
                    )}
                  </span>
                )}
              </CardTitle>
              {user === null || isSubscriptionLoading ? (
                <Skeleton className="h-2 w-32" />
              ) : subscription !== null && subscription?.attrs && subscription?.attrs.cancel_at_period_end ? (
                <CardDescription>Cancelled</CardDescription>
              ) : (
                subscription?.status === "active" && (
                  <CardDescription>Renews on {subscription.currentPeriodEnd?.toLocaleDateString()}</CardDescription>
                )
              )}
            </CardHeader>

            <CardFooter className="border-t px-6 py-4">
              {user === null || isSubscriptionLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : subscription?.status === "active" ? (
                <ManageSubscriptionButton />
              ) : (
                <Link href="/pricing" className="w-full">
                  <Button
                    className="w-full bg-[#3F5FA3] rounded-xl shadow-lg text-white hover:bg-[#3F5FA3]/90 active:scale-95 transition-all duration-300"
                    disabled={isSubscriptionLoading}
                  >
                    Upgrade to Pro
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
