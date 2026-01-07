"use client";

import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import LogoutButton from "@/components/button/auth/LogoutButton";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/userStore";
import { useStripeSubscriptionStore } from "@/store/stripeSubscriptionStore";
import { BadgeCheck, LogOut, Settings, Sparkles } from "lucide-react";

export function NavUserIcon() {
  const { user, isUserLoading, profileUrl, isProfileUrlLoading } = useUserStore();
  const { subscription, isSubscriptionLoading } = useStripeSubscriptionStore();
  const { isMobile } = useSidebar();
  const billingHref = "/settings?tab=billing";

  const userDisplayName = user?.user_metadata?.first_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ""}`
    : user?.email?.split("@")[0] || "User";

  const userEmail = user?.email || "";
  const userInitials = userDisplayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const loading = isUserLoading || isProfileUrlLoading || isSubscriptionLoading;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "mx-auto flex h-8 w-8 items-center justify-center rounded-xl",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            "active:scale-[0.98]"
          )}
          aria-label="User menu"
        >
          {loading ? (
            <Skeleton className="h-7 w-7 rounded-full" />
          ) : (
            <Avatar className="h-7 w-7 rounded-full">
              {profileUrl ? (
                <AvatarImage src={profileUrl} />
              ) : (
                <AvatarFallback className="text-[10px] font-semibold leading-none">{userInitials}</AvatarFallback>
              )}
            </Avatar>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="end" sideOffset={8} className="min-w-56">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
            <Avatar className="h-9 w-9 rounded-lg">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : profileUrl ? (
                <AvatarImage src={profileUrl} />
              ) : (
                <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
              )}
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{userDisplayName}</span>
              <span className="truncate text-xs">{userEmail}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href={billingHref}>
          <DropdownMenuItem
            className={cn(
              "cursor-pointer",
              subscription?.status === "active" && "bg-yellow-50 dark:bg-yellow-900/20"
            )}
          >
            {loading ? (
              <Skeleton className="h-4 w-32" />
            ) : subscription?.status === "active" ? (
              <div className="flex items-center gap-2 w-full">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-yellow-700 dark:text-yellow-400">Pro Traveler</span>
                <span className="ml-auto flex items-center text-xs text-yellow-600 dark:text-yellow-500">
                  <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                  {subscription?.attrs?.plan?.interval === "month" ? "Monthly" : "Yearly"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-full">
                <Sparkles className="h-4 w-4" />
                <span>Upgrade to Pro</span>
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-muted">Free</span>
              </div>
            )}
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <Link href="/settings">
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <LogoutButton>
          <DropdownMenuItem className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </LogoutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
