"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarItineraryActivityLeft } from "@/components/sidebar/appSidebar/appSidebarItineraryActivityLeft";

import { getSubscriptionDetails } from "@/actions/stripe/actions";

import { useUserStore } from "@/store/userStore";
import { useStripeSubscriptionStore, ISubscriptionDetails } from "@/store/stripeSubscriptionStore";
import { createClient } from "@/utils/supabase/client";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/lib/utils";
import { LayoutList } from "lucide-react";
import { useCartStore } from "@/store/cartStore";

export default function Layout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="flex w-full">
      <SidebarProvider panelType={"left"}>
        <AppSidebarItineraryActivityLeft />

        <main className="flex flex-col flex-1 min-h-[calc(100vh_-_theme(spacing.16))] bg-muted relative">
          <SidebarTrigger
            className={cn(
              "mt-2 -ml-[1px] bg-white absolute top-0 z-20 transition-all duration-300 rounded-l-none",
              "shadow-[2px_2px_5px_rgba(0,0,0,0.1)]",
              isCartOpen ? "left-[400px]" : "left-0"
            )}
          />
          <div
            className={cn(
              "mt-2 -ml-[1px] bg-white absolute top-12 z-20 transition-all duration-300 rounded-r-md",
              "shadow-[2px_2px_5px_rgba(0,0,0,0.1)]",
              isCartOpen ? "left-[400px]" : "left-0"
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className={cn("w-10 h-10 rounded-l-none", "[&>svg]:h-5 [&>svg]:w-5")}
              onClick={() => setIsCartOpen(!isCartOpen)}
            >
              <LayoutList size={20} />
              <span className="sr-only">Toggle Activity Cart</span>
            </Button>
          </div>
          {children}
        </main>
      </SidebarProvider>
    </div>
  );
}
