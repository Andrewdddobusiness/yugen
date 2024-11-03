"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

import HomeLayout from "@/components/layouts/homeLayout";

import { Button } from "@/components/ui/button";
import PopUpCreateItinerary from "@/components/popUp/popUpCreateItinerary";
import { Loader2, Plus } from "lucide-react";

export default function Home() {
  const supabase = createClient();
  const [user, setUser] = useState<any>();
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsUserLoading(true);
      try {
        const { auth } = supabase;
        const { data: user } = await auth.getUser();

        if (!user.user) {
          throw new Error("User not authenticated");
        }
        setUser(user.user);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsUserLoading(false);
      }
    };

    fetchUserData();
  }, [supabase]);

  return (
    <HomeLayout>
      {/* <PageLayout> */}
      <div className="pt-12 flex flex-col md:flex-row items-center px-8">
        <div className="md:w-1/2">
          <div className="text-center md:text-left">
            <div className="text-4xl sm:text-6xl font-bold mb-4">Planning Vacations S*ck!</div>
            <div className="text-lg mb-4">
              Build, personalize, and optimize your itineraries with our AI trip planner.
            </div>
            <div className="mb-4">
              {isUserLoading ? (
                <Button size="lg" className="text-sm rounded-lg w-32" disabled>
                  <Loader2 className="h-4 w-16 animate-spin" />
                </Button>
              ) : user ? (
                <PopUpCreateItinerary>
                  <Button className="w-full">
                    <Plus className="size-3.5 mr-1" />
                    <span>Create new Itinerary</span>
                  </Button>
                </PopUpCreateItinerary>
              ) : (
                <Link href="/signUp">
                  <Button size="lg" className="text-sm rounded-lg w-32">
                    Get Started
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="md:w-1/2 mt-8 flex justify-center">
          <div>
            <Image
              src="/Globalization.png"
              alt="globalization"
              width={500}
              height={500}
              className="max-w-full h-auto"
            />
          </div>
        </div>
      </div>
      {/* </PageLayout> */}
    </HomeLayout>
  );
}
