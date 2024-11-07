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
    <div className="flex flex-col items-center mt-16">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4">Pricing</h1>
        <p className="text-xl">Choose the plan that works for you</p>
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
                  <CardTitle>Hobby</CardTitle>
                  <CardDescription>Free</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div className="space-y-2">
                    {freeFeatures.map((feature) => (
                      <div key={feature} className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        <span>{feature}</span>
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
                  <CardTitle>Pro</CardTitle>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold">
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
                    <p className="text-sm text-muted-foreground mt-1">
                      Save USD ${Number(pricingDetails.yearly.originalPrice) - Number(pricingDetails.yearly.price)} per
                      year
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div className="space-y-2">
                    {proFeatures.map((feature) => (
                      <div key={feature} className="flex items-center">
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        <span>{feature}</span>
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
  );
}
