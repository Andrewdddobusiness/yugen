"use client";
import { useEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { getSubscriptionDetails } from "@/actions/stripe/actions";

import { useUserStore } from "@/store/userStore";
import { useStripeSubscriptionStore, ISubscriptionDetails } from "@/store/stripeSubscriptionStore";
import { createClient } from "@/utils/supabase/client";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useItineraryCollaborationPanelStore } from "@/store/itineraryCollaborationPanelStore";

import { Button } from "@/components/ui/button";
import { Download, Lock, Share, Sparkles, Users } from "lucide-react";
import Loading from "@/components/loading/Loading";
import { ItineraryAssistantSheet, ItineraryAssistantSidebar } from "@/components/ai/ItineraryAssistantSheet";
import { getAiAssistantAccessMode, getAiAssistantUpgradeHref, isDevBillingBypassEnabled } from "@/lib/featureFlags";

const ShareExportDialog = dynamic(
  () => import("@/components/dialog/export/ShareExportDialog").then((mod) => mod.ShareExportDialog),
  { ssr: false }
);

const AppSidebarItineraryActivityLeft = dynamic(
  () =>
    import("@/components/layout/sidebar/app/AppSidebarItineraryActivityLeft2").then(
      (mod) => mod.AppSidebarItineraryActivityLeft
    ),
  {
    ssr: false,
    loading: () => <div className="shrink-0" style={{ width: "var(--sidebar-width-icon)" }} />,
  }
);

const ItineraryCollaborationTrigger = dynamic(
  () =>
    import("@/components/collaboration/ItineraryCollaboration").then((mod) => mod.ItineraryCollaborationTrigger),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        className="h-8 w-24 rounded-full bg-muted animate-pulse"
        aria-label="Open collaboration panel"
      />
    ),
  }
);

const ItineraryCollaborationPanel = dynamic(
  () =>
    import("@/components/collaboration/ItineraryCollaboration").then((mod) => mod.ItineraryCollaborationPanel),
  { ssr: false }
);

