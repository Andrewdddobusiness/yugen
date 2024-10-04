"use client";
import React, { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

import { Home, Settings, Plus, NotebookText, LibraryBig } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "../ui/skeleton";

import ItineraryChoiceDialog from "../dialog/itineraryChoiceDialog";
import LogoutButton from "../buttons/logoutButton";

interface PageLayoutProps {
  title: string;
  children: ReactNode;
  activePage: string;
}

export default function DashboardLayout({
  children,
  activePage,
}: PageLayoutProps): React.ReactElement {
  const supabase = createClient();

  const [profileUrl, setProfileUrl] = useState("");

  useEffect(() => {
    const fetchPublicUrl = async () => {
      try {
        const { auth } = supabase;
        const { data: user, error } = await auth.getUser();
        if (error || !user) {
          throw new Error("User not authenticated");
        }
        const { data } = await supabase.storage
          .from("avatars")
          .getPublicUrl(user.user.id + "/profile");
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
    <div className="h-screen w-full pl-14">
      <nav className="flex items-center justify-between w-full h-15 px-4 bg-white border-b fixed top-0 left-0 z-50">
        <div className="flex justify-start p-2 py-4  hover:text-zinc-500 cursor-pointer transition-all h-[60px]">
          <Link href="/" className="flex items-center justify-center">
            <Image
              src="/smile.svg"
              alt="smile"
              width={50}
              height={50}
              sizes="100vw"
              className="max-w-[25px]"
            />
            <div className="font-Patua text-xl font-bold ml-2 hidden sm:flex">
              Planaway
            </div>
          </Link>
        </div>
        {/* <h1 className="text-xl font-semibold pl-16">{title}</h1> */}
        <div className="ml-auto pr-4">
          <ItineraryChoiceDialog>
            <Plus className="size-3.5 mr-1" />
            <div> Create an Itinerary</div>
          </ItineraryChoiceDialog>
        </div>
        <div className="pr-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="overflow-hidden rounded-full"
              >
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
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogoutButton />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="inset-y fixed left-0 z-20 flex flex-col justify-between h-full border-r bg-white w-20 sm:w-48">
        <nav className="grid gap-1 py-2 px-4 justify-center sm:justify-start mt-16">
          <Link
            href="/dashboard"
            className={`flex items-center justify-center sm:justify-start gap-3 rounded-lg px-3 py-3 transition-all hover:text-primary text-sm h-[40px] w-[40px] sm:w-[160px] ${
              activePage === "home" ? "bg-muted" : ""
            }`}
          >
            <Home className="h-4 w-4" />
            <div className="hidden sm:flex">Home</div>
          </Link>
          <Link
            href="/itineraries"
            className={`flex items-center justify-center sm:justify-start gap-3 rounded-lg px-3 py-3 transition-all hover:text-primary text-sm h-[40px] w-[40px] sm:w-[160px] ${
              activePage === "itineraries" ? "bg-muted" : ""
            }`}
          >
            <NotebookText className="h-4 w-4" />
            <div className="hidden sm:flex">Itineraries</div>
          </Link>
          <Link
            href="/explore"
            className={`flex items-center justify-center sm:justify-start gap-3 rounded-lg px-3 py-3 transition-all hover:text-primary text-sm h-[40px] w-[40px] sm:w-[160px] ${
              activePage === "explore" ? "bg-muted" : ""
            }`}
          >
            <LibraryBig className="h-4 w-4" />
            <div className="hidden sm:flex">Explore</div>
          </Link>
        </nav>

        {/* Footer Navigation */}
        <nav className="grid gap-1 py-2 px-4 justify-center sm:justify-start">
          <Link
            href="/settings"
            className={`flex items-center justify-center mt-auto sm:justify-start gap-3 rounded-lg px-3 py-3 transition-all hover:text-primary text-sm h-[40px] w-[40px] sm:w-[160px] ${
              activePage === "settings" ? "bg-muted" : ""
            }`}
            style={{ marginTop: "auto" }}
          >
            <Settings className="h-4 w-4" />
            <div className="hidden sm:flex">Settings</div>
          </Link>
        </nav>
      </aside>

      <div className="pl-[24px] sm:pl-[135px] pt-[61px]">{children}</div>
    </div>
  );
}
