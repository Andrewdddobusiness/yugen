import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import DashboardLayout from "@/components/layouts/dashboardLayout";

export default function Profile() {
  return (
    <div>
      <DashboardLayout title="Settings" activePage="settings">
        <main className="flex min-h-[calc(100vh-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
          <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
            <nav className="grid gap-4 text-sm text-muted-foreground">
              <Link
                href="/settings/profile"
                className="font-semibold text-primary"
              >
                Profile
              </Link>
              <Link href="/settings/security">Login & Security</Link>
              <Link href="/settings/billing">Billing & Plans</Link>
            </nav>
            <div className="grid gap-6">
              {/* Profile Photo Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Photo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Image
                      src="/default-profile-photo.png"
                      alt="Profile"
                      width={100}
                      height={100}
                      className="w-16 h-16 rounded-full border"
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button>Edit</Button>
                  <Button variant={"outline"} className="ml-4">
                    Remove
                  </Button>
                </CardFooter>
              </Card>

              {/* Name Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Name</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-row justify-between">
                  <Input
                    disabled={true}
                    placeholder="Enter your name"
                    defaultValue="John Doe"
                  />
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button>Edit</Button>
                </CardFooter>
              </Card>

              {/* Email Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Email</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-row justify-between">
                  <Input
                    type="email"
                    disabled={true}
                    placeholder="Enter your email"
                    defaultValue="john.doe@example.com"
                  />
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button>Edit</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </main>
      </DashboardLayout>
    </div>
  );
}