export default function Layout({ children }: { children: ReactNode }) {
  const { itineraryId, destinationId } = useParams();
  const pathname = usePathname();
  const router = useRouter();

  const itineraryIdValue = Array.isArray(itineraryId) ? itineraryId[0] : String(itineraryId ?? "");
  const destinationIdValue = Array.isArray(destinationId) ? destinationId[0] : String(destinationId ?? "");
  
  const isBuilderPage = pathname.includes("/builder");
  const currentView = useItineraryLayoutStore((state) => state.currentView);
  const setSharedDndActive = useItineraryLayoutStore((state) => state.setSharedDndActive);
  const sharedDndActive = useItineraryLayoutStore((state) => state.sharedDndActive);
  const enableSharedDnd = isBuilderPage && currentView === "calendar";
  const collaborationOpen = useItineraryCollaborationPanelStore((state) => state.isOpen);
  const openCollaboration = useItineraryCollaborationPanelStore((state) => state.open);
  const closeCollaboration = useItineraryCollaborationPanelStore((state) => state.close);

  const [SharedDndProvider, setSharedDndProvider] = useState<ComponentType<{ children: ReactNode }> | null>(null);

  useEffect(() => {
    if (!enableSharedDnd) {
      setSharedDndActive(false);
      return;
    }

    if (SharedDndProvider) {
      setSharedDndActive(true);
      return;
    }

    let cancelled = false;
    setSharedDndActive(false);

    import("@/components/dnd/SharedCalendarDndProvider")
      .then((mod) => {
        if (cancelled) return;
        setSharedDndProvider(() => mod.SharedCalendarDndProvider);
        setSharedDndActive(true);
      })
      .catch((error) => {
        console.error("Failed to load shared calendar DnD provider:", error);
        setSharedDndActive(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enableSharedDnd, setSharedDndActive, SharedDndProvider]);

  //**** STORES ****//
  const { setUser, setUserLoading, setProfileUrl, setIsProfileUrlLoading } = useUserStore();
  const { setSubscription, setIsSubscriptionLoading } = useStripeSubscriptionStore();
  
  // Remove useWishlist from here to prevent multiple instances

  //***** GET USER *****//
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) throw error;
      return user;
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    setUserLoading(isUserLoading);
  }, [isUserLoading, setUserLoading]);

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  // Realtime: keep itinerary activities in sync across collaborators.
  useEffect(() => {
    if (!user?.id) return;
    if (!itineraryIdValue || !destinationIdValue) return;

    const supabase = createClient();

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(async () => {
        try {
          const store = useItineraryActivityStore.getState();
          const latest = await store.fetchItineraryActivities(itineraryIdValue, destinationIdValue);
          store.setItineraryActivities(latest);
        } catch (error) {
          console.error("Failed to refresh itinerary activities:", error);
        }
      }, 250);
    };

    const channel = supabase
      .channel(`itinerary-activity:${itineraryIdValue}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "itinerary_activity",
          filter: `itinerary_id=eq.${itineraryIdValue}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          const destinationId = String(newRow?.itinerary_destination_id ?? oldRow?.itinerary_destination_id ?? "");
          if (destinationId && destinationId !== destinationIdValue) return;

          const actorId = String(
            newRow?.updated_by ?? newRow?.created_by ?? oldRow?.updated_by ?? oldRow?.created_by ?? ""
          );
          if (actorId && actorId === user.id) return;

          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [destinationIdValue, itineraryIdValue, user?.id]);

  //***** GET PROFILE URL *****//
  const { data: profileUrl, isLoading: isProfileUrlLoading } = useQuery({
    queryKey: ["profileUrl", user?.id],
    queryFn: async () => {
      const supabase = createClient();

      // First check if the file exists
      const { data: fileExists, error: listError } = await supabase.storage.from("avatars").list(user?.id);

      if (listError) {
        console.error("Error checking file existence:", listError);
        return null;
      }

      // If file exists (array has items and one is named "profile")
      if (fileExists && fileExists.some((file) => file.name === "profile")) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(user?.id + "/profile");
        return data.publicUrl;
      }

      // No profile picture exists
      return null;
    },
    enabled: !!user,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    setProfileUrl(profileUrl || "");
  }, [profileUrl, setProfileUrl]);

  useEffect(() => {
    setIsProfileUrlLoading(isProfileUrlLoading);
  }, [isProfileUrlLoading, setIsProfileUrlLoading]);

  //***** GET SUBSCRIPTION DETAILS *****//
  const { data: subscription, isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: getSubscriptionDetails,
    enabled: !!user,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    setIsSubscriptionLoading(isSubscriptionLoading);
  }, [isSubscriptionLoading, setIsSubscriptionLoading]);

  useEffect(() => {
    const status = (subscription as any)?.status;
    if (status === "active" || status === "inactive") {
      setSubscription(subscription as ISubscriptionDetails);
    } else {
      setSubscription(null);
    }
  }, [subscription, setSubscription]);

	  const getBreadcrumbText = () => {
	    if (pathname.includes("/builder")) {
	      return "Builder";
	    } else if (pathname.includes("/overview")) {
	      return "Overview";
	    }
	    return "Builder"; // default fallback
	  };

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const aiAccessMode = getAiAssistantAccessMode();
  const billingBypassEnabled = isDevBillingBypassEnabled();
  const isAiEnabledFlag = aiAccessMode !== "off";
  const isProSubscriber = billingBypassEnabled || (subscription as any)?.status === "active";
  const canUseAiAssistant = aiAccessMode === "all" || (aiAccessMode === "pro" && isProSubscriber);
  const aiUpgradeHref = getAiAssistantUpgradeHref();

  useEffect(() => {
    if (!canUseAiAssistant) setAssistantOpen(false);
  }, [canUseAiAssistant]);

  useEffect(() => {
    if (!collaborationOpen) return;
    setAssistantOpen(false);
  }, [collaborationOpen]);

  if (!itineraryIdValue || !destinationIdValue) {
    return <Loading />;
  }


  // For builder page, show simpler layout without sidebar
  // Commented out to show sidebar on builder page as well
  /*
  if (isBuilderPage) {
    return (
      <div className="flex flex-col h-screen">
        <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b border-stroke-200 bg-bg-0/80 backdrop-blur-xl p-2">
          <div className="flex items-center gap-2 flex-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/itineraries">Itineraries</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getBreadcrumbText()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="gap-2 transition-colors"
              >
                <Share className="size-4" />
                <span>Share</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem className="cursor-pointer">
                <Users className="size-4" />
                <span>Invite Collaborators</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setExportDialogOpen(true)}>
                <Download className="size-4" />
                <span>Export</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
        <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} itineraryId={itineraryId as string} />
      </div>
    );
  }
  */

  const shell = (
    <>
      <AppSidebarItineraryActivityLeft
        useExternalDndContext={enableSharedDnd && sharedDndActive}
      />
      <main className="flex min-w-0 flex-1 w-full">
        <div className="flex min-w-0 flex-1 flex-col w-full">
          <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b border-stroke-200 bg-bg-0/90 backdrop-blur-xl px-2">
            <div className="flex items-center gap-2 flex-1">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/itineraries">Itineraries</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{getBreadcrumbText()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <ItineraryCollaborationTrigger itineraryId={itineraryIdValue} />

            <div className="md:hidden">
              {isAiEnabledFlag && canUseAiAssistant ? (
                <ItineraryAssistantSheet
                  itineraryId={itineraryIdValue}
                  destinationId={destinationIdValue}
                  className="ml-0"
                  onOpenChange={(open) => {
                    if (!open) return;
                    closeCollaboration();
                  }}
                />
              ) : isAiEnabledFlag ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-0 h-9 rounded-xl gap-2"
                  onClick={() => router.push(aiUpgradeHref)}
                >
                  <Lock className="h-4 w-4" />
                  AI
                </Button>
              ) : null}
            </div>
            {isAiEnabledFlag ? (
              canUseAiAssistant ? (
                <Button
                  type="button"
                  variant={assistantOpen ? "default" : "outline"}
                  size="sm"
                  className="hidden md:inline-flex h-9 rounded-xl gap-2"
                  onClick={() => {
                    setAssistantOpen((open) => {
                      const next = !open;
                      if (next) closeCollaboration();
                      return next;
                    });
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  AI
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden md:inline-flex h-9 rounded-xl gap-2"
                  onClick={() => router.push(aiUpgradeHref)}
                  title="Upgrade to Pro to use AI"
                >
                  <Lock className="h-4 w-4" />
                  AI
                </Button>
              )
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="gap-2 transition-colors active:scale-95 active:bg-accent hover:bg-accent/80"
                >
                  <Share className="size-4" />
                  <span>Share</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => openCollaboration("collaborators")}
                >
                  <Users className="size-4" />
                  <span>Invite Collaborators</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setExportDialogOpen(true)}
                >
                  <Download className="size-4" />
                  <span>Export</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <div className="min-w-0 flex-1 w-full">{children}</div>
        </div>
        {collaborationOpen ? <ItineraryCollaborationPanel itineraryId={itineraryIdValue} /> : null}
        {isAiEnabledFlag ? (
          <aside
            className={`hidden md:block sticky top-0 h-screen shrink-0 border-l border-stroke-200 bg-bg-0 overflow-hidden transition-[width] duration-200 ease-out ${
              assistantOpen ? "w-[var(--sidebar-width)]" : "w-0"
            }`}
            aria-hidden={!assistantOpen}
          >
            <div className={`h-full min-h-0 flex flex-col ${!assistantOpen ? "opacity-0 pointer-events-none" : ""}`}>
              <ItineraryAssistantSidebar
                itineraryId={itineraryIdValue}
                destinationId={destinationIdValue}
                isVisible={assistantOpen}
                onClose={() => setAssistantOpen(false)}
              />
            </div>
          </aside>
        ) : null}
      </main>
    </>
  );

  const sharedDndShell =
    enableSharedDnd && SharedDndProvider && sharedDndActive ? <SharedDndProvider>{shell}</SharedDndProvider> : shell;

  return (
    <>
      <SidebarProvider
        defaultOpen={false}
        style={
          {
            "--sidebar-width": "420px",
            "--sidebar-width-icon": "48px",
            "--sidebar-width-mobile": "320px",
          } as CSSProperties
        }
      >
        {sharedDndShell}
    </SidebarProvider>
    <ShareExportDialog
      open={exportDialogOpen}
      onOpenChange={setExportDialogOpen}
      itineraryId={itineraryIdValue}
      destinationId={destinationIdValue}
    />
    </>
  );
}
