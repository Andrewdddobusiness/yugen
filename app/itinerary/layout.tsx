"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebarItineraryActivityLeft } from "@/components/sidebar/appSidebar/appSidebarItineraryActivityLeft2";
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

import { useCartStore } from "@/store/cartStore";

import { IItineraryActivity, useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, Share, Users } from "lucide-react";
import { ExportDialog } from "@/components/share/exportDialog";
import Loading from "@/components/loading/loading";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { itineraryId, destinationId } = useParams();
  const pathname = usePathname();

  //**** STORES ****//
  const { fetchItineraryActivities, setItineraryActivities } = useItineraryActivityStore();
  const { setUser, setUserLoading, setProfileUrl, setIsProfileUrlLoading } = useUserStore();
  const { setSubscription, setIsSubscriptionLoading } = useStripeSubscriptionStore();
  const { setIsCartOpen, isCartOpen } = useCartStore();

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
  });

  useEffect(() => {
    setUserLoading(isUserLoading);
  }, [isUserLoading, setUserLoading]);

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  //***** GET PROFILE URL *****//
  const { data: profileUrl } = useQuery({
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
        const { data } = await supabase.storage.from("avatars").getPublicUrl(user?.id + "/profile");
        return data.publicUrl;
      }

      // No profile picture exists
      return null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    setProfileUrl(profileUrl || "");
    setIsProfileUrlLoading(false);
  }, [profileUrl]);

  //***** GET SUBSCRIPTION DETAILS *****//
  const { data: subscription, isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: getSubscriptionDetails,
    enabled: !!user,
  });

  useEffect(() => {
    setSubscription(subscription as ISubscriptionDetails);
    setIsSubscriptionLoading(false);
  }, [subscription]);

  //**** GET ITINERARY ACTIVITIES ****//
  const { data: itineraryActivities, isLoading: isItineraryActivitiesLoading } = useQuery({
    queryKey: ["itineraryActivities", itineraryId, destinationId],
    queryFn: () => fetchItineraryActivities(itineraryId as string, destinationId as string),
    enabled: !!itineraryId && !!destinationId,
    staleTime: 0, // Always check for updates
  });

  useEffect(() => {
    if (itineraryActivities) {
      setItineraryActivities(itineraryActivities as IItineraryActivity[]);
    }
  }, [itineraryActivities, setItineraryActivities]);

  console.log("itineraryActivities: ", itineraryActivities);

  const getBreadcrumbText = () => {
    if (pathname.includes("/builder")) {
      return "Builder";
    } else if (pathname.includes("/activities")) {
      return "Explore Activities";
    } else if (pathname.includes("/overview")) {
      return "Overview";
    }
    return "Builder"; // default fallback
  };

  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  if (!itineraryId || !destinationId) {
    return <Loading />;
  }

  return (
    <div className="flex h-screen">
      <SidebarProvider
        defaultOpen={true}
        style={
          {
            "--sidebar-width": "350px",
            "--sidebar-width-icon": "48px", // Width when collapsed
            "--sidebar-width-mobile": "280px",
          } as React.CSSProperties
        }
      >
        <AppSidebarItineraryActivityLeft />
        <SidebarInset>
          <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-2">
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
          <main className="flex-1 overflow-auto">{children}</main>
        </SidebarInset>
      </SidebarProvider>

      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} itineraryId={itineraryId as string} />
    </div>
  );
}
