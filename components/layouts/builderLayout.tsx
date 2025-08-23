"use client";
import React, { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { createClient } from "@/utils/supabase/client";

import { Settings, CircleChevronLeft, TextSearch, Hammer, Footprints } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

import ItineraryChoiceDialog from "../shared/ItineraryChoiceDialog";
import { Skeleton } from "../ui/skeleton";
import LogoutButton from "../buttons/LogoutButton";
import { useSearchParams } from "next/navigation";

interface PageLayoutProps {
  title: string;
  children: ReactNode;
  activePage: string;
  itineraryNumber: number;
}

export default function BuilderLayout({
  title,
  children,
  activePage,
  itineraryNumber,
}: PageLayoutProps): React.ReactElement {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const itineraryId = searchParams.get("i");
  const destinationId = searchParams.get("d");

  const [profileUrl, setProfileUrl] = useState("");

  useEffect(() => {
    const fetchPublicUrl = async () => {
      try {
        const { auth } = supabase;
        const { data: user, error } = await auth.getUser();
        if (error || !user) {
          throw new Error("User not authenticated");
        }
        const { data } = await supabase.storage.from("avatars").getPublicUrl(user.user.id + "/profile");
        if (error || !data) {
          throw new Error("Error fetching public URL");
        }
        setProfileUrl(data.publicUrl);
      } catch (error: any) {
        console.error("Error fetching public URL:", error.message);
      }
    };

    fetchPublicUrl();

    return () => {};
  }, [supabase]);

  return (
    <div className="h-screen w-full z-50">
      {/* Sidebar */}
      <aside className="absolute left-0 z-50 flex h-full flex-col border-r">
        {/* Logo/Home Button */}
        <div className="p-2 bg-white border-b">
          <Link href="/itineraries" legacyBehavior>
            <Button variant="outline" size="icon" aria-label="Home">
              <div className="hidden sm:block max-w-[25px]">
                <Image src="/smile.svg" alt="smile" width={50} height={50} sizes="100vw" priority />
              </div>
            </Button>
          </Link>
        </div>

        <nav className="grid gap-1 p-2 bg-white ">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild className="border-b pb-1">
                <Link href="/itineraries">
                  <Button variant="ghost" size="icon" aria-label="Back">
                    <CircleChevronLeft className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                Back
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/itinerary/overview?i=${itineraryId}&d=${destinationId}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${activePage === "overview" ? "bg-muted" : ""}`}
                    aria-label="Itineraries"
                  >
                    <TextSearch className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                Overview
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/itinerary/builder?i=${itineraryId}&d=${destinationId}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${activePage === "explore" ? "bg-muted" : ""}`}
                    aria-label="Explore"
                  >
                    <Hammer className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                Itinerary Builder
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/itinerary/activities?i=${itineraryId}&d=${destinationId}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${activePage === "explore" ? "bg-muted" : ""}`}
                    aria-label="Explore"
                  >
                    <Footprints className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                Explore Activities
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>

        {/* Footer Navigation */}
        <nav className="mt-auto grid gap-1 p-2 bg-white">
          <TooltipProvider>
            {/* Settings Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings/profile">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`mt-auto rounded-lg ${activePage === "settings" ? "bg-muted" : ""}`}
                    aria-label="Settings"
                  >
                    <Settings className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                Settings
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>
      </aside>

      <div className="flex flex-col flex-1 ">
        <nav className="flex items-center justify-between w-full h-16 px-4 bg-white border-b fixed top-0 left-0 z-20">
          <h1 className="text-xl font-semibold ml-16">{title}</h1>
          <div className="ml-auto pr-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                  {profileUrl ? (
                    <Image
                      alt="Profile"
                      src={profileUrl ? profileUrl : ""}
                      width={100}
                      height={100}
                      className="w-10 h-10 rounded-full"
                      priority
                    />
                  ) : (
                    <Skeleton className="h-[32px] w-[32px] rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <span>My Account</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogoutButton />
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>
      <div className="h-screen ml-14">{children}</div>
    </div>
  );
}
