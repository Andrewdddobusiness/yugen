import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import CheckoutButton from "@/components/stripe/checkoutButton";
import ProfileCards from "@/components/settings/profileCards";

export default function Settings() {
  return (
    <div className="flex flex-col mx-4 gap-8">
      <div className="flex flex-col mx-4 gap-4">
        <p className="text-2xl font-bold">Account</p>
        <ProfileCards />
      </div>

      <div className="flex flex-col mx-4 gap-4">
        <p className="text-2xl font-bold">Billing</p>
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 5xl:grid-cols-5 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Subscription</CardDescription>
              <CardTitle>Free</CardTitle>
            </CardHeader>

            <CardFooter className="border-t px-6 py-4">
              <CheckoutButton priceId={process.env.NEXT_PUBLIC_STRIPE_PRO_PLAN_ID!}>Upgrade to Pro</CheckoutButton>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
