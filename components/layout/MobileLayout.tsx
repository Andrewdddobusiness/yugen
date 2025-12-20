import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  Home,
  Settings,
  Plus,
  NotebookText,
  LibraryBig,
  CircleUserRound,
} from "lucide-react";

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

import ItineraryChoiceDialog from "@/components/dialog/itinerary/ItineraryChoiceDialog";
import LogoutButton from "@/components/button/auth/LogoutButton";
import BackIconButton from "@/components/button/navigation/BackIconButton";

import { MdPersonOutline } from "react-icons/md";

interface PageLayoutProps {
  title: string;
  children: ReactNode;
}

export default function MobileLayout({
  title,
  children,
}: PageLayoutProps): React.ReactElement {
  return (
    <div className="h-screen w-full">
      <nav className="flex items-center justify-between w-full h-15 px-4 py-2 bg-white border-b fixed top-0 left-0 z-50 ">
        <BackIconButton />

        <div className="flex-grow flex items-center justify-center mr-12">
          <div className="font-bold text-lg">{title}</div>
        </div>
      </nav>

      <div className="pt-[60px]">{children}</div>
    </div>
  );
}
