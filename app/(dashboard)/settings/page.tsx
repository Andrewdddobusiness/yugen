"use client";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Gauge, Shield, Sparkles, User } from "lucide-react";

const ProfileCards = lazy(() => import("@/components/settings/ProfileCards"));
const BillingCards = lazy(() => import("@/components/settings/BillingCards"));
const SecurityCards = lazy(() => import("@/components/settings/SecurityCards"));
const AiUsageCards = lazy(() => import("@/components/settings/AiUsageCards"));
const PerformanceCards = lazy(() => import("@/components/settings/PerformanceCards"));

function SettingsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allowedTabs = useMemo(() => ["account", "billing", "security", "ai", "performance"] as const, []);
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
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
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
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Usage
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <Gauge className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
            <ProfileCards />
          </Suspense>
        </TabsContent>
        <TabsContent value="billing" className="mt-6">
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
            <BillingCards />
          </Suspense>
        </TabsContent>
        <TabsContent value="security" className="mt-6">
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
            <SecurityCards />
          </Suspense>
        </TabsContent>
        <TabsContent value="ai" className="mt-6">
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
            <AiUsageCards />
          </Suspense>
        </TabsContent>
        <TabsContent value="performance" className="mt-6">
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
            <PerformanceCards />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Settings() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-6xl px-4 py-10 text-sm text-muted-foreground">Loading settings…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
