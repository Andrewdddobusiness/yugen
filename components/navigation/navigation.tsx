"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { Menu, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
  navigationMenuTriggerStyle2,
} from "@/components/ui/navigation-menu";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "../ui/button";
import LogoutButton from "../buttons/logoutButton";
import PopUpCreateItinerary from "../popUp/popUpCreateItinerary";

export default function Navigation() {
  const supabase = createClient();
  const [user, setUser] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const { auth } = supabase;
      const { data: user, error } = await auth.getUser();
      if (error || !user) {
        throw new Error("User not authenticated");
      } else {
        setUser(user);
      }

      const { data } = await supabase.storage.from("avatars").getPublicUrl(user.user.id + "/profile");
      if (error || !data) {
        throw new Error("Error fetching public URL");
      } else {
        setProfileUrl(data.publicUrl);
      }
    } catch (error: any) {
      console.error("Error fetching public URL:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const renderAuthSection = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      );
    }

    if (user) {
      return (
        <>
          <NavigationMenu className="mr-4">
            <NavigationMenuList className="flex space-x-4">
              <NavigationMenuItem>
                <NavigationMenuLink href="/pricing" className={navigationMenuTriggerStyle()}>
                  Pricing
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <div className="ml-auto pr-4">
            <PopUpCreateItinerary>
              <Button className="w-full">
                <Plus className="size-3.5 mr-1" />
                <span>Create new Itinerary</span>
              </Button>
            </PopUpCreateItinerary>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                <Image
                  alt="Avatar"
                  src={profileUrl ? profileUrl : ""}
                  width={100}
                  height={100}
                  className="w-10 h-10 rounded-full"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href={"/itineraries"}>
                <DropdownMenuItem className="cursor-pointer">Dashboard</DropdownMenuItem>
              </Link>
              <Link href={"/settings"}>
                <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer">Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <LogoutButton>Logout</LogoutButton>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
    }

    return (
      <NavigationMenu>
        <NavigationMenuList className="flex space-x-4">
          <NavigationMenuItem>
            <NavigationMenuLink href="/" className={navigationMenuTriggerStyle()}>
              Pricing
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/login" className={navigationMenuTriggerStyle()}>
              Login
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/signUp" className={navigationMenuTriggerStyle2()}>
              Sign Up
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );
  };

  return (
    <div className="fixed top-0 left-0 right-0 flex flex-row items-center justify-between h-16 px-4 sm:px-8 shadow-sm bg-white z-50">
      <div className="flex flex-row items-center">
        <div className="hidden sm:block max-w-[35px]">
          <Image src="/smile.svg" alt="smile" width={100} height={100} sizes="100vw" />
        </div>
        <div className="flex items-center font-Patua text-xl font-bold ml-2">
          <Link href={"/"}>Journey</Link>
        </div>
      </div>
      <div className="hidden sm:flex flex-row items-center">{renderAuthSection()}</div>
      <div className="sm:hidden">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Menu className="h-6 w-6" />
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Edit profile</DrawerTitle>
              <DrawerDescription>Make changes to your profile here. Click save when you&aposre done.</DrawerDescription>
            </DrawerHeader>

            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
