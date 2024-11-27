"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Binoculars, Command, NotebookPen, SquareChevronLeft, TextSearch } from "lucide-react";
import { cn } from "@/components/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

import { NavUser } from "./navUser";
import ItineraryList from "@/components/list/itineraryList";

export function AppSidebarItineraryActivityLeft() {
  const { itineraryId, destinationId } = useParams();
  const { setOpen } = useSidebar();
  const pathname = usePathname();

  const navItems = [
    {
      title: "Back",
      icon: SquareChevronLeft,
      href: "/itineraries",
    },
    {
      title: "Overview",
      icon: TextSearch,
      href: `/itinerary/${itineraryId}/${destinationId}/overview`,
    },
    {
      title: "Explore",
      icon: Binoculars,
      href: `/itinerary/${itineraryId}/${destinationId}/activities`,
    },
    {
      title: "Build",
      icon: NotebookPen,
      href: `/itinerary/${itineraryId}/${destinationId}/builder`,
    },
  ];

  return (
    <Sidebar collapsible="icon" className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row">
      {/* Icon Sidebar */}
      <Sidebar collapsible="none" className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0 mt-1">
                <Link href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Journey</span>
                    <span className="truncate text-xs">Free</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => setOpen(true)}
                      asChild
                      className={cn(
                        pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground",
                        "transition-colors"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      {/* Content Sidebar */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="p-4">
          <div className="text-base font-medium text-foreground">Itinerary List</div>
        </SidebarHeader>
        <SidebarContent>
          <div className="h-full w-full">
            <ItineraryList />
          </div>
        </SidebarContent>
      </Sidebar>

      <SidebarRail />
    </Sidebar>
  );
}
