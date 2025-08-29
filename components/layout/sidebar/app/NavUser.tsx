"use client";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import LogoutButton from "@/components/button/auth/LogoutButton";

import { BadgeCheck, ChevronsUpDown, LogOut, Settings, Sparkles } from "lucide-react";

import { useUserStore } from "@/store/userStore";
import { useStripeSubscriptionStore } from "@/store/stripeSubscriptionStore";

import { cn } from "@/components/lib/utils";

export function NavUser() {
  const { user, isUserLoading, profileUrl, isProfileUrlLoading } = useUserStore();
  const { subscription, isSubscriptionLoading } = useStripeSubscriptionStore();
  const { isMobile } = useSidebar();

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

  if (isUserLoading || isProfileUrlLoading || isSubscriptionLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="grid flex-1 gap-1 text-left">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="ml-auto h-4 w-4" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {isProfileUrlLoading ? (
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
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {isProfileUrlLoading ? (
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
            <DropdownMenuGroup>
              <Link href={subscription?.status === "active" ? "/settings" : "/pricing"}>
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer",
                    subscription?.status === "active" && "bg-yellow-50 dark:bg-yellow-900/20"
                  )}
                >
                  {isSubscriptionLoading ? (
                    <Skeleton className="h-4 w-4" />
                  ) : subscription?.status === "active" ? (
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex items-center w-full">
                        <Sparkles className="mr-2 h-4 w-4 text-yellow-500 animate-pulse" />
                        <span className="font-medium text-yellow-700 dark:text-yellow-400">Pro Traveler</span>
                        <span className="ml-auto flex items-center text-xs text-yellow-600 dark:text-yellow-500">
                          <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                          {subscription.attrs.plan.interval === "month" ? "Monthly" : "Yearly"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                      <Sparkles className="mr-2 h-4 w-4" />
                      <span>Upgrade to Pro</span>
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-muted">Free</span>
                    </div>
                  )}
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href="/settings">
                <DropdownMenuItem className={"cursor-pointer"}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <LogoutButton>
              <DropdownMenuItem className={"cursor-pointer"}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </LogoutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
