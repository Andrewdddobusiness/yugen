"use client";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CheckoutButton from "@/components/stripe/checkoutButton";

import { Check } from "lucide-react";

import { freeFeatures, pricingDetails, proFeatures } from "./data";

import { useStripeSubscriptionStore } from "@/store/stripeSubscriptionStore";
import { Skeleton } from "@/components/ui/skeleton";
import ManageSubscriptionButton from "@/components/buttons/stripe/manageSubscriptionButton";

export default function PricingPage() {
  const { subscription, isSubscriptionLoading } = useStripeSubscriptionStore();

  const [selectedInterval, setSelectedInterval] = useState("monthly");

  return (
    <div className="flex flex-col items-center my-16">
      {/* Noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
          className="absolute w-full h-full opacity-[0.5] mix-blend-overlay"
        >
          <image href="/home/noise.svg" width="100%" height="100%" />
        </svg>
      </div>

      <div className="relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-[#3A86FF]">Pricing</h1>
          <p className="text-xl text-gray-500">Choose the plan that works for you.</p>
        </div>

        <Tabs defaultValue="monthly" className="w-full max-w-6xl" onValueChange={(value) => setSelectedInterval(value)}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">
              Yearly{" "}
              {selectedInterval === "yearly" &&
                `(${pricingDetails[selectedInterval as keyof typeof pricingDetails].saving})`}
            </TabsTrigger>
          </TabsList>

          {["monthly", "yearly"].map((interval) => (
            <TabsContent key={interval} value={interval} className="space-y-4">
              <div className="grid gap-8 md:grid-cols-2">
                {/* Free Plan */}
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-[#FB5607] text-xl">Hobby</CardTitle>
                    <CardDescription>Free</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1">
                    <div className="space-y-2">
                      {freeFeatures.map((feature) => (
                        <div key={feature} className="flex items-center">
                          <Check className="w-4 h-4 mr-2 text-green-500" />
                          <span className="text-gray-500 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" variant="outline">
                      Get Started
                    </Button>
                  </CardFooter>
                </Card>

                {/* Pro Plan */}
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-[#FB5607] text-xl">Pro</CardTitle>
                    <CardDescription className="flex flex-col space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          USD ${pricingDetails[interval as keyof typeof pricingDetails].price}
                        </span>
                        {interval === "yearly" && (
                          <span className="text-lg line-through text-red-500">
                            USD ${pricingDetails.yearly.originalPrice}
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          / {pricingDetails[interval as keyof typeof pricingDetails].interval}
                        </span>
                      </div>
                      {interval === "yearly" && (
                        <p className="text-xs text-muted-foreground italic -mt-1">
                          Save USD ${Number(pricingDetails.yearly.originalPrice) - Number(pricingDetails.yearly.price)}{" "}
                          per year
                        </p>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        <span className="text-gray-500 text-sm">Everything in Hobby plus...</span>
                      </div>
                      {proFeatures.map((feature) => (
                        <div key={feature} className="flex items-center">
                          <Check className="w-4 h-4 mr-2 text-green-500" />
                          <span className="text-gray-500 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    {isSubscriptionLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : subscription?.status === "active" ? (
                      <ManageSubscriptionButton />
                    ) : (
                      <CheckoutButton priceId={pricingDetails[selectedInterval as keyof typeof pricingDetails].priceId}>
                        Get Started
                      </CheckoutButton>
                    )}
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
