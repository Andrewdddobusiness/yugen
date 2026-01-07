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
import { LogOut, Settings } from "lucide-react";

export function NavUserIcon() {
  const { user, isUserLoading, profileUrl, isProfileUrlLoading } = useUserStore();
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

  const loading = isUserLoading || isProfileUrlLoading;

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
