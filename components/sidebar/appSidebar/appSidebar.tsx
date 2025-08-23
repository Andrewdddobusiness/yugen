"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

import { Command, Plus } from "lucide-react";

import { useStripeSubscriptionStore } from "@/store/stripeSubscriptionStore";

import { NavMain } from "@/components/sidebar/appSidebar/NavMain";
import { NavUser } from "@/components/sidebar/appSidebar/NavUser";
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
import LoadingSpinner from "@/components/loading/LoadingSpinner";

// Dynamically import PopUpCreateItinerary with no SSR
const PopUpCreateItinerary = dynamic(() => import("@/components/popUp/PopUpCreateItinerary"), {
  ssr: false,
  loading: () => (
    <Button
      disabled
      className="w-full bg-[#3A86FF] text-white rounded-xl shadow-md hover:bg-[#3A86FF]/80 transition-all duration-300 active:scale-95"
    >
      <LoadingSpinner />
    </Button>
  ),
});

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { subscription } = useStripeSubscriptionStore();

  return (
    <Sidebar variant="inset" {...props} className="shadow-md bg-white">
      <SidebarHeader className="bg-white">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex items-center justify-center">
                  <div className="w-[35px] h-[35px]">
                    <Image
                      className="w-full h-full"
                      src="/journey1.svg"
                      alt="Journey Logo"
                      width={100}
                      height={100}
                      priority
                      draggable={false}
                    />
                  </div>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-sm font-bold text-[#3A86FF]">Journey</span>
                  <span className="truncate text-xs text-gray-500">
                    {subscription?.status === "active" ? "Pro Traveler" : "Free"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-white">
        <div className="flex w-full px-4 mt-2">
          <PopUpCreateItinerary className="w-full">
            <Button className="w-full bg-[#3A86FF] text-white rounded-xl shadow-md hover:bg-[#3A86FF]/80 transition-all duration-300 active:scale-95">
              <Plus className="size-3.5 mr-1" />
              <span>Create New Itinerary</span>
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
