import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  Settings,
  Plus,
  CircleUserRound,
  CircleChevronLeft,
  TextSearch,
  Hammer,
  Footprints,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import ItineraryChoiceDialog from "../dialog/itineraryChoiceDialog";

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
  return (
    <div className="h-screen w-full pl-14">
      {/* Sidebar */}
      <aside className="inset-y fixed left-0 z-20 flex h-full flex-col border-r">
        {/* Logo/Home Button */}
        <div className="border-b p-2">
          <Link href="/dashboard" legacyBehavior>
            <Button variant="outline" size="icon" aria-label="Home">
              <div className="hidden sm:block max-w-[25px]">
                <Image
                  src="/smile.svg"
                  alt="smile"
                  width={50}
                  height={50}
                  sizes="100vw"
                />
              </div>
            </Button>
          </Link>
        </div>

        <nav className="grid gap-1 p-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild className="border-b pb-1">
                <Link href="/dashboard">
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
                <Link href={`/itinerary/${itineraryNumber}/overview`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${
                      activePage === "overview" ? "bg-muted" : ""
                    }`}
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
                <Link href={`/itinerary/${itineraryNumber}/builder`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${
                      activePage === "explore" ? "bg-muted" : ""
                    }`}
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
                <Link href={`/itinerary/${itineraryNumber}/activities`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${
                      activePage === "explore" ? "bg-muted" : ""
                    }`}
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
        <nav className="mt-auto grid gap-1 p-2">
          <TooltipProvider>
            {/* Settings Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings/profile">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`mt-auto rounded-lg ${
                      activePage === "settings" ? "bg-muted" : ""
                    }`}
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

      <div className="flex flex-col flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b bg-background">
          <h1 className="text-xl font-semibold pl-4">{title}</h1>
          <div className="ml-auto  pr-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="overflow-hidden rounded-full"
                >
                  <Image
                    src="/placeholder-user.jpg"
                    width={36}
                    height={36}
                    alt="Avatar"
                    className="overflow-hidden rounded-full"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      </div>

      {children}
    </div>
  );
}
