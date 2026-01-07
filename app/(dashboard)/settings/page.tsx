"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import ProfileCards from "@/components/settings/ProfileCards";
import SecurityCards from "@/components/settings/SecurityCards";
import BillingCards from "@/components/settings/BillingCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Shield, User } from "lucide-react";

export default function Settings() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allowedTabs = useMemo(() => ["account", "billing", "security"] as const, []);
  type SettingsTab = (typeof allowedTabs)[number];

  const tabFromUrl = useMemo(() => {
    const raw = searchParams.get("tab");
    if (raw && (allowedTabs as readonly string[]).includes(raw)) return raw as SettingsTab;
    return "account" satisfies SettingsTab;
  }, [allowedTabs, searchParams]);

  const [tab, setTab] = useState<SettingsTab>(tabFromUrl);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = (next: string) => {
    const nextTab = ((allowedTabs as readonly string[]).includes(next) ? next : "account") as SettingsTab;
    setTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account, security, and billing.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <ProfileCards />
        </TabsContent>
        <TabsContent value="billing" className="mt-6">
          <BillingCards />
        </TabsContent>
        <TabsContent value="security" className="mt-6">
          <SecurityCards />
        </TabsContent>
      </Tabs>
    </div>
  );
}
