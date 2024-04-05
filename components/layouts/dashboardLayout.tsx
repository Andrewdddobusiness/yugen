import React, { ReactNode } from "react";
import {
  Home,
  Settings,
  Plus,
  NotebookText,
  LibraryBig,
  CircleUserRound,
} from "lucide-react";

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
    <div className="h-screen w-full pl-14 ">
      {/* Sidebar */}
      <aside className="inset-y fixed left-0 z-20 flex h-full flex-col border-r bg-white w-40">
        {/* Logo/Home Button */}
        <div className="border-b p-2">
          <Link href="/" legacyBehavior>
            <Button variant="outline" aria-label="Home">
              <div className="flex flex-row ">
                <Image
                  src="/smile.svg"
                  alt="smile"
                  width={50}
                  height={50}
                  sizes="100vw"
                  className="max-w-[25px]"
                />
              </div>
              <div className="font-Patua text-xl font-bold ml-2">yugen</div>
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="grid gap-1 py-2 px-4">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary text-sm  ${
              activePage === "home" ? "bg-muted" : ""
            }`}
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link
            href="/itineraries"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary text-sm ${
              activePage === "itineraries" ? "bg-muted" : ""
            }`}
          >
            <NotebookText className="h-4 w-4" />
            Itineraries
          </Link>
          <Link
            href="/explore"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary text-sm ${
              activePage === "explore" ? "bg-muted" : ""
            }`}
          >
            <LibraryBig className="h-4 w-4" />
            Explore
          </Link>
        </nav>
        {/* Footer Navigation */}
        <nav className="mt-auto grid gap-1 py-2 px-4">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary text-sm ${
              activePage === "settings" ? "bg-muted" : ""
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <Link
            href="/settings/profile"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary text-sm ${
              activePage === "profile" ? "bg-muted" : ""
            }`}
          >
            <CircleUserRound className="h-4 w-4" />
            Profile
          </Link>
        </nav>
      </aside>

      <div className="flex flex-col flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-1 border-b bg-background ml-[104px]">
          <h1 className="text-xl font-semibold pl-4">{title}</h1>
          <div className="ml-auto pr-4">
            <ItineraryChoiceDialog>
              <Button variant="default" size="sm" className="gap-1.5 text-sm ">
                <Plus className="size-3.5" />
                Create an Itinerary
              </Button>
            </ItineraryChoiceDialog>
          </div>
        </header>
      </div>
      <div className="ml-[104px]">{children}</div>
    </div>
  );
}
