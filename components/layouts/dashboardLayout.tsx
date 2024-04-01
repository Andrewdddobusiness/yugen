import React, { ReactNode } from "react";
import {
  Home,
  Settings,
  Plus,
  NotebookText,
  LibraryBig,
  CircleUserRound,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import ItineraryChoiceDialog from "../dialog/itineraryChoiceDialog";

interface PageLayoutProps {
  title: string;
  children: ReactNode;
  activePage: string;
}

export default function DashboardLayout({
  title,
  children,
  activePage,
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
        {/* Navigation */}
        <nav className="grid gap-1 p-2">
          <TooltipProvider>
            {/* Home Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${
                      activePage === "home" ? "bg-muted" : ""
                    }`}
                    aria-label="Home"
                  >
                    <Home className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                Home
              </TooltipContent>
            </Tooltip>
            {/* Itineraries Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/itineraries">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${
                      activePage === "itineraries" ? "bg-muted" : ""
                    }`}
                    aria-label="Itineraries"
                  >
                    <NotebookText className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                Itineraries
              </TooltipContent>
            </Tooltip>
            {/* Explore Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/explore">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${
                      activePage === "explore" ? "bg-muted" : ""
                    }`}
                    aria-label="Explore"
                  >
                    <LibraryBig className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                Explore
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
            {/* Profile Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/settings/profile">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`mt-auto rounded-lg ${
                      activePage === "setting" ? "bg-muted" : ""
                    }`}
                    aria-label="Setting"
                  >
                    <CircleUserRound className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                Profile
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>
      </aside>

      {/* Main Content */}

      <div className="flex flex-col flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b bg-background px-4">
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="ml-auto">
            <ItineraryChoiceDialog>
              <Button variant="default" size="sm" className="gap-1.5 text-sm">
                <Plus className="size-3.5" />
                Create an Itinerary
              </Button>
            </ItineraryChoiceDialog>
          </div>
        </header>
      </div>

      {children}
    </div>
  );
}
