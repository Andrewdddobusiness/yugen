"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

import { Command, Plus } from "lucide-react";

import { NavMain } from "@/components/sidebar/appSidebar/navMain";
import { NavUser } from "@/components/sidebar/appSidebar/navUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/loading/loadingSpinner";

// Dynamically import PopUpCreateItinerary with no SSR
const PopUpCreateItinerary = dynamic(() => import("@/components/popUp/popUpCreateItinerary"), {
  ssr: false,
  loading: () => (
    <Button disabled className="w-full">
      <LoadingSpinner />
    </Button>
  ),
});

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props} className="shadow-md bg-white" sidebarWidth="18rem">
      <SidebarHeader className="bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
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
      <SidebarContent className="bg-white">
        <div className="flex w-full px-4 mt-2">
          <PopUpCreateItinerary className="w-full">
            <Button className="w-full">
              <Plus className="size-3.5 mr-1" />
              <span>Create new Itinerary</span>
            </Button>
          </PopUpCreateItinerary>
        </div>
        <NavMain />
      </SidebarContent>

      <SidebarFooter className="bg-white">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
