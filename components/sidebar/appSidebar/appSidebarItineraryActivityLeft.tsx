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
import { NavMainItineraryActivity } from "./navMainItineraryActivity";



export function AppSidebarItineraryActivityLeft() {
  return (
    <Sidebar side={"left"} variant="inset" collapsible="icon" className="shadow-md bg-white z-30">
      <SidebarHeader className="bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className=" group-data-[collapsible=icon]:group-data-[state=expanded]:flex grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Journey</span>
                  <span className="truncate text-xs">Free</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <NavMainItineraryActivity />
      </SidebarContent>

      <SidebarFooter className="bg-white">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
