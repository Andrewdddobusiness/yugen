import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import DashboardLayout from "@/components/layouts/dashboardLayout";

export default function Billing() {
  return (
    <div>
      <DashboardLayout title="Settings" activePage="settings">
        <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
          <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
            <nav className="grid gap-4 text-sm text-muted-foreground">
              <Link href="/settings/profile">Profile</Link>
              <Link href="/settings/security">Login & Security</Link>
              <Link
                href="/settings/billing"
                className="font-semibold text-primary"
              >
                Billing & Plans
              </Link>
            </nav>
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardDescription>Free</CardDescription>
                  <CardTitle>Subscription</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">Tokens Remaining: 20/30</div>
                  <Progress value={33} className="mt-2" />
                  <div className="text-xs mt-2 text-zinc-500">
                    10/30 Tokens Used. Tokens are used for generating
                    itineraries using our AI Travel Planning service.
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button>Change Plan</Button>
                  {/* <Button variant={"destructive"} className="ml-4">
                    Cancel Plan
                  </Button> */}
                  <Button variant={"outline"} className="ml-4">
                    Top Up Tokens
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs mt-2 text-zinc-500">Default</div>
                  <div className="flex flex-row mt-2">
                    <Image
                      src="/mastercard.svg"
                      alt="globalization"
                      width={50}
                      height={50}
                      className="max-w-lg"
                    />
                    <div className="text-sm ml-2">****0000</div>
                  </div>

                  <div className="text-xs mt-2 text-zinc-500">
                    Expires 05/2026
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button>Add Payment Method</Button>
                  <Button variant={"outline"} className="ml-4">
                    Remove
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </main>
      </DashboardLayout>
    </div>
  );
}
