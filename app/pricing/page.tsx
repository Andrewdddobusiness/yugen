"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check } from "lucide-react";
import CheckoutButton from "@/components/stripe/checkoutButton";

export default function PricingPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4">Pricing</h1>
        <p className="text-xl">Choose the plan that works for you</p>
      </div>

      <Tabs defaultValue="monthly" className="w-full max-w-6xl">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly (Save 20%)</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Free Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Hobby</CardTitle>
                <CardDescription>Free</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {["Pro two-week trial", "2000 completions", "50 slow premium requests"].map((feature) => (
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
            <Card>
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">$20</span>
                  <span className="ml-1 text-sm text-muted-foreground">/ Month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {[
                    "Unlimited completions",
                    "500 fast premium requests per month",
                    "Unlimited slow premium requests",
                    "10 o1-mini uses per day",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <CheckoutButton priceId={process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PLAN_ID!}>Get Started</CheckoutButton>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Yearly tab content - same structure but with discounted prices */}
        <TabsContent value="yearly">
          {/* Copy the same grid structure but adjust prices to show yearly rates */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
