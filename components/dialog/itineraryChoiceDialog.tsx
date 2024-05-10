import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import React, { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
}

export default function ItineraryChoiceDialog({
  children,
}: PageLayoutProps): React.ReactElement {
  return (
    <Dialog>
      <DialogTrigger className="flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 transition-colors duration-300 border border-transparent hover:border-zinc-400 group-hover:border-zinc-500 cursor-pointer rounded-lg">
        {children}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>How should we build a Travel Itinerary?</DialogTitle>
          <DialogDescription>
            <div className="text-sm">
              We recommend our latest AI Travel Itinerary Generator.
            </div>
            <div className="grid grid-cols-5 gap-4 mt-4">
              <Link href="/newTrip" legacyBehavior>
                <Card className="pt-4 col-span-2 first-letter:flex items-center justify-center bg-white hover:bg-zinc-200 transition-colors duration-300 border border-black hover:border-zinc-400 group-hover:border-zinc-500 cursor-pointer rounded-lg">
                  <CardContent className="flex flex-col items-center justify-center text-center h-full">
                    <div className="flex items-center justify-center h-full">
                      <Image
                        src="/magic.png"
                        alt="Image"
                        width="500"
                        height="500"
                        className="h-24 w-24 object-cover dark:brightness-[0.2] dark:zincscale"
                      />
                    </div>
                    <div className="flex text-sm justify-center items-center text-center font-bold">
                      AI Magic Itinerary
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <div className="flex items-center justify-center text-center">
                or
              </div>

              <Link href="/itinerary/1/overview" legacyBehavior>
                <Card className="pt-4 col-span-2 first-letter:flex items-center justify-center bg-white hover:bg-zinc-200 transition-colors duration-300 border border-black hover:border-zinc-400 group-hover:border-zinc-500 cursor-pointer rounded-lg">
                  <CardContent className="flex flex-col items-center justify-center text-center h-full">
                    <div className="flex items-center justify-center h-full">
                      <Image
                        src="/box.png"
                        alt="Image"
                        width="500"
                        height="500"
                        className="h-24 w-24 object-cover dark:brightness-[0.2] dark:zincscale"
                      />
                    </div>
                    <div className="flex text-sm justify-center items-center text-center font-bold">
                      Itinerary Builder
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
