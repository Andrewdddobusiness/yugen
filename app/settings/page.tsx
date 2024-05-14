"use client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import MobileLayout from "@/components/layouts/mobileLayout";

import { CircleUser, LockKeyhole, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  // Function to handle redirection if screen is in mobile view
  const redirectToMobileView = () => {
    if (window.innerWidth >= 768) {
      // Adjust the threshold as needed
      redirect("/settings/profile");
    }
  };

  // Redirect logic on component mount
  useEffect(() => {
    redirectToMobileView();
  }, []);

  return (
    <MobileLayout title={"Settings"}>
      <div className="mx-auto grid w-full max-w-6xl items-start md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <nav className="grid gap-4 text-md text-black md:hidden p-4">
          <Link
            href="/settings/profile"
            className="font-semibold flex flex-row items-center"
          >
            <Button variant={"ghost"} className="w-full justify-start">
              <CircleUser size={24} className="mr-2" /> <div>Profile</div>
            </Button>
          </Link>
          <Link
            href="/settings/security"
            className="flex flex-row items-center"
          >
            <Button variant={"ghost"} className="w-full justify-start">
              <LockKeyhole size={24} className="mr-2" />

              <div>Login & Security</div>
            </Button>
          </Link>
          <Link href="/settings/billing" className="flex flex-row items-center">
            <Button variant={"ghost"} className="w-full justify-start">
              <CreditCard size={24} className="mr-2" />
              <div>Billing & Plans</div>{" "}
            </Button>
          </Link>
        </nav>

        <nav className="hidden md:block gap-4 text-sm text-muted-foreground ">
          <Link href="/settings/profile" className="font-semibold">
            Profile
          </Link>
          <Link href="/settings/security">Login & Security</Link>
          <Link href="/settings/billing">Billing & Plans</Link>
        </nav>

        <div className="grid gap-6">{/* Your existing content */}</div>
      </div>
    </MobileLayout>
  );
}
