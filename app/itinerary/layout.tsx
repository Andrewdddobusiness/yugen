"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebarItineraryActivityLeft } from "@/components/layout/sidebar/app/AppSidebarItineraryActivityLeft2";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { getSubscriptionDetails } from "@/actions/stripe/actions";

import { useUserStore } from "@/store/userStore";
import { useStripeSubscriptionStore, ISubscriptionDetails } from "@/store/stripeSubscriptionStore";
import { createClient } from "@/utils/supabase/client";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";

import { Button } from "@/components/ui/button";
import { Download, Share, Users } from "lucide-react";
import Loading from "@/components/loading/Loading";

const ShareExportDialog = dynamic(
  () => import("@/components/dialog/export/ShareExportDialog").then((mod) => mod.ShareExportDialog),
  { ssr: false }
);

export default function Layout({ children }: { children: React.ReactNode }) {
  const { itineraryId, destinationId } = useParams();
  const pathname = usePathname();
  
  const isBuilderPage = pathname.includes("/builder");
  const currentView = useItineraryLayoutStore((state) => state.currentView);
  const enableSharedDnd = isBuilderPage && currentView === "calendar";

  //**** STORES ****//
  const { setUser, setUserLoading, setProfileUrl, setIsProfileUrlLoading } = useUserStore();
  const { setSubscription, setIsSubscriptionLoading } = useStripeSubscriptionStore();
  
  // Remove useWishlist from here to prevent multiple instances

  //***** GET USER *****//
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) throw error;
      return user;
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    setUserLoading(isUserLoading);
  }, [isUserLoading, setUserLoading]);

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  //***** GET PROFILE URL *****//
  const { data: profileUrl } = useQuery({
    queryKey: ["profileUrl", user?.id],
    queryFn: async () => {
      const supabase = createClient();

      // First check if the file exists
      const { data: fileExists, error: listError } = await supabase.storage.from("avatars").list(user?.id);

      if (listError) {
        console.error("Error checking file existence:", listError);
        return null;
      }

      // If file exists (array has items and one is named "profile")
      if (fileExists && fileExists.some((file) => file.name === "profile")) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(user?.id + "/profile");
        return data.publicUrl;
      }

      // No profile picture exists
      return null;
    },
    enabled: !!user,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    setProfileUrl(profileUrl || "");
    setIsProfileUrlLoading(false);
  }, [profileUrl, setProfileUrl, setIsProfileUrlLoading]);

  //***** GET SUBSCRIPTION DETAILS *****//
  const { data: subscription } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: getSubscriptionDetails,
    enabled: !!user,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    setSubscription(subscription as ISubscriptionDetails);
    setIsSubscriptionLoading(false);
  }, [subscription, setSubscription, setIsSubscriptionLoading]);

	  const getBreadcrumbText = () => {
	    if (pathname.includes("/builder")) {
	      return "Builder";
	    } else if (pathname.includes("/overview")) {
	      return "Overview";
	    }
	    return "Builder"; // default fallback
	  };

  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    const slotCollision = pointerCollisions.find((collision) =>
      collision.id.toString().startsWith("slot-")
    );
    if (slotCollision) return [slotCollision];
    return closestCenter(args);
  };

  if (!itineraryId || !destinationId) {
    return <Loading />;
  }


  // For builder page, show simpler layout without sidebar
  // Commented out to show sidebar on builder page as well
  /*
  if (isBuilderPage) {
    return (
      <div className="flex flex-col h-screen">
        <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b border-stroke-200 bg-bg-0/80 backdrop-blur-xl p-2">
          <div className="flex items-center gap-2 flex-1">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/itineraries">Itineraries</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getBreadcrumbText()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="gap-2 transition-colors"
              >
                <Share className="size-4" />
                <span>Share</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem className="cursor-pointer">
                <Users className="size-4" />
                <span>Invite Collaborators</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => setExportDialogOpen(true)}>
                <Download className="size-4" />
                <span>Export</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
        <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} itineraryId={itineraryId as string} />
      </div>
    );
  }
  */

  const shell = (
    <>
      <AppSidebarItineraryActivityLeft
        useExternalDndContext={enableSharedDnd}
      />
      <main className="flex min-w-0 flex-1 flex-col w-full">
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b border-stroke-200 bg-bg-0/90 backdrop-blur-xl px-2">
          <div className="flex items-center gap-2 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/itineraries">Itineraries</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getBreadcrumbText()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="gap-2 transition-colors active:scale-95 active:bg-accent hover:bg-accent/80"
              >
                <Share className="size-4" />
                <span>Share</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem className="cursor-pointer">
                <Users className="size-4" />
                <span>Invite Collaborators</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setExportDialogOpen(true)}
              >
                <Download className="size-4" />
                <span>Export</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex-1 w-full">{children}</div>
      </main>
    </>
  );

  return (
    <>
      <SidebarProvider
        defaultOpen={false}
        style={
          {
            "--sidebar-width": "420px",
            "--sidebar-width-icon": "48px",
            "--sidebar-width-mobile": "320px",
          } as React.CSSProperties
        }
      >
        {enableSharedDnd ? (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
          >
            {shell}
          </DndContext>
        ) : (
          shell
        )}
    </SidebarProvider>
    <ShareExportDialog
      open={exportDialogOpen}
      onOpenChange={setExportDialogOpen}
      itineraryId={itineraryId as string}
      destinationId={destinationId as string}
    />
    </>
  );
}
