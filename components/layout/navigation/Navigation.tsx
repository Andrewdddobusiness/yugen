"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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

import LogoutButton from "@/components/buttons/LogoutButton";
import PopUpCreateItinerary from "@/components/popUp/PopUpCreateItinerary";

import { Menu, Plus } from "lucide-react";

import { useUserStore } from "@/store/userStore";
import { ISubscriptionDetails, useStripeSubscriptionStore } from "@/store/stripeSubscriptionStore";

import { getSubscriptionDetails } from "@/actions/stripe/actions";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

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
    setIsProfileUrlLoading(false);
  }, [profileUrl]);

  //***** GET SUBSCRIPTION DETAILS *****//
  const { data: subscription, isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: () => getSubscriptionDetails(user?.id as string),
    enabled: !!user?.id,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    setSubscription(subscription as ISubscriptionDetails);
    setIsSubscriptionLoading(false);
  }, [subscription]);

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
                  "text-[#FFBE0B]",
                  "hover:text-[#FFBE0B]/80",
                  "focus:text-[#FFBE0B]",
                  "active:text-[#FFBE0B]",
                  "focus:border-[#FFBE0B]",
                  scrolled && "text-[#fff] hover:text-[#fff]/80"
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
                    "text-gray-700 font-medium",
                    "hover:text-blue-600",
                    "focus:text-blue-600",
                    "transition-colors duration-200",
                    scrolled && "text-white hover:text-blue-200"
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
                  "w-full rounded-xl",

                  "text-[#fff] bg-[#3A86FF] hover:bg-[#3A86FF]/80 hover:scale-105 shadow-lg transition-all duration-300 h-9"
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
                "text-[#FFBE0B]",
                "hover:text-[#FFBE0B]/80",
                scrolled && "text-[#fff] hover:text-[#fff]/80"
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
                "text-[#FF006E]",
                "hover:text-[#FF006E]/80",
                "focus:text-[#FF006E]",
                "active:text-[#FF006E]",
                "focus:border-[#FF006E]",
                scrolled && "text-[#fff] hover:text-[#fff]/80"
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
                "bg-[#3A86FF]",
                "text-white",
                "hover:text-white/80",
                "focus:text-white",
                "active:text-white",
                "focus:bg-[#3A86FF]",
                "active:bg-[#3A86FF]",
                "h-9",
                "shadow-lg"
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
        "fixed top-0 left-0 right-0 flex flex-row items-center justify-between h-16 px-4 sm:px-32 pb-8 sm:pb-0 z-50 pt-8 transition-all duration-300",
        scrolled && "bg-[#032bc0]"
      )}
    >
      {/* Glass wave effect */}
      <div
        className={cn(
          "absolute bottom-0 left-0 w-full h-[40px] transition-all duration-300 opacity-0 translate-y-full hidden sm:block",
          scrolled && "opacity-100"
        )}
      >
        <Image
          src="/home/blueWave.svg"
          alt="Wave Border"
          width={1920}
          height={120}
          className="absolute inset-0 w-full h-full rotate-180"
        />
      </div>

      {/* Mobile Menu Button - Left Side */}
      <div className="sm:hidden relative z-10">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Menu className={cn("h-6 w-6 text-[#3A86FF]", scrolled && "text-white")} />
          </DrawerTrigger>
          <DrawerContent className="h-[98%] bg-primary text-white bg-[#032bc0] bg-opacity-70">
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
        className="flex items-center justify-center z-10 absolute left-1/2 -translate-x-1/2 sm:relative sm:left-0 sm:translate-x-0"
      >
        <div className="w-[35px] h-[35px] group cursor-pointer select-none">
          <Image
            className="w-full h-full transition-transform duration-500 ease-in-out transform group-hover:rotate-45"
            src="/journey1.svg"
            alt="Journey Logo"
            width={100}
            height={100}
            priority
            draggable={false}
          />
        </div>
      </Link>

      {/* Desktop Navigation - Right Side */}
      <div className="hidden sm:flex flex-row items-center relative z-10">{renderAuthSection()}</div>

      {/* Empty div for mobile layout balance */}
      <div className="w-6 sm:hidden relative z-10"></div>
    </div>
  );
}
