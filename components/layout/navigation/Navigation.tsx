"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";

import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
  navigationMenuTriggerStyle2,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import LogoutButton from "@/components/button/auth/LogoutButton";

import { Loader2, Menu, Plus } from "lucide-react";

import { useUserStore } from "@/store/userStore";
import { ISubscriptionDetails, useStripeSubscriptionStore } from "@/store/stripeSubscriptionStore";

import { getSubscriptionDetailsClient } from "@/lib/billing/subscriptionClient";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

const PopUpCreateItinerary = dynamic(() => import("@/components/dialog/itinerary/CreateItineraryDialog"), {
  ssr: false,
  loading: () => (
    <Button
      className={cn(
        "w-full h-10 shadow-pressable",
        "bg-brand-500 text-white hover:bg-brand-600 active:shadow-pressable-pressed"
      )}
      disabled
    >
      <Loader2 className="size-3.5 mr-2 animate-spin" />
      <span>Loading...</span>
    </Button>
  ),
});

export default function Navigation() {
  //***** STORES *****//
  const { setUser, setUserLoading, setProfileUrl, setIsProfileUrlLoading } = useUserStore();
  const { setSubscription, setIsSubscriptionLoading } = useStripeSubscriptionStore();

  //***** STATES *****//
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    setUserLoading(isUserLoading);
  }, [isUserLoading, setUserLoading]);

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  useEffect(() => {
    if (!user) return;

    // Prefetch the create-itinerary dialog so the CTA opens instantly.
    const preload = () => {
      void import("@/components/dialog/itinerary/CreateItineraryDialog");
    };

    if (typeof window === "undefined") return;
    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(preload, { timeout: 1000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }

    const id: ReturnType<typeof setTimeout> = setTimeout(preload, 0);
    return () => clearTimeout(id);
  }, [user]);

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
    queryFn: getSubscriptionDetailsClient,
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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
  }, [setSubscription, subscription]);

  const renderAuthSection = () => {
    if (isUserLoading || isProfileUrlLoading || isSubscriptionLoading) {
      return (
        <NavigationMenu>
          <NavigationMenuList className="flex space-x-4">
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/pricing"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "text-brand-600 hover:text-brand-700 focus:text-brand-700 active:text-brand-700 focus:border-brand-400",
                  scrolled && "text-ink-900 hover:text-brand-700"
                )}
              >
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Skeleton className="h-9 w-[60px] rounded-xl" />
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Skeleton className="h-9 w-[70px] rounded-xl" />
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      );
    }

    if (user) {
      return (
        <>
          <NavigationMenu className="mr-4">
            <NavigationMenuList className="flex space-x-4">
              <NavigationMenuItem>
              <NavigationMenuLink
                href="/pricing"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "text-ink-700 font-medium",
                  "hover:text-brand-600",
                  "focus:text-brand-600",
                  "transition-colors duration-200",
                  scrolled && "text-ink-900 hover:text-brand-500"
                )}
              >
                  Pricing
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <div className="ml-auto pr-4">
            <PopUpCreateItinerary>
              <Button
                className={cn(
                  "w-full h-10 shadow-pressable",
                  "bg-brand-500 text-white hover:bg-brand-600 active:shadow-pressable-pressed"
                )}
              >
                <Plus className="size-3.5 mr-1" />
                <span>Create New Itinerary</span>
              </Button>
            </PopUpCreateItinerary>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-12 w-12 rounded-2xl p-1 border border-gray-200 cursor-pointer">
                {isProfileUrlLoading ? (
                  <Skeleton className="h-full w-full rounded-xl" />
                ) : profileUrl ? (
                  <AvatarImage src={profileUrl} className="rounded-xl" />
                ) : (
                  <AvatarFallback className="rounded-xl bg-muted">
                    {user?.user_metadata.first_name?.[0]}
                    {user?.user_metadata.last_name?.[0]}
                  </AvatarFallback>
                )}
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href={"/itineraries"}>
                <DropdownMenuItem className="cursor-pointer">Dashboard</DropdownMenuItem>
              </Link>
              <Link href={"/settings"}>
                <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer">Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <LogoutButton>Logout</LogoutButton>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
    }

    return (
      <NavigationMenu>
          <NavigationMenuList className="flex space-x-4">
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/pricing"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "text-brand-600 hover:text-brand-700",
                  scrolled && "text-ink-900 hover:text-brand-600"
                )}
              >
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/login"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "text-brand-600 hover:text-brand-700 focus:text-brand-700 active:text-brand-700",
                  scrolled && "text-ink-900 hover:text-brand-600"
                )}
              >
                Login
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="/signUp"
                className={cn(
                  navigationMenuTriggerStyle2(),
                  "bg-brand-500 text-white shadow-pressable hover:bg-brand-600 active:shadow-pressable-pressed",
                  "h-9"
                )}
              >
                Sign Up
              </NavigationMenuLink>
            </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 flex flex-row items-center justify-between h-16 px-4 sm:px-12 lg:px-16 z-50 transition-all duration-300",
        scrolled ? "bg-white/80 backdrop-blur-2xl border-b border-stroke-200/60 shadow-card" : "bg-transparent"
      )}
    >
      {/* Mobile Menu Button - Left Side */}
      <div className="sm:hidden relative z-10">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Menu className={cn("h-6 w-6 text-brand-600", scrolled && "text-brand-700")} />
          </DrawerTrigger>
          <DrawerContent className="h-[98%] bg-gradient-to-b from-brand-700 to-ink-900 text-white border-t-0">
            <div className="flex flex-col h-full px-6 py-10">
              {/* Navigation Links */}
              <div className="space-y-6 text-4xl font-semibold">
                <Link href="/" className="block hover:opacity-70 transition-opacity">
                  Home
                </Link>
                <Link href="/pricing" className="block hover:opacity-70 transition-opacity">
                  Pricing
                </Link>
                {user ? (
                  <>
                    <Link href="/itineraries" className="block hover:opacity-70 transition-opacity">
                      Dashboard
                    </Link>
                    <Link href="/settings" className="block hover:opacity-70 transition-opacity">
                      Settings
                    </Link>
                    <div className="block hover:opacity-70 transition-opacity">Support</div>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="block hover:opacity-70 transition-opacity">
                      Login
                    </Link>
                    <Link href="/signUp" className="block hover:opacity-70 transition-opacity">
                      Sign Up
                    </Link>
                  </>
                )}
              </div>

              {/* Bottom Section */}
              {user && (
                <div className="mt-auto">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-12 w-12 rounded-2xl p-1 border border-gray-200 cursor-pointer">
                      {isProfileUrlLoading ? (
                        <Skeleton className="h-full w-full rounded-xl" />
                      ) : profileUrl ? (
                        <AvatarImage src={profileUrl} />
                      ) : (
                        <AvatarFallback className="bg-white/10 rounded-xl">
                          {user?.user_metadata.first_name?.[0]}
                          {user?.user_metadata.last_name?.[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {user?.user_metadata.first_name} {user?.user_metadata.last_name}
                      </div>
                      <div className="text-sm text-white/70">{user?.email}</div>
                    </div>
                  </div>
                  <LogoutButton className="text-white/70 hover:text-white transition-colors">Logout</LogoutButton>
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Logo - Centered on mobile, left-aligned on desktop */}
      <Link
        href="/"
        className="flex items-center justify-center gap-2 z-10 absolute left-1/2 -translate-x-1/2 sm:relative sm:left-0 sm:translate-x-0"
      >
        <div className="w-[36px] h-[36px] group cursor-pointer select-none">
          <Image
            className="w-full h-full transition-transform duration-500 ease-in-out transform group-hover:rotate-45"
            src="/assets/yugi-mascot-1.png"
            alt="Yugi Logo"
            width={100}
            height={100}
            priority
            draggable={false}
          />
        </div>
        <span className="hidden sm:inline-block text-lg font-semibold tracking-tight text-ink-900 font-logo">
          Yugi
        </span>
      </Link>

      {/* Desktop Navigation - Right Side */}
      <div className="hidden sm:flex flex-row items-center relative z-10">{renderAuthSection()}</div>

      {/* Empty div for mobile layout balance */}
      <div className="w-6 sm:hidden relative z-10"></div>
    </div>
  );
}
