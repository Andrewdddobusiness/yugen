"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

import LogoutButton from "@/components/button/auth/LogoutButton";
import { useAuth } from "@/components/provider/auth/AuthProvider";
import { useUserStore } from "@/store/userStore";
import { cn } from "@/lib/utils";

import { ArrowRight, Loader2, Menu, Plus } from "lucide-react";

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

export default function MarketingNavigation() {
  const { user, loading } = useAuth();
  const { setUser, setUserLoading } = useUserStore();

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setUserLoading(loading);
    setUser(user ?? null);
  }, [loading, setUser, setUserLoading, user]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const avatarFallback = useMemo(() => {
    const first = (user?.user_metadata?.first_name ?? user?.user_metadata?.full_name ?? "")
      .split(" ")
      .filter(Boolean)[0]?.[0];
    const last = (user?.user_metadata?.last_name ?? user?.user_metadata?.full_name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(1, 2)[0]?.[0];

    const initials = `${first ?? ""}${last ?? ""}`.trim();
    if (initials) return initials.toUpperCase();

    const email = user?.email ?? "";
    return email ? email[0]?.toUpperCase() : "U";
  }, [user]);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 flex flex-row items-center justify-between h-16 px-4 sm:px-12 lg:px-16 z-50 transition-all duration-300",
        scrolled ? "bg-white/80 backdrop-blur-2xl border-b border-stroke-200/60 shadow-card" : "bg-transparent"
      )}
    >
      {/* Mobile Menu Button */}
      <div className="sm:hidden relative z-10">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <button type="button" aria-label="Open menu">
              <Menu className={cn("h-6 w-6 text-brand-600", scrolled && "text-brand-700")} />
            </button>
          </DrawerTrigger>
          <DrawerContent className="h-[98%] bg-gradient-to-b from-brand-700 to-ink-900 text-white border-t-0">
            <div className="flex flex-col h-full px-6 py-10">
              <div className="space-y-6 text-4xl font-semibold">
                <Link href="/" className="block hover:opacity-70 transition-opacity" onClick={() => setOpen(false)}>
                  Home
                </Link>
                <Link
                  href="/pricing"
                  className="block hover:opacity-70 transition-opacity"
                  onClick={() => setOpen(false)}
                >
                  Pricing
                </Link>
                {user ? (
                  <>
                    <Link
                      href="/itineraries"
                      className="block hover:opacity-70 transition-opacity"
                      onClick={() => setOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/settings"
                      className="block hover:opacity-70 transition-opacity"
                      onClick={() => setOpen(false)}
                    >
                      Settings
                    </Link>
                    <div className="block hover:opacity-70 transition-opacity" onClick={() => setOpen(false)}>
                      <LogoutButton className="text-white/70 hover:text-white transition-colors">Logout</LogoutButton>
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="block hover:opacity-70 transition-opacity" onClick={() => setOpen(false)}>
                      Login
                    </Link>
                    <Link href="/signUp" className="block hover:opacity-70 transition-opacity" onClick={() => setOpen(false)}>
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Logo */}
      <Link
        href="/"
        className="flex items-center justify-center gap-2 z-10 absolute left-1/2 -translate-x-1/2 sm:relative sm:left-0 sm:translate-x-0"
      >
        <div className="w-[36px] h-[36px] group cursor-pointer select-none">
          <Image
            className="w-full h-full transition-transform duration-500 ease-in-out transform group-hover:rotate-45"
            src="/assets/yugi-mascot-1.png"
            alt="Planaway Logo"
            width={100}
            height={100}
            priority
            draggable={false}
          />
        </div>
        <span className="hidden sm:inline-block text-lg font-semibold tracking-tight text-ink-900 font-logo">
          Planaway
        </span>
      </Link>

      {/* Desktop Actions */}
      <div className="hidden sm:flex items-center gap-3 relative z-10">
        <Link
          href="/pricing"
          className={cn(
            "text-sm font-medium text-ink-700 hover:text-brand-600 transition-colors",
            scrolled && "text-ink-900 hover:text-brand-500"
          )}
        >
          Pricing
        </Link>

        {loading ? (
          <Button variant="outline" size="sm" className="h-9 rounded-xl" disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading
          </Button>
        ) : user ? (
          <>
            <Link
              href="/itineraries"
              className={cn(
                "text-sm font-medium text-ink-700 hover:text-brand-600 transition-colors",
                scrolled && "text-ink-900 hover:text-brand-500"
              )}
            >
              Dashboard
            </Link>

            <PopUpCreateItinerary>
              <Button
                className={cn(
                  "h-10 shadow-pressable",
                  "bg-brand-500 text-white hover:bg-brand-600 active:shadow-pressable-pressed"
                )}
              >
                <Plus className="size-3.5 mr-1" />
                <span>Create New Itinerary</span>
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </PopUpCreateItinerary>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-12 w-12 rounded-2xl p-1 border border-gray-200 cursor-pointer">
                  {user?.user_metadata?.avatar_url ? (
                    <AvatarImage src={user.user_metadata.avatar_url} className="rounded-xl" />
                  ) : (
                    <AvatarFallback className="rounded-xl bg-muted">{avatarFallback}</AvatarFallback>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <LogoutButton>Logout</LogoutButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="h-9 rounded-xl text-brand-700 hover:bg-bg-0">
                Login
              </Button>
            </Link>
            <Link href="/signUp">
              <Button size="sm" className="h-9 rounded-xl shadow-pressable bg-brand-500 hover:bg-brand-600">
                Sign Up
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Empty div for mobile layout balance */}
      <div className="w-6 sm:hidden relative z-10" />
    </div>
  );
}
