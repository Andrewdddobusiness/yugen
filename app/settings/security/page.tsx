"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import DashboardLayout from "@/components/layouts/dashboardLayout";

export default function Settings() {
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);

  const toggleDeleteAccountVisibility = () => {
    setDeleteAccountVisible(!deleteAccountVisible);
  };

  return (
    <div>
      <DashboardLayout title="Settings" activePage="settings">
        <main className="flex min-h-[calc(100vh-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
          <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
            <nav className="grid gap-4 text-sm text-muted-foreground">
              <Link href="/settings/profile">Profile</Link>
              <Link
                href="/settings/security"
                className="font-semibold text-primary"
              >
                Login & Security
              </Link>
              <Link href="/settings/billing">Billing & Plans</Link>
            </nav>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    disabled
                    type={"password"}
                    placeholder="************"
                  />
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Dialog>
                    <DialogTrigger>
                      <div className="flex items-center gap-2">
                        <Link href={"/login/reset"}>
                          <Button>Reset Password</Button>
                        </Link>
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Forgotten Your Password?</DialogTitle>
                        <DialogDescription>
                          Don&apos;t worry, we&apos;ll send you a message to
                          help you reset your password.
                          <div className="mt-4">
                            <Input type={"password"} />
                          </div>
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button type="submit">Continue</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delete Your Account</CardTitle>
                  <CardDescription>
                    Click the button below to delete your account.
                  </CardDescription>
                </CardHeader>

                <CardFooter className="border-t px-6 py-4">
                  <Button
                    variant="destructive"
                    onClick={toggleDeleteAccountVisibility}
                  >
                    Delete Account
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
